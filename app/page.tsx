import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import Header from '@/components/header';
import Navigation from '@/components/navigation';
import WeeklyHeatmap from '@/components/weekly-heatmap';
import WeekOffSetting from '@/components/week-off-setting';

export default async function Home() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  if (user.role === 'employee') redirect('/home');

  const isAdmin = user.role === 'admin';

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-4">
        {isAdmin && <WeekOffSetting />}
        <WeeklyHeatmap />
      </div>
    </main>
  );
}