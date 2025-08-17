import React, { useEffect, useMemo, useState } from 'react';

/**
 * PermissionMatrix
 * Simple scope management UI for SMART scopes used by an app registration.
 * Stores a string[] of scopes; backend should translate to policies.
 */

type Props = {
  appId?: string;
  initialScopes?: string[];
  onSave?: (scopes: string[]) => void;
};

const DEFAULT_SCOPES = [
  'openid',
  'profile',
  'offline_access',
  'launch',
  'patient/*.read',
];

const SUGGESTED_RESOURCES = [
  'All',
  'AllergyIntolerance',
  'Condition',
  'DiagnosticReport',
  'Encounter',
  'Immunization',
  'MedicationRequest',
  'Observation',
  'Patient',
  'Procedure',
];

function normalizeScope(s: string) {
  return s.trim().replace(/\s+/g, ' ');
}

function isValidScope(scope: string) {
  // Minimal SMART scope syntax validation
  // Examples: patient/Observation.read, user/*.write, launch/patient
  if (!scope) return false;
  if (['openid', 'profile', 'offline_access', 'launch'].includes(scope)) return true;
  const re = /^(patient|user|system)\/(\*|[A-Za-z]+)\.(read|write|\*|read\+write)$/;
  return re.test(scope);
}

export const PermissionMatrix: React.FC<Props> = ({ appId, initialScopes = [], onSave }) => {
  const [scopes, setScopes] = useState<string[]>(initialScopes.length ? initialScopes : DEFAULT_SCOPES);
  const [customScope, setCustomScope] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialScopes.length) setScopes(Array.from(new Set(initialScopes.map(normalizeScope))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScopes.join('|')]);

  const invalidScopes = useMemo(() => scopes.filter((s) => !isValidScope(s)), [scopes]);

  const addCustomScope = () => {
    const s = normalizeScope(customScope);
    if (!s) return;
    if (!isValidScope(s)) {
      setStatus(`Invalid scope syntax: ${s}`);
      return;
    }
    setScopes((prev) => Array.from(new Set([...prev, s])));
    setCustomScope('');
    setStatus(null);
  };

  const addSuggested = (prefix: 'patient' | 'user' | 'system', resource: string, access: 'read' | 'write' | 'read+write') => {
    const res = resource === 'All' ? '*' : resource;
    const scope = `${prefix}/${res}.${access}`;
    setScopes((prev) => Array.from(new Set([...prev, scope])));
  };

  const removeScope = (scopeToRemove: string) => setScopes((s) => s.filter((x) => x !== scopeToRemove));

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const uniqueScopes = Array.from(new Set(scopes.map(normalizeScope)));
      if (appId) {
        const resp = await fetch(`/api/apps/${encodeURIComponent(appId)}/permissions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scopes: uniqueScopes }),
        });
        if (!resp.ok) throw new Error(`Save failed: ${resp.status}`);
      }
      setStatus('Saved');
      onSave?.(Array.from(new Set(scopes)));
    } catch (err: any) {
      setStatus(String(err?.message || err));
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  return (
    <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6, maxWidth: 1000 }}>
      <h3>Permission Matrix</h3>

      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <div>
          <strong>Current Scopes</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {scopes.map((s) => (
              <div key={s} style={{ background: '#f5f5f5', padding: '6px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace' }}>{s}</span>
                <button onClick={() => removeScope(s)} aria-label={`Remove ${s}`}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <strong>Add Scope</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <input
              value={customScope}
              onChange={(e) => setCustomScope(e.target.value)}
              placeholder="e.g. patient/Observation.read"
              style={{ flex: 1, minWidth: 260 }}
            />
            <button onClick={addCustomScope}>Add</button>
          </div>
          {status && <div style={{ marginTop: 6, color: status.startsWith('Invalid') ? 'crimson' : '#333' }}>{status}</div>}
        </div>

        <details>
          <summary>Quick Add</summary>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            {(['patient', 'user'] as const).map((who) => (
              <div key={who} style={{ border: '1px solid #f0f0f0', padding: 8, borderRadius: 4 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{who}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SUGGESTED_RESOURCES.map((res) => (
                    <div key={`${who}-${res}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontFamily: 'monospace' }}>{res}</span>
                      <button onClick={() => addSuggested(who, res, 'read')}>.read</button>
                      <button onClick={() => addSuggested(who, res, 'write')}>.write</button>
                      <button onClick={() => addSuggested(who, res, 'read+write')}>.read+write</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      <div>
        <button onClick={save} disabled={saving || invalidScopes.length > 0}>
          {saving ? 'Saving...' : 'Save Permissions'}
        </button>
        {invalidScopes.length > 0 && (
          <span style={{ marginLeft: 12, color: 'crimson' }}>Invalid scopes: {invalidScopes.join(', ')}</span>
        )}
      </div>

      <details style={{ marginTop: 12 }}>
        <summary>Help</summary>
        <div style={{ padding: 8 }}>
          <p>Use SMART scopes like patient/Observation.read, user/*.write, offline_access. The backend should enforce policies.</p>
          <p>For refresh tokens include offline_access. For patient context, prefer patient/Resource.access scopes.</p>
        </div>
      </details>
    </div>
  );
};

export default PermissionMatrix;
