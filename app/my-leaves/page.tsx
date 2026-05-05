import EmployeeSidebar from '@/components/employee-sidebar';
import MyLeaves from '@/components/my-leaves';

export default function MyLeavesPage() {
  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <EmployeeSidebar />
      <div className="md:ml-64 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <MyLeaves />
        </div>
      </div>
    </div>
  );
}
