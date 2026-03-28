'use client';

import { useEffect, useState } from 'react';

type Policy = {
  lateGraceMinutes: number;
  halfDayThresholdMinutes: number;
  absentThresholdMinutes: number;
  lateMarkAfterMinutes: number;
  overtimeEnabled: boolean;
  overtimeThresholdMinutes: number;
  overtimeMultiplier: number;
  maxOvertimeHoursPerDay: number;
  maxOvertimeHoursPerMonth: number;
  standardWorkingHoursPerDay: number;
  weeklyOffDays: string[];
  lateDeductionEnabled: boolean;
  lateDeductionPerIncident: number;
  autoMarkAbsent: boolean;
  autoMarkAbsentAfterMidnight: boolean;
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AttendancePolicyPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch('/api/attendance/policy')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setPolicy(d.policy); })
      .catch(() => showToast('Failed to load policy', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: keyof Policy, value: number | boolean | string[]) => {
    setPolicy((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const toggleDay = (day: string) => {
    if (!policy) return;
    const days = policy.weeklyOffDays.includes(day)
      ? policy.weeklyOffDays.filter((d) => d !== day)
      : [...policy.weeklyOffDays, day];
    handleChange('weeklyOffDays', days);
  };

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      const res = await fetch('/api/attendance/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      });
      const data = await res.json();
      if (!res.ok) showToast(data.error || 'Failed to save', 'error');
      else showToast('Attendance policy saved successfully!', 'success');
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!policy) return <div className="p-8 text-red-500">Failed to load policy.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Attendance Policy</h1>
          <p className="text-gray-500 text-sm mt-1">Configure overtime, late arrival, and absence rules for your organization</p>
        </div>

        <div className="space-y-6">
          {/* Working Hours */}
          <Section title="Working Hours">
            <Row label="Standard Working Hours / Day">
              <NumberInput value={policy.standardWorkingHoursPerDay} min={4} max={12} step={0.5}
                onChange={(v) => handleChange('standardWorkingHoursPerDay', v)} suffix="hrs" />
            </Row>
            <Row label="Weekly Off Days">
              <div className="flex gap-2 flex-wrap">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      policy.weeklyOffDays.includes(day)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </Row>
          </Section>

          {/* Late Arrival */}
          <Section title="Late Arrival Rules">
            <Row label="Grace Period">
              <NumberInput value={policy.lateGraceMinutes} min={0} max={60}
                onChange={(v) => handleChange('lateGraceMinutes', v)} suffix="min" />
            </Row>
            <Row label="Mark Late After">
              <NumberInput value={policy.lateMarkAfterMinutes} min={0} max={120}
                onChange={(v) => handleChange('lateMarkAfterMinutes', v)} suffix="min after shift" />
            </Row>
            <Row label="Half Day Threshold (absent < X min present)">
              <NumberInput value={policy.halfDayThresholdMinutes} min={60} max={300}
                onChange={(v) => handleChange('halfDayThresholdMinutes', v)} suffix="min" />
            </Row>
            <Row label="Absent Threshold">
              <NumberInput value={policy.absentThresholdMinutes} min={120} max={480}
                onChange={(v) => handleChange('absentThresholdMinutes', v)} suffix="min" />
            </Row>
            <Row label="Late Deduction">
              <Toggle value={policy.lateDeductionEnabled} onChange={(v) => handleChange('lateDeductionEnabled', v)} />
            </Row>
            {policy.lateDeductionEnabled && (
              <Row label="Deduction Per Incident">
                <NumberInput value={policy.lateDeductionPerIncident} min={0} max={500}
                  onChange={(v) => handleChange('lateDeductionPerIncident', v)} suffix="₹" />
              </Row>
            )}
          </Section>

          {/* Overtime */}
          <Section title="Overtime Rules">
            <Row label="Enable Overtime">
              <Toggle value={policy.overtimeEnabled} onChange={(v) => handleChange('overtimeEnabled', v)} />
            </Row>
            {policy.overtimeEnabled && (
              <>
                <Row label="Overtime Threshold">
                  <NumberInput value={policy.overtimeThresholdMinutes} min={0} max={120}
                    onChange={(v) => handleChange('overtimeThresholdMinutes', v)} suffix="min after shift end" />
                </Row>
                <Row label="Overtime Multiplier">
                  <NumberInput value={policy.overtimeMultiplier} min={1} max={5} step={0.25}
                    onChange={(v) => handleChange('overtimeMultiplier', v)} suffix="x" />
                </Row>
                <Row label="Max OT / Day">
                  <NumberInput value={policy.maxOvertimeHoursPerDay} min={0} max={12}
                    onChange={(v) => handleChange('maxOvertimeHoursPerDay', v)} suffix="hrs" />
                </Row>
                <Row label="Max OT / Month">
                  <NumberInput value={policy.maxOvertimeHoursPerMonth} min={0} max={100}
                    onChange={(v) => handleChange('maxOvertimeHoursPerMonth', v)} suffix="hrs" />
                </Row>
              </>
            )}
          </Section>

          {/* Auto Absent */}
          <Section title="Absence Rules">
            <Row label="Auto Mark Absent (no punch-in)">
              <Toggle value={policy.autoMarkAbsent} onChange={(v) => handleChange('autoMarkAbsent', v)} />
            </Row>
            <Row label="Auto Mark after Midnight">
              <Toggle value={policy.autoMarkAbsentAfterMidnight} onChange={(v) => handleChange('autoMarkAbsentAfterMidnight', v)} />
            </Row>
          </Section>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 text-white rounded-xl px-6 py-3 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Attendance Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-gray-700">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function NumberInput({ value, min, max, step = 1, onChange, suffix }: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {suffix && <span className="text-xs text-gray-500 whitespace-nowrap">{suffix}</span>}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
        value ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
