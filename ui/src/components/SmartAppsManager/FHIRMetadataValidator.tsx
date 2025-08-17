import React, { useState } from 'react';

/**
 * FHIRMetadataValidator
 * Fetches /metadata and optionally .well-known/smart-configuration, runs SMART/OAuth checks.
 */

type Check = { id: string; ok: boolean; message: string };

type ValidationResult = {
  ok: boolean;
  checks: Check[];
  raw?: any;
  smartConfig?: any;
};

async function fetchJson(url: string) {
  const resp = await fetch(url, { headers: { Accept: 'application/fhir+json, application/json' } });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
  return resp.json();
}

export const FHIRMetadataValidator: React.FC = () => {
  const [base, setBase] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setResult(null);
    if (!base) return setError('FHIR base URL required');
    setLoading(true);
    try {
      const baseUrl = base.replace(/\/$/, '');
      const metaUrl = baseUrl + '/metadata';
      const json = await fetchJson(metaUrl);

      const checks: Check[] = [];
      checks.push({ id: 'resourceType', ok: json.resourceType === 'CapabilityStatement', message: `resourceType=${json.resourceType}` });

      const rest = Array.isArray(json.rest) ? json.rest : [];
      const restServer = rest.find((r: any) => r.mode === 'server') || rest[0];
      const security = restServer?.security;
      checks.push({ id: 'security', ok: !!security, message: security ? 'security present' : 'security missing' });

      // SMART OAuth URIs extension per spec https://www.hl7.org/fhir/smart-app-launch/conformance.html
      let oauthUrisExt: any | undefined;
      if (security?.extension) {
        oauthUrisExt = security.extension.find((ext: any) =>
          typeof ext?.url === 'string' && /smart-configuration|oauth-uris/i.test(ext.url)
        );
      }
      checks.push({ id: 'oauth-uris-ext', ok: !!oauthUrisExt, message: oauthUrisExt ? `extension url=${oauthUrisExt.url}` : 'oauth-uris extension not found' });

      const endpoints: Record<string, string> = {};
      if (oauthUrisExt?.extension && Array.isArray(oauthUrisExt.extension)) {
        for (const sub of oauthUrisExt.extension) {
          if (sub.url && (sub.valueUri || sub.valueUrl)) {
            endpoints[sub.url] = sub.valueUri || sub.valueUrl;
          }
        }
      }

      const hasAuthorize = !!Object.keys(endpoints).find((k) => /authorize/i.test(k));
      const hasToken = !!Object.keys(endpoints).find((k) => /token/i.test(k));
      checks.push({ id: 'authorize-endpoint', ok: hasAuthorize, message: hasAuthorize ? `found (${Object.keys(endpoints).filter((k) => /authorize/i.test(k)).map((k) => endpoints[k]).join(', ')})` : 'authorize endpoint missing' });
      checks.push({ id: 'token-endpoint', ok: hasToken, message: hasToken ? `found (${Object.keys(endpoints).filter((k) => /token/i.test(k)).map((k) => endpoints[k]).join(', ')})` : 'token endpoint missing' });

      // Try .well-known/smart-configuration if same origin; may fail due to CORS
      let smartConfig: any | undefined;
      try {
        const smartWellKnown = baseUrl + '/.well-known/smart-configuration';
        smartConfig = await fetchJson(smartWellKnown);
        checks.push({ id: 'smart-well-known', ok: true, message: 'smart-configuration fetched' });
        if (smartConfig.authorization_endpoint) {
          checks.push({ id: 'smart-authorize', ok: true, message: `authorization_endpoint=${smartConfig.authorization_endpoint}` });
        }
        if (smartConfig.token_endpoint) {
          checks.push({ id: 'smart-token', ok: true, message: `token_endpoint=${smartConfig.token_endpoint}` });
        }
        if (Array.isArray(smartConfig.grant_types_supported)) {
          const supportsAuthCode = smartConfig.grant_types_supported.includes('authorization_code');
          checks.push({ id: 'grant-types', ok: supportsAuthCode, message: supportsAuthCode ? 'authorization_code supported' : 'authorization_code not listed' });
        }
      } catch (e: any) {
        checks.push({ id: 'smart-well-known', ok: false, message: `smart-configuration not available (${e?.message || 'fetch failed'})` });
      }

      const ok = checks.every((c) => c.ok);
      setResult({ ok, checks, raw: json, smartConfig });
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6, maxWidth: 1000 }}>
      <h3>FHIR Metadata Validator</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://fhirserver.example" style={{ width: '70%' }} />
        <button onClick={run} disabled={loading}>
          {loading ? 'Checking...' : 'Fetch /metadata'}
        </button>
      </div>
      {error && <div role="alert" style={{ color: 'red' }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 'bold' }}>Summary: {result.ok ? 'Looks good' : 'Issues found'}</div>
          <ul>
            {result.checks.map((c) => (
              <li key={c.id} style={{ color: c.ok ? 'green' : 'crimson' }}>
                {c.id}: {c.message}
              </li>
            ))}
          </ul>
          <details>
            <summary>Raw capability statement</summary>
            <pre style={{ maxHeight: 400, overflow: 'auto' }}>{JSON.stringify(result.raw, null, 2)}</pre>
          </details>
          {result.smartConfig && (
            <details>
              <summary>SMART configuration</summary>
              <pre style={{ maxHeight: 400, overflow: 'auto' }}>{JSON.stringify(result.smartConfig, null, 2)}</pre>
            </details>
          )}
        </div>
      )}

      <div style={{ marginTop: 8, color: '#666' }}>
        Tip: If fetching fails in browser, the server may not allow CORS for your origin. Try a proxy or server-side check.
      </div>
    </div>
  );
};

export default FHIRMetadataValidator;
