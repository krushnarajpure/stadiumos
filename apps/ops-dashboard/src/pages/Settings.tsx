import React, { useEffect, useState } from 'react';
import { dashboardService } from '../services/dashboard';
import { parseApiError } from '../utils/apiError';

interface Preference {
  channel: string;
  is_enabled: boolean;
}

export const Settings: React.FC = () => {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardService
      .getNotificationPreferences()
      .then((prefs) => setPreferences(Array.isArray(prefs) ? prefs : []))
      .catch(() => setPreferences([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleChannel = (channel: string) => {
    setPreferences((prev) =>
      prev.map((p) => (p.channel === channel ? { ...p, is_enabled: !p.is_enabled } : p))
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await dashboardService.updateNotificationPreferences({ preferences });
      setMessage('Notification preferences saved.');
    } catch (err: unknown) {
      setError(parseApiError(err, 'Failed to save preferences.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#94A3B8] text-sm">Loading settings...</div>;
  }

  return (
    <div className="p-8 text-[#F8FAFC] space-y-8 font-sans selection:bg-[#00A8FF]/20">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-display text-white">System Settings</h1>
        <p className="text-[#94A3B8] text-xs mt-1">Notification preferences from /api/v1/notifications/preferences</p>
      </div>

      {message && <div className="p-3 bg-green-950/20 border border-green-900/50 text-green-400 text-xs rounded-xl">{message}</div>}
      {error && <div className="p-3 bg-red-950/20 border border-red-900/50 text-red-400 text-xs rounded-xl">{error}</div>}

      <div className="max-w-3xl">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Alert Notification Channels</h3>
          <div className="h-px bg-white/5" />

          {preferences.length > 0 ? (
            preferences.map((pref) => (
              <div key={pref.channel} className="flex justify-between items-center py-2">
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">{pref.channel}</div>
                  <p className="text-[11px] text-gray-400 mt-1">Receive alerts via {pref.channel.toLowerCase()}.</p>
                </div>
                <input
                  type="checkbox"
                  checked={pref.is_enabled}
                  onChange={() => toggleChannel(pref.channel)}
                  className="w-4 h-4 rounded bg-[#111A33] border-white/10 text-[#00A8FF] focus:ring-0 outline-none"
                />
              </div>
            ))
          ) : (
            <p className="text-[#94A3B8] text-xs">No notification preferences configured yet.</p>
          )}

          <button
            onClick={save}
            disabled={saving || preferences.length === 0}
            className="mt-4 bg-[#00A8FF] hover:bg-[#0096e5] disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-widest"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default Settings;
