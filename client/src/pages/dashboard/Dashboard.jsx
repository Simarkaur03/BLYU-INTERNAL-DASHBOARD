import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseclient';
import { StatusBadge } from '../../components/StatusBadge';
import { format } from 'date-fns';

function displayName(profile) {
  return profile?.full_name || profile?.email?.split('@')[0] || '—';
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// Admin-only Overview page (non-admins are redirected by RouteGuard)
export function Dashboard() {
  const { user, role } = useAuth();

  const [members, setMembers]       = useState([]);
  const [taskCounts, setTaskCounts] = useState({});
  const [stats, setStats]           = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [inProgressTasks, setInProgressTasks] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  async function fetchAdminData() {
    setLoading(true);

    // 1. All team members
    const { data: mems } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .order('role', { ascending: false });

    // 2. All tasks — for stats + pending counts
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, status');

    const counts = {};
    let total = 0, pending = 0, inProgressCount = 0, completed = 0;
    const ipTasks = [];

    (allTasks || []).forEach(t => {
      total++;
      if (t.status === 'pending')     { pending++;    counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1; }
      if (t.status === 'in_progress') { 
        inProgressCount++; 
        counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1; 
        ipTasks.push(t);
      }
      if (t.status === 'completed')   { completed++; }
    });

    // 3. Recent activity — last 5 progress logs
    const { data: logsRaw } = await supabase
      .from('progress_logs')
      .select('id, description, log_date, created_at, task_id, user_id')
      .order('log_date', { ascending: false })
      .limit(5);

    let enrichedLogs = logsRaw || [];

    if (enrichedLogs.length > 0) {
      const taskIds = [...new Set(enrichedLogs.map(l => l.task_id).filter(Boolean))];
      const userIds = [...new Set(enrichedLogs.map(l => l.user_id).filter(Boolean))];

      const [{ data: taskData }, { data: profileData }] = await Promise.all([
        supabase.from('tasks').select('id, title, status').in('id', taskIds),
        supabase.from('profiles').select('id, full_name, email').in('id', userIds),
      ]);

      const taskMap = {};
      (taskData || []).forEach(t => { taskMap[t.id] = t; });
      const profileMap = {};
      (profileData || []).forEach(p => { profileMap[p.id] = p; });

      enrichedLogs = enrichedLogs.map(l => ({
        ...l,
        _task: taskMap[l.task_id] || null,
        _profile: profileMap[l.user_id] || null,
      }));
    }

    setMembers(mems || []);
    setTaskCounts(counts);
    setStats({ total, pending, inProgress: inProgressCount, completed });
    setInProgressTasks(ipTasks);
    setRecentLogs(enrichedLogs);
    setLoading(false);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Team members, task stats, and recent activity.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          {/* ── Stats cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total Users',  value: members.length,   color: 'text-indigo-600', adminOnly: true },
              { label: 'Total Tasks',  value: stats.total,      color: 'text-slate-800' },
              { label: 'Pending',      value: stats.pending,    color: 'text-orange-600' },
              { label: 'In Progress',  value: stats.inProgress, color: 'text-blue-600' },
              { label: 'Completed',    value: stats.completed,  color: 'text-green-600' },
            ].filter(s => !s.adminOnly || role === 'admin').map(s => (
              <div
                key={s.label}
                className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col gap-0.5"
              >
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── Team members ────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Team · {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {members.map(m => {
                const name = displayName(m);
                const active = taskCounts[m.id] || 0;
                return (
                  <div key={m.id} className="flex items-center gap-4 px-4 py-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(name)}
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
                      <a
                        href={`mailto:${m.email}`}
                        className="text-xs text-slate-400 hover:text-indigo-600 truncate block"
                      >
                        {m.email}
                      </a>
                    </div>

                    {/* Role badge */}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      m.role === 'admin'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {m.role}
                    </span>

                    {/* Active task count */}
                    <span className="text-xs text-slate-500 shrink-0 w-20 text-right">
                      {active > 0 ? `${active} active` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Tasks In Progress ───────────────────────────────── */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Tasks In Progress
            </h2>
            {inProgressTasks.length === 0 ? (
              <p className="text-sm text-slate-400">No tasks are currently in progress.</p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                {inProgressTasks.map(t => {
                  const assignedTo = members.find(m => m.id === t.assigned_to);
                  return (
                    <div key={t.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                        <p className="text-xs text-slate-400 truncate">
                          Assigned to {displayName(assignedTo)}
                        </p>
                      </div>
                      <StatusBadge status="in_progress" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Recent Activity ─────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Recent Activity
            </h2>

            {recentLogs.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map(log => (
                  <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-800">
                          {log._task?.title || 'Unknown task'}
                        </span>
                        {log._profile && (
                          <p className="text-xs text-indigo-600 mt-0.5">{displayName(log._profile)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {log._task?.status && <StatusBadge status={log._task.status} />}
                        <span className="text-xs text-slate-400">
                          {log.log_date
                            ? format(new Date(log.log_date + 'T00:00:00'), 'MMM d')
                            : format(new Date(log.created_at), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{log.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
