'use client';
import { useEffect, useState } from 'react';

const CURRENT_YEAR = new Date().getFullYear();

export default function AdminTrackerPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [weekNumber, setWeekNumber] = useState(getCurrentWeek());
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ isGoodWeek: false, adminNotes: '', impact: '', issues: '' });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => { fetchData(); }, [year, weekNumber]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/tracker?year=${year}&week=${weekNumber}`);
    const d = await res.json();
    if (d.success) setRecords(d.data || []);
    setLoading(false);
  };

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleReview = async (trackerId: string) => {
    const res = await fetch('/api/tracker', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId, ...reviewForm }),
    });
    const d = await res.json();
    if (d.success) {
      showToast('Review submitted');
      setReviewing(null);
      fetchData();
    } else {
      showToast(d.error || 'Failed', false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-white text-sm ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>{toast.msg}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Tracker Review</h1>
        <p className="text-sm text-gray-500 mb-4">Review employee weekly performance — mark good weeks</p>

        <div className="flex gap-3">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 border rounded-lg">
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={weekNumber} onChange={e => setWeekNumber(Number(e.target.value))} className="px-3 py-2 border rounded-lg">
            {Array.from({ length: 44 }, (_, i) => i + 1).map(w => <option key={w} value={w}>Week {w}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed rounded-xl text-gray-400">No entries for this week</div>
      ) : (
        <div className="space-y-4">
          {records.map(rec => (
            <div key={rec._id} className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-semibold text-gray-900">{rec.employeeId?.fullName || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{rec.employeeId?.email}</div>
                </div>
                <div className={`text-xs px-3 py-1 rounded-full ${
                  rec.status === 'reviewed' ? 'bg-green-100 text-green-700' :
                  rec.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{rec.status}</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs text-gray-700 mb-4">
                <div><span className="font-semibold">G1:</span> {rec.g1?.actual || 0}/{rec.g1?.target || 0}</div>
                <div><span className="font-semibold">G2:</span> {rec.g2?.actual || 0}/{rec.g2?.target || 0}</div>
                <div><span className="font-semibold">G3:</span> {rec.g3?.actual || 0}/{rec.g3?.target || 0}</div>
                <div><span className="font-semibold">G4:</span> {rec.g4?.actual || 0}/{rec.g4?.target || 0}</div>
                <div><span className="font-semibold">GL Tours:</span> {rec.glTours?.actual || 0}/{rec.glTours?.target || 0}</div>
              </div>

              <div className="text-xs text-gray-600 mb-4">
                <div>Self Rating: {rec.selfRating || 0}/5</div>
                {rec.selfNotes && <div className="mt-1 italic">"{rec.selfNotes}"</div>}
              </div>

              {rec.status === 'reviewed' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs">
                  <div className="font-semibold text-green-800 mb-1">Your Review:</div>
                  <div className="text-green-700">
                    Good Week: {rec.isGoodWeek ? '✅ Yes' : '❌ No'}<br />
                    {rec.adminNotes && <div>Notes: {rec.adminNotes}</div>}
                    {rec.impact && <div>Impact: {rec.impact}</div>}
                    {rec.issues && <div>Issues: {rec.issues}</div>}
                  </div>
                </div>
              )}

              {reviewing === rec._id ? (
                <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="font-semibold text-gray-800 mb-3">Submit Review</div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={reviewForm.isGoodWeek} onChange={e => setReviewForm(f => ({ ...f, isGoodWeek: e.target.checked }))} className="w-4 h-4" />
                      Mark as Good Week
                    </label>
                    <input type="text" value={reviewForm.adminNotes} onChange={e => setReviewForm(f => ({ ...f, adminNotes: e.target.value }))} placeholder="Admin notes" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" value={reviewForm.impact} onChange={e => setReviewForm(f => ({ ...f, impact: e.target.value }))} placeholder="Impact" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" value={reviewForm.issues} onChange={e => setReviewForm(f => ({ ...f, issues: e.target.value }))} placeholder="Issues" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => handleReview(rec._id)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Submit Review</button>
                      <button onClick={() => setReviewing(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                    </div>
                  </div>
                </div>
              ) : rec.status !== 'reviewed' && (
                <button onClick={() => { setReviewing(rec._id); setReviewForm({ isGoodWeek: false, adminNotes: '', impact: '', issues: '' }); }} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Review This Week</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}
