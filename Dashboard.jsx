import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, CheckCircle2, Clock, AlertTriangle, FolderOpen } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { SkeletonStat } from '../components/SkeletonLoader';

const statusLabels = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
const statusColors = {
  todo: 'bg-gray-100 text-gray-600',
  inprogress: 'bg-blue-100 text-blue-600',
  done: 'bg-emerald-100 text-emerald-600',
};

function StatCard({ icon: Icon, label, value, colorClass, loading }) {
  if (loading) return <SkeletonStat />;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening across your projects.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          Failed to load dashboard data
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={LayoutDashboard} label="Total Tasks" value={data?.totalTasks ?? '-'} colorClass="bg-primary-100 text-primary-600" loading={isLoading} />
        <StatCard icon={CheckCircle2} label="Completed" value={data?.tasksByStatus?.done ?? '-'} colorClass="bg-emerald-100 text-emerald-600" loading={isLoading} />
        <StatCard icon={AlertTriangle} label="Overdue" value={data?.overdueTasks ?? '-'} colorClass="bg-red-100 text-red-600" loading={isLoading} />
        <StatCard icon={FolderOpen} label="Projects" value={data?.projectCount ?? '-'} colorClass="bg-indigo-100 text-indigo-600" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Tasks by Status</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 skeleton rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(data?.tasksByStatus || {}).map(([status, count]) => {
                const total = data?.totalTasks || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
                        {statusLabels[status]}
                      </span>
                      <span className="text-gray-900 font-semibold">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Tasks per Member</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 skeleton rounded-lg" />)}
            </div>
          ) : data?.tasksByUser?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No assignments yet</p>
          ) : (
            <div className="space-y-3">
              {(data?.tasksByUser || []).map((item) => (
                <div key={item._id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center flex-shrink-0">
                    {item.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.user?.name}</p>
                    <p className="text-xs text-gray-500">{item.done}/{item.count} completed</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
