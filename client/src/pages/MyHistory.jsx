import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseclient';
import { TaskCard } from './tasks/components/TaskCard';

export function MyHistory() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchCompletedTasks();
    }
  }, [user]);

  const fetchCompletedTasks = async () => {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      console.error('fetchCompletedTasks:', error.message);
    } else {
      setTasks(data ?? []);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">My History</h1>
      </div>

      <p className="text-sm text-slate-500">
        Review your completed tasks and past contributions.
      </p>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading history…</p>
      ) : tasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-sm text-slate-400">No completed tasks found in your history.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusUpdate={fetchCompletedTasks}
            />
          ))}
        </div>
      )}
    </div>
  );
}
