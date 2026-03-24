import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import Approvals from '@/components/approvals';

export default async function ApprovalsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');
  return <AdminLayout><Approvals /></AdminLayout>;
}