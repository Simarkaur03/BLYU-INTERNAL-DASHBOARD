import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseclient';
import { TaskCard } from './components/TaskCard';
import { TaskFormModal } from './components/TaskFormModal';
import { useLocation, useNavigate } from 'react-router-dom';

export function Tasks() {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
  }, [role, user]);

  // Auto-open modal when navigated from the "Create Task" sidebar button
  useEffect(() => {
    if (location.state?.openModal) {
      setIsModalOpen(true);
      // Clear the state so navigating back doesn't re-trigger
      navigate('/tasks', { replace: true, state: {} });
    }
  }, [location.state]);


  const fetchTasks = async () => {
    setLoading(true);
    setFetchError('');

    let query = supabase
      .from('tasks')
      .select('id, title, status, assigned_to, due_date, priority, created_at')
      .order('created_at', { ascending: false });

    // Requirement: remove completed tasks from main view for regular users ONLY
    if (role !== 'admin') {
      query = query.neq('status', 'completed').eq('assigned_to', user.id);
    }

    const { data, error } = await query;

    if (error) {
      setFetchError(error.message);
      console.error('fetchTasks:', error.message);
    }
    setTasks(data ?? []);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, email, full_name');
    if (data) setProfiles(data);
  };

  const emailFor = (uuid) => {
    const p = profiles.find(p => p.id === uuid);
    return p?.full_name || p?.email || '—';
  };

  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">
          {role === 'admin' ? 'All Tasks' : 'My Tasks'}
        </h1>
        {role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New Task
          </button>
        )}
      </div>

      {fetchError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {fetchError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
          {role === 'admin' ? 'No active tasks yet. Create one to get started.' : 'No tasks assigned to you yet.'}
        </div>
      ) : (
        <div className="space-y-8">
          {/* ────── In Progress Section ────── */}
          {inProgressTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                In Progress
              </h2>
              <div className="space-y-2">
                {inProgressTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignedEmail={emailFor(task.assigned_to)}
                    onStatusUpdate={fetchTasks}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ────── Pending Section ────── */}
          {pendingTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                Pending
              </h2>
              <div className="space-y-2">
                {pendingTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignedEmail={emailFor(task.assigned_to)}
                    onStatusUpdate={fetchTasks}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ────── Completed Section (Admin only) ────── */}
          {role === 'admin' && completedTasks.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-xs font-semibold text-green-600 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-600" />
                Completed
              </h2>
              <div className="space-y-2 opacity-75 grayscale-[0.5] hover:grayscale-0 hover:opacity-100 transition-all">
                {completedTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignedEmail={emailFor(task.assigned_to)}
                    onStatusUpdate={fetchTasks}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskCreated={fetchTasks}
        profiles={profiles}
      />
    </div>
  );
}
