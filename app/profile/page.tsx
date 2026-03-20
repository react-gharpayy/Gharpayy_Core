import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export default async function ProfilePage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/login');
  if (authUser.role === 'admin' || authUser.role === 'manager') redirect('/');

  await connectDB();
  const dbUser = await User.findById(authUser.id).lean();

  const fullName = dbUser?.fullName || authUser.fullName || 'N/A';
  const email = dbUser?.email || authUser.email || 'N/A';
  const jobRole = dbUser?.jobRole || 'N/A';
  const createdAt = dbUser?.createdAt || authUser.createdAt || null;

  return (
    <main className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">My Profile</h1>
          <p className="text-sm text-gray-600 mb-6">Manage your personal profile details (edit not implemented yet).</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Full Name</p>
              <p className="text-sm font-semibold text-gray-700">{fullName}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
              <p className="text-sm font-semibold text-gray-700">{email}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Role</p>
              <p className="text-sm font-semibold text-gray-700 capitalize">{jobRole}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Member since</p>
              <p className="text-sm font-semibold text-gray-700">{createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
