'use client';

import { useEffect, useState } from 'react';

export default function CrmIntegrationSettings() {
  const [keyInput, setKeyInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/integrations/crm/key', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok) {
          setConnected(!!data.connected);
          setMaskedKey(data.maskedKey || null);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/integrations/crm/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      setConnected(true);
      setMaskedKey(data.maskedKey || null);
      setKeyInput('');
      setMsg({ ok: true, text: 'CRM integration connected.' });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div style={card} className="p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">CRM Integration</h2>
        <p className="text-xs text-gray-700">
          Paste the Integration Key from CRM once to connect attendance with live CRM metrics.
        </p>
      </div>

      <div className="text-xs text-gray-700">
        Status:{' '}
        <span className={connected ? 'text-green-700' : 'text-red-600'}>
          {connected ? 'Connected' : 'Not connected'}
        </span>
        {maskedKey && (
          <span className="ml-2 text-gray-500">({maskedKey})</span>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-700 mb-1.5">Integration Key</label>
        <input
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder={loading ? 'Loading...' : 'Paste CRM integration key'}
          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
          disabled={loading}
        />
      </div>

      <button
        onClick={save}
        disabled={saving || loading || !keyInput.trim()}
        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: '#f97316' }}
      >
        {saving ? 'Connecting...' : 'Connect to CRM'}
      </button>
      {msg && <div className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</div>}
    </div>
  );
}
