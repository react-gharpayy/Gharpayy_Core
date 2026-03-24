'use client';
import { useEffect, useState, useRef } from 'react';
import { Camera, CheckCircle, AlertCircle, User } from 'lucide-react';
import EmployeeNav from '@/components/employee-nav';

function fmtDateIST(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.id || d._id) setProfile(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Convert uploaded photo to base64 and preview
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      flash('Photo must be under 2MB', false);
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      setPhotoPreview(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSavePhoto = async () => {
    if (!photoPreview) return;
    setSaving(true);
    try {
      const r = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePhoto: photoPreview }),
      });
      const d = await r.json();
      if (d.ok) {
        flash('Photo updated!', true);
        setProfile((prev: any) => ({ ...prev, profilePhoto: photoPreview }));
        setPhotoPreview(null);
      } else {
        flash(d.error || 'Failed to update photo', false);
      }
    } catch {
      flash('Network error. Try again.', false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <EmployeeNav />
        <div className="max-w-lg mx-auto px-4 py-8 animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-3xl"/>
          <div className="h-48 bg-gray-100 rounded-3xl"/>
        </div>
      </div>
    );
  }

  const displayPhoto = photoPreview || profile?.profilePhoto;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <EmployeeNav />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Flash message */}
        {msg && (
          <div className={`flex items-center gap-2 p-4 rounded-2xl text-sm font-medium border ${
            msg.ok ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {msg.ok
              ? <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600" />
              : <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Profile card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Banner */}
          <div className="h-24 bg-gradient-to-r from-orange-400 to-orange-500"/>

          {/* Avatar + info */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              {/* Photo */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-orange-100 flex items-center justify-center">
                  {displayPhoto ? (
                    <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-orange-500">
                      {profile?.fullName ? initials(profile.fullName) : <User className="w-8 h-8 text-orange-400" />}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white shadow hover:bg-orange-600 transition"
                  title="Change photo"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </div>

              {/* Save photo button — only shows when new photo selected */}
              {photoPreview && (
                <button
                  onClick={handleSavePhoto}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Photo'}
                </button>
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-800">{profile?.fullName || 'N/A'}</h2>
            <p className="text-sm text-gray-700 capitalize">{profile?.role || 'Employee'}</p>
          </div>
        </div>

        {/* Details card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4">Account Details</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
              <p className="text-sm font-semibold text-gray-800">{profile?.fullName || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm font-semibold text-gray-800">{profile?.email || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Job Role</p>
              <p className="text-sm font-semibold text-gray-800 capitalize">{profile?.jobRole || 'N/A'}</p>
            </div>
            {profile?.dateOfBirth && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Date of Birth</p>
                <p className="text-sm font-semibold text-gray-800">{profile.dateOfBirth}</p>
              </div>
            )}
            {profile?.officeZoneId && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Office Zone</p>
                <p className="text-sm font-semibold text-gray-800">
                  {typeof profile.officeZoneId === 'object' ? profile.officeZoneId.name : profile.officeZoneId}
                </p>
              </div>
            )}
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Member Since</p>
              <p className="text-sm font-semibold text-gray-800">
                {profile?.createdAt ? fmtDateIST(profile.createdAt) : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Account Status</p>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                profile?.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {profile?.isApproved ? 'Approved' : 'Pending Approval'}
              </span>
            </div>
          </div>
        </div>

        {/* Photo upload hint */}
        <p className="text-center text-xs text-gray-400 px-4">
          Tap the camera icon to update your profile photo. Max 2MB.
        </p>

      </div>
    </div>
  );
}