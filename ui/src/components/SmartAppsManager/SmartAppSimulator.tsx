import React, { useMemo, useState } from 'react';

/**
 * SmartAppSimulator
 * SMART App Launch 2.x simulation helper. Builds an authorization URL with PKCE, state, and nonce.
 * Tries optional backend /api/simulate-launch; falls back to local mock tokens.
 */

type SimResult = {
  authorizeUrl: string;
  simulatedIdToken?: string;
  simulatedAccessToken?: string;
  note?: string;
};

type LaunchContext = 'patient' | 'user';

const defaultScopes = 'openid profile launch patient/*.read';

// base64url encode utility
function base64url(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(input: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

function randomString(len = 43) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  // base64url of random bytes; trim to len
  return base64url(arr).slice(0, len);
}

export const SmartAppSimulator: React.FC = () => {
  const [clientId, setClientId] = useState('');
  const [redirectUri, setRedirectUri] = useState('http://localhost:5173/callback');
  const [issuer, setIssuer] = useState(''); // Authorization server issuer (OIDC)
  const [authorizeEndpoint, setAuthorizeEndpoint] = useState(''); // optional override
  const [fhirBase, setFhirBase] = useState(''); // SMART launch context base URL
  const [patient, setPatient] = useState('');
  const [scopes, setScopes] = useState(defaultScopes);
  const [launchContext, setLaunchContext] = useState<LaunchContext>('patient');
  const [aud, setAud] = useState(''); // audience parameter for EHR FHIR base
  const [usePkce, setUsePkce] = useState(true);

  const [codeVerifier, setCodeVerifier] = useState<string>('');
  const [codeChallenge, setCodeChallenge] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [nonce, setNonce] = useState<string>('');

  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    if (!clientId) return 'Client ID is required';
    if (!redirectUri) return 'Redirect URI is required';
    if (!issuer && !authorizeEndpoint) return 'Issuer or explicit authorize endpoint is required';
    if (!fhirBase) return 'FHIR Base URL is required';
    if (!aud) return 'Audience (aud) should be the FHIR Base URL for EHR context';
    if (launchContext === 'patient' && !patient) return 'Patient context requires a patient ID';
    return null;
  };

  const effectiveAuthorizeEndpoint = useMemo(() => {
    if (authorizeEndpoint) return authorizeEndpoint.trim();
    // Common pattern: OIDC authorize under issuer .well-known or /authorize
    // We can’t reliably fetch discovery here without CORS; provide a reasonable default.
    return issuer.replace(/\/$/, '') + '/authorize';
  }, [authorizeEndpoint, issuer]);

  const buildAuthUrl = async () => {
    const params = new URLSearchParams();
    params.set('response_type', 'code');
    params.set('client_id', clientId);
    params.set('redirect_uri', redirectUri);
    params.set('scope', scopes);
    params.set('aud', aud);
    if (launchContext === 'patient') params.set('launch', patient);

    const st = state || randomString(16);
    const nn = nonce || randomString(16);
    params.set('state', st);
    params.set('nonce', nn);

    let cv = codeVerifier;
    let cc = codeChallenge;
    if (usePkce) {
      cv = cv || randomString(64);
      cc = base64url(await sha256(cv));
      params.set('code_challenge', cc);
      params.set('code_challenge_method', 'S256');
    }

    setState(st);
    setNonce(nn);
    setCodeVerifier(cv);
    setCodeChallenge(cc);

    return effectiveAuthorizeEndpoint.replace(/\/$/, '') + '?' + params.toString();
  };

  const generateMockToken = () => {
    // Minimal base64url pseudo-JWT (for display only)
    const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'none', typ: 'JWT' })));
    const payloadObj: any = {
      iss: issuer || 'https://auth.example',
      aud: clientId || 'spa-client',
      exp: Math.floor(Date.now() / 1000) + 3600,
      fhirBase,
      scope: scopes,
      launch: launchContext === 'patient' ? { patient } : { user: 'mock-user' },
      nonce,
    };
    const payload = base64url(new TextEncoder().encode(JSON.stringify(payloadObj)));
    return `${header}.${payload}.`;
  };

  const onSimulate = async () => {
    setError(null);
    setResult(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    try {
      const authorizeUrl = await buildAuthUrl();

      // Try backend simulation if available
      try {
        const resp = await fetch('/api/simulate-launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            redirectUri,
            issuer,
            authorizeEndpoint: effectiveAuthorizeEndpoint,
            fhirBase,
            aud,
            patient,
            scopes,
            launchContext,
            state,
            nonce,
            codeVerifier,
            codeChallenge,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setResult({
            authorizeUrl,
            simulatedAccessToken: data.access_token,
            simulatedIdToken: data.id_token,
            note: 'From backend simulation',
          });
          setLoading(false);
          return;
        }
      } catch {
        // ignore and fallback
      }

      // Fallback mock
      const mockId = generateMockToken();
      const mockAccess = `mock-access-${randomString(24)}`;
      setResult({ authorizeUrl, simulatedIdToken: mockId, simulatedAccessToken: mockAccess, note: 'Local mock (no backend)' });
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = () => {
    setClientId('demo-client');
    setRedirectUri('http://localhost:5173/callback');
    setIssuer('https://auth.example');
    setAuthorizeEndpoint('');
    setFhirBase('https://fhir.example');
    setAud('https://fhir.example');
    setScopes(defaultScopes);
    setLaunchContext('patient');
    setPatient('example-patient-id');
  };

  const reset = () => {
    setClientId('');
    setRedirectUri('http://localhost:5173/callback');
    setIssuer('');
    setAuthorizeEndpoint('');
    setFhirBase('');
    setAud('');
    setScopes(defaultScopes);
    setLaunchContext('patient');
    setPatient('');
    setCodeVerifier('');
    setCodeChallenge('');
    setState('');
    setNonce('');
    setResult(null);
    setError(null);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 6, maxWidth: 1000 }}>
      <h3>SMART Launch Simulator</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label>
          <div>Client ID</div>
          <input aria-label="Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label>
          <div>Redirect URI</div>
          <input aria-label="Redirect URI" value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label>
          <div>Issuer (OIDC)</div>
          <input aria-label="Issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="https://auth.example" style={{ width: '100%' }} />
        </label>
        <label>
          <div>Authorize Endpoint (override)</div>
          <input aria-label="Authorize Endpoint" value={authorizeEndpoint} onChange={(e) => setAuthorizeEndpoint(e.target.value)} placeholder="https://auth.example/authorize" style={{ width: '100%' }} />
        </label>
        <label>
          <div>FHIR Base URL</div>
          <input aria-label="FHIR Base URL" value={fhirBase} onChange={(e) => setFhirBase(e.target.value)} placeholder="https://fhir.example" style={{ width: '100%' }} />
        </label>
        <label>
          <div>aud (FHIR base)</div>
          <input aria-label="audience" value={aud} onChange={(e) => setAud(e.target.value)} placeholder="https://fhir.example" style={{ width: '100%' }} />
        </label>
        <label>
          <div>Scopes</div>
          <input aria-label="Scopes" value={scopes} onChange={(e) => setScopes(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label>
          <div>Launch context</div>
          <select aria-label="Launch Context" value={launchContext} onChange={(e) => setLaunchContext(e.target.value as LaunchContext)} style={{ width: '100%' }}>
            <option value="patient">patient</option>
            <option value="user">user</option>
          </select>
        </label>
        <label>
          <div>Patient ID (if patient)</div>
          <input aria-label="Patient ID" value={patient} onChange={(e) => setPatient(e.target.value)} disabled={launchContext !== 'patient'} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={usePkce} onChange={() => setUsePkce((v) => !v)} /> Use PKCE
        </label>
      </div>

      {error && <div role="alert" style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={onSimulate} disabled={loading}>
          {loading ? 'Simulating...' : 'Simulate Launch'}
        </button>
        <button onClick={loadDemo}>Load Demo</button>
        <button onClick={reset}>Reset</button>
      </div>

      {!!state && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <strong>State</strong>
            <div style={{ wordBreak: 'break-all' }}>{state} <button onClick={() => copy(state)}>Copy</button></div>
          </div>
          <div>
            <strong>Nonce</strong>
            <div style={{ wordBreak: 'break-all' }}>{nonce} <button onClick={() => copy(nonce)}>Copy</button></div>
          </div>
          {usePkce && (
            <>
              <div>
                <strong>Code Verifier</strong>
                <div style={{ wordBreak: 'break-all' }}>{codeVerifier} <button onClick={() => copy(codeVerifier)}>Copy</button></div>
              </div>
              <div>
                <strong>Code Challenge</strong>
                <div style={{ wordBreak: 'break-all' }}>{codeChallenge} <button onClick={() => copy(codeChallenge)}>Copy</button></div>
              </div>
            </>
          )}
        </div>
      )}

      {result && (
        <div style={{ background: '#fafafa', padding: 12, borderRadius: 4 }}>
          <div>
            <strong>Authorize URL</strong>
            <div style={{ wordBreak: 'break-all' }}>
              <a href={result.authorizeUrl} target="_blank" rel="noreferrer">
                {result.authorizeUrl}
              </a>
              <button onClick={() => copy(result.authorizeUrl)} style={{ marginLeft: 8 }}>Copy</button>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Simulated ID Token</strong>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{result.simulatedIdToken}</pre>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Simulated Access Token</strong>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{result.simulatedAccessToken}</pre>
          </div>

          {result.note && <div style={{ marginTop: 8, color: '#666' }}>{result.note}</div>}
        </div>
      )}

      <details style={{ marginTop: 12 }}>
        <summary>Help</summary>
        <ul>
          <li>aud should match the FHIR base URL for the EHR server.</li>
          <li>Include launch and patient context as required by SMART.</li>
          <li>Use PKCE for public clients.</li>
        </ul>
      </details>
    </div>
  );
};

export default SmartAppSimulator;
