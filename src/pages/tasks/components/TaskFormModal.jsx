import { useState } from 'react';
import { supabase } from '../../../supabaseclient';
import { useAuth } from '../../../contexts/AuthContext';

const PRIORITIES = ['low', 'medium', 'high'];

export function TaskFormModal({ isOpen, onClose, onTaskCreated, profiles }) {
  const { user } = useAuth();
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate]       = useState('');
  const [priority, setPriority]     = useState('medium');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setTitle(''); setDescription(''); setAssignedTo('');
    setDueDate(''); setPriority('medium'); setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !assignedTo) {
      setError('Task title and assigned user are required.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.from('tasks').insert([{
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: assignedTo,
      created_by: user.id,
      due_date: dueDate || null,
      priority,
      status: 'pending',
    }]);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onTaskCreated();
    onClose();
    reset();
  };

  // Separate users (not admins) for the assign dropdown
  const userProfiles = profiles.filter(p => p.role !== 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">New Task</h2>
          <button onClick={() => { onClose(); reset(); }} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Task title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Prepare weekly report"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Explain what needs to be done, any context…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assign to <span className="text-red-400">*</span>
            </label>
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a team member…</option>
              {userProfiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email?.split('@')[0]} — {p.email}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <div className="flex gap-1">
                {PRIORITIES.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors capitalize ${
                      priority === p
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { onClose(); reset(); }}
              className="flex-1 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
