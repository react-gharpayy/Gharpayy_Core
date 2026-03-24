import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin-layout';
import TaskBoard from '@/components/task-board';

export default async function TaskBoardPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/my-tasks');
  return <AdminLayout><TaskBoard /></AdminLayout>;
}