import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/app/lib/admin-auth';

export default async function AdminDashboard() {
  const auth = await isAdminAuthenticated();
  if (!auth) redirect('/admin/login');

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white px-8 py-12">

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-thin tracking-[0.4em]">SEAL</h1>
            <p className="text-xs tracking-[0.3em] text-[#555] uppercase mt-1">Admin Dashboard</p>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="text-xs tracking-[0.2em] uppercase text-[#555] hover:text-white transition-colors"
            >
              Logout
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { label: 'Total Seals', value: '0' },
            { label: 'Pending QA', value: '0' },
            { label: 'Delivered', value: '0' },
          ].map(({ label, value }) => (
            <div key={label} className="border border-[#222] p-6">
              <p className="text-3xl font-thin mb-2">{value}</p>
              <p className="text-[10px] tracking-[0.2em] text-[#555] uppercase">{label}</p>
            </div>
          ))}
        </div>

        {/* Placeholder sections */}
        <div className="border border-[#222] p-8">
          <p className="text-[10px] tracking-[0.3em] text-[#555] uppercase mb-6">Recent Profiles</p>
          <p className="text-[#444] text-sm">No profiles yet. Start from the questionnaire.</p>
        </div>
      </div>
    </main>
  );
}
