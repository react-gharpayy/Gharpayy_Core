import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import MyAttendance from '@/components/my-attendance';

export default async function AttendancePage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  return <MyAttendance />;
}
