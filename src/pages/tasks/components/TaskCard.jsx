import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseclient';
import { Paperclip, Trash2 } from 'lucide-react';
import { FileUpload } from '../../../components/FileUpload';
import { useState } from 'react';

const PRIORITY_COLOR = {
  low:    'text-green-600',
  medium: 'text-orange-500',
  high:   'text-red-600',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_COLOR = {
  pending: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

export function TaskCard({ task, assignedEmail, onStatusUpdate, onDelete }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);

  const canUpdate = role === 'admin' || task.assigned_to === user?.id;

  const handleStatusChange = async (e, newStatus) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (error) {
      console.error('Error updating status:', error.message);
    } else {
      if (onStatusUpdate) onStatusUpdate();
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(task.id);
  };

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group overflow-hidden"
    >
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
            {task.title}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {role === 'admin' && assignedEmail && (
              <p className="text-xs text-slate-400 truncate">{assignedEmail}</p>
            )}
            {task.priority && (
              <span className={`text-[10px] uppercase tracking-wider font-bold ${PRIORITY_COLOR[task.priority]}`}>
                {task.priority}
              </span>
            )}
            {task.due_date && (
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                Due {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className={`p-1.5 rounded-lg border transition-colors ${showUpload ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          
          {role === 'admin' && (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e, e.target.value)}
            disabled={!canUpdate}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border-0 outline-none transition-colors cursor-pointer disabled:cursor-default ${STATUS_COLOR[task.status] || 'bg-slate-100 text-slate-600'}`}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showUpload && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 bg-slate-50/50" onClick={(e) => e.stopPropagation()}>
          <FileUpload
            taskId={task.id}
            onUploaded={() => {
              setShowUpload(false);
              // Optional: notify success
            }}
            label="Drop files or click to upload"
          />
        </div>
      )}
    </div>
  );
}
