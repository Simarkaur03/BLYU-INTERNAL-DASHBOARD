import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseclient';
import { FileUpload } from '../../components/FileUpload';
import { StatusBadge } from '../../components/StatusBadge';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['pending', 'in_progress', 'completed'];
const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
const STATUS_COLOR = {
  pending: 'bg-orange-100 text-orange-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};
const PRIORITY_COLOR = { low: 'text-green-600', medium: 'text-orange-500', high: 'text-red-600' };

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function displayName(profile) {
  return profile?.full_name || profile?.email?.split('@')[0] || 'Unknown';
}

export function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [task, setTask]               = useState(null);
  const [assignee, setAssignee]       = useState(null);
  const [editor, setEditor]           = useState(null);
  const [logs, setLogs]               = useState([]);
  const [logProfiles, setLogProfiles] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [logAtts, setLogAtts]         = useState({});
  const [loading, setLoading]         = useState(true);

  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft]     = useState('');
  const [savingDesc, setSavingDesc]   = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    setLoading(true);

    // Task
    const { data: t, error: tErr } = await supabase.from('tasks').select('*').eq('id', id).single();
    if (tErr || !t) { navigate('/tasks'); return; }
    setTask(t);
    setDescDraft(t.description || '');

    // Assignee profile
    if (t.assigned_to) {
      const { data: ap } = await supabase.from('profiles').select('full_name, email').eq('id', t.assigned_to).single();
      setAssignee(ap);
    }

    // Last description editor profile
    if (t.description_updated_by) {
      const { data: ep } = await supabase.from('profiles').select('full_name, email').eq('id', t.description_updated_by).single();
      setEditor(ep);
    }

    // Progress logs for this task
    const { data: l } = await supabase
      .from('progress_logs')
      .select('*')
      .eq('task_id', id)
      .order('log_date', { ascending: false });
    setLogs(l || []);

    // Author profiles for logs
    if (l?.length) {
      const ids = [...new Set(l.map(x => x.user_id))];
      const { data: lp } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      const map = {};
      (lp || []).forEach(p => { map[p.id] = p; });
      setLogProfiles(map);
    }

    // Task-level attachments (no log_id)
    const { data: a } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', id)
      .is('log_id', null)
      .order('created_at', { ascending: false });
    setAttachments(a || []);

    // Log-level attachments grouped by log_id
    if (l?.length) {
      const logIds = l.map(x => x.id);
      const { data: la } = await supabase.from('task_attachments').select('*').in('log_id', logIds);
      const map = {};
      (la || []).forEach(att => {
        if (!map[att.log_id]) map[att.log_id] = [];
        map[att.log_id].push(att);
      });
      setLogAtts(map);
    }

    setLoading(false);
  }

  async function saveDescription() {
    setSavingDesc(true);
    await supabase.from('tasks').update({
      description: descDraft,
      description_updated_by: user.id,
      description_updated_at: new Date().toISOString(),
    }).eq('id', id);
    setSavingDesc(false);
    setEditingDesc(false);
    fetchAll();
  }

  async function updateStatus(newStatus) {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    fetchAll();
  }

  async function openFile(filePath) {
    const { data } = await supabase.storage.from('task-files').createSignedUrl(filePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else alert('Could not generate a link for this file.');
  }

  async function handleDeleteTask() {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error.message);
      alert('Failed to delete task: ' + error.message);
    } else {
      navigate('/tasks');
    }
  }

  if (loading) return <p className="text-sm text-slate-400 p-4">Loading…</p>;
  if (!task) return null;

  const priorityLabel = task.priority
    ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
    : null;

  return (
    <div className="max-w-2xl space-y-8">

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => navigate('/tasks')}
          className="text-sm text-slate-400 hover:text-slate-700 transition-colors mb-3 block"
        >
          ← Back to Tasks
        </button>

        <div className="flex items-start flex-wrap gap-3">
          <h1 className="text-xl font-semibold text-slate-800 flex-1">{task.title}</h1>

          {role === 'admin' || task.assigned_to === user?.id ? (
            <select
              value={task.status}
              onChange={e => updateStatus(e.target.value)}
              className={`text-xs font-semibold px-3 py-1 rounded-full cursor-pointer border-0 outline-none ${STATUS_COLOR[task.status]}`}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          ) : (
            <StatusBadge status={task.status} />
          )}

          {role === 'admin' && (
            <button
              onClick={handleDeleteTask}
              className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-full hover:bg-red-100 transition-colors"
            >
              Delete Task
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
          {assignee && <span>Assigned to <strong>{displayName(assignee)}</strong></span>}
          {task.due_date && <span>Due {format(new Date(task.due_date + 'T00:00:00'), 'MMM d, yyyy')}</span>}
          {task.priority && (
            <span className={`font-semibold ${PRIORITY_COLOR[task.priority]}`}>
              {priorityLabel} priority
            </span>
          )}
        </div>
      </div>

      {/* ── Description ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</h2>
          {!editingDesc && (
            <button
              onClick={() => setEditingDesc(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              Edit ✎
            </button>
          )}
        </div>

        {editingDesc ? (
          <div className="space-y-2">
            <textarea
              value={descDraft}
              onChange={e => setDescDraft(e.target.value)}
              rows={5}
              placeholder="Describe the task, context, requirements…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button
                onClick={saveDescription}
                disabled={savingDesc}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingDesc ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditingDesc(false); setDescDraft(task.description || ''); }}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-700 whitespace-pre-wrap bg-white border border-slate-200 rounded-lg p-4 min-h-16">
            {task.description
              ? task.description
              : <span className="text-slate-400 italic">No description yet — click Edit to add one.</span>}
          </div>
        )}

        {editor && task.description_updated_at && !editingDesc && (
          <p className="text-xs text-slate-400 mt-1">
            Last edited by {displayName(editor)} · {format(new Date(task.description_updated_at), 'MMM d, yyyy')}
          </p>
        )}
      </section>

      {/* ── Attachments ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attachments</h2>
          <FileUpload taskId={id} onUploaded={fetchAll} />
        </div>

        {attachments.length === 0 ? (
          <p className="text-sm text-slate-400">No files attached yet.</p>
        ) : (
          <div className="space-y-1">
            {attachments.map(att => (
              <div key={att.id} className="flex items-center justify-between py-2 px-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{att.file_type === 'image' ? '🖼' : '📄'}</span>
                  <span className="text-sm text-slate-700 truncate">{att.file_name}</span>
                  {att.file_size && <span className="text-xs text-slate-400 shrink-0">{formatBytes(att.file_size)}</span>}
                </div>
                <button
                  onClick={() => openFile(att.file_path)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 ml-3 shrink-0"
                >
                  Open ↗
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Progress logs ─────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Progress Logs</h2>

        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">No progress logged for this task yet.</p>
        ) : (
          <div className="space-y-3">
            {logs.map(log => {
              const author = logProfiles[log.user_id];
              const files = logAtts[log.id] || [];
              const dateStr = log.log_date
                ? format(new Date(log.log_date + 'T00:00:00'), 'MMM d, yyyy')
                : format(new Date(log.created_at), 'MMM d, yyyy');

              return (
                <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{displayName(author)}</span>
                    <span className="text-xs text-slate-400">{dateStr}</span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{log.description}</p>
                  {files.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {files.map(att => (
                        <button
                          key={att.id}
                          onClick={() => openFile(att.file_path)}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md"
                        >
                          📎 {att.file_name} ↗
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
