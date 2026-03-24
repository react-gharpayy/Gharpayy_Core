import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import MyPerformance from '@/components/my-performance';

export default async function MyPerformancePage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role !== 'employee') redirect('/kpis');
  return <MyPerformance />;
}