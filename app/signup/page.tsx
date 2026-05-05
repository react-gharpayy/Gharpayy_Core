'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, CheckCircle, Upload } from 'lucide-react';

interface Zone {
  _id: string;
  name: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: basic, 2: details, 3: zone & photo
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [officeZoneId, setOfficeZoneId] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [zoneLoading, setZoneLoading] = useState(true);

  // Fetch office zones
  useEffect(() => {
    const fetchZones = async () => {
      setZoneLoading(true);
      try {
        const res = await fetch('/api/zones');
        const data = await res.json();
        if (data.ok) {
          setZones(data.zones);
        } else {
          setError(`Zone loading failed: ${data.error}`);
        }
      } catch (err) {
        // Zone fetch error handled silently
      } finally {
        setZoneLoading(false);
      }
    };
    fetchZones();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfilePhoto(base64);
      setProfilePhotoPreview(base64);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const validateStep1 = () => {
    if (!fullName.trim()) { setError('Full name required'); return false; }
    if (!email.trim()) { setError('Email required'); return false; }
    if (!password) { setError('Password required'); return false; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return false; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!dateOfBirth) { setError('Date of birth required'); return false; }
    if (!jobRole) { setError('Job role required'); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!officeZoneId) { setError('Office zone required'); return false; }
    return true;
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handlePrevStep = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateStep3()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email: email.toLowerCase(),
          password,
          dateOfBirth,
          jobRole,
          officeZoneId,
          profilePhoto,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      setSuccess('Signup successful! Please wait for admin approval to access ARENA OS.');
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/logo.png" alt="ARENA OS" className="h-20 w-auto" onError={e => { (e.target as any).style.display = 'none'; }} />
          <div className="text-center">
            <div className="text-base font-bold text-gray-900">Gharpayy</div>
            <div className="text-sm font-bold text-orange-500">ARENA OS</div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          <div className={`h-2 flex-1 rounded-full transition ${step >= 1 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
          <div className={`h-2 flex-1 rounded-full transition ${step >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
          <div className={`h-2 flex-1 rounded-full transition ${step >= 3 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Create your account</h2>
              <p className="text-sm text-gray-700 mb-6">Step 1 of 3: Basic Information</p>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-3.5 mb-5">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setError(''); }}
                    placeholder="John Doe" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@arenaos.com" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="********" className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <input type="password" value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="********" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => router.push('/login')}
                    className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                    Back to Login
                  </button>
                  <button type="button" onClick={handleNextStep}
                    className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition">
                    Next
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Step 2: DOB & Job Role */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Your Details</h2>
              <p className="text-sm text-gray-700 mb-6">Step 2 of 3: Personal Information</p>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-3.5 mb-5">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={e => { setDateOfBirth(e.target.value); setError(''); }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Role</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                      <input type="radio" name="jobRole" value="full-time" checked={jobRole === 'full-time'} onChange={e => { setJobRole(e.target.value); setError(''); }} className="text-orange-500" />
                      <span className="text-sm font-medium text-gray-700">Full-time</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                      <input type="radio" name="jobRole" value="intern" checked={jobRole === 'intern'} onChange={e => { setJobRole(e.target.value); setError(''); }} className="text-orange-500" />
                      <span className="text-sm font-medium text-gray-700">Intern</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={handlePrevStep}
                    className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                    Back
                  </button>
                  <button type="button" onClick={handleNextStep}
                    className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition">
                    Next
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Step 3: Zone & Photo */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Office & Profile</h2>
              <p className="text-sm text-gray-700 mb-6">Step 3 of 3: Final Details</p>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-3.5 mb-5">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-2xl p-3.5 mb-5">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Office Zone *</label>
                  {zoneLoading ? (
                    <div className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-100 text-gray-700">
                      Loading zones...
                    </div>
                  ) : zones.length === 0 ? (
                    <div className="w-full border border-red-200 rounded-xl px-4 py-3 text-sm bg-red-50 text-red-600">
                      No zones available. Please contact admin.
                    </div>
                  ) : (
                    <select value={officeZoneId} onChange={e => { setOfficeZoneId(e.target.value); setError(''); }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition">
                      <option value="">Select your office zone</option>
                      {zones.map(zone => (
                        <option key={zone._id} value={zone._id}>{zone.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Profile Photo (Optional)</label>
                  <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-gray-50 transition">
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600">Click to upload photo</p>
                      <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  {profilePhotoPreview && (
                    <div className="mt-3 flex items-center gap-3">
                      <img src={profilePhotoPreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                      <span className="text-sm text-green-600">Photo uploaded</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={handlePrevStep}
                    className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                    Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 active:scale-[0.98] transition disabled:opacity-60">
                    {loading ? 'Signing up...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Already have an account? <a href="/login" className="text-orange-500 hover:underline font-semibold">Sign in</a></p>
      </div>
    </div>
  );
}

