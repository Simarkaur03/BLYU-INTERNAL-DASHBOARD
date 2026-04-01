import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseclient';
import { FileUpload } from '../../components/FileUpload';
import { StatusBadge } from '../../components/StatusBadge';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const today = new Date().toISOString().split('T')[0];

function displayName(profile) {
  return profile?.full_name || profile?.email?.split('@')[0] || 'Unknown';
}

export function Progress() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const historyRef = useRef(null);

  // Log list
  const [logs, setLogs]               = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Log-level attachments
  const [logAttachments, setLogAttachments] = useState({});

  // Inline form (user only)
  const [tasks, setTasks]               = useState([]);
  const [taskId, setTaskId]             = useState('');
  const [description, setDescription]   = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');

  // Post-submit state: show file upload step
  const [submittedLogId, setSubmittedLogId]   = useState(null);
  const [submittedTaskId, setSubmittedTaskId] = useState(null);

  useEffect(() => {
    fetchLogs();
    if (role !== 'admin') fetchAssignedTasks();
  }, [role, user]);

  const fetchLogs = async () => {
    setLogsLoading(true);
    let query = supabase
      .from('progress_logs')
      .select('id, description, created_at, log_date, task_id, user_id')
      .order('log_date', { ascending: false });

    if (role !== 'admin') {
      query = query.eq('user_id', user.id);
    }

    const { data } = await query;
    let logs = data || [];

    // Resolve task titles + statuses, and user profiles
    if (logs.length) {
      const taskIds = [...new Set(logs.map(l => l.task_id).filter(Boolean))];
      const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];

      const [{ data: taskData }, { data: profileData }] = await Promise.all([
        supabase.from('tasks').select('id, title, status').in('id', taskIds),
        supabase.from('profiles').select('id, full_name, email').in('id', userIds),
      ]);

      const taskMap = {};
      (taskData || []).forEach(t => { taskMap[t.id] = t; });
      const profileMap = {};
      (profileData || []).forEach(p => { profileMap[p.id] = p; });

      logs = logs.map(l => ({
        ...l,
        _task: taskMap[l.task_id] || null,
        _profile: profileMap[l.user_id] || null,
      }));

      // Fetch log-level attachments
      const logIds = logs.map(l => l.id);
      const { data: attData } = await supabase
        .from('task_attachments')
        .select('*')
        .in('log_id', logIds);

      const attMap = {};
      (attData || []).forEach(att => {
        if (!attMap[att.log_id]) attMap[att.log_id] = [];
        attMap[att.log_id].push(att);
      });
      setLogAttachments(attMap);
    }

    setLogs(logs);
    setLogsLoading(false);
  };

  const fetchAssignedTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('assigned_to', user.id)
      .neq('status', 'completed');
    if (data) setTasks(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!taskId || !description.trim()) {
      setError('Please select a task and write a description.');
      return;
    }

    // One log per task per day
    const { data: existing } = await supabase
      .from('progress_logs')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .eq('log_date', today);

    if (existing?.length > 0) {
      setError('You already submitted a log for this task today.');
      return;
    }

    setSubmitting(true);
    const { data: log, error: err } = await supabase
      .from('progress_logs')
      .insert([{
        user_id: user.id,
        task_id: taskId,
        description: description.trim(),
        log_date: today,
      }])
      .select()
      .single();

    if (err) {
      setSubmitting(false);
      setError(err.message);
      return;
    }

    // ── Auto-advance task status: pending → in_progress ──────────
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('status')
      .eq('id', taskId)
      .single();

    if (currentTask?.status === 'pending') {
      await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', taskId);
    }
    // Note: never auto-set to completed — only admin does that manually

    setSubmitting(false);

    // Move to attach-file step
    setSubmittedLogId(log.id);
    setSubmittedTaskId(taskId);
    setTaskId('');
    setDescription('');
  };

  const handleDone = () => {
    setSubmittedLogId(null);
    setSubmittedTaskId(null);
    fetchLogs();
    // Re-fetch tasks so status updates reflect in the dropdown
    if (role !== 'admin') fetchAssignedTasks();
  };

  const openFile = async (filePath) => {
    const { data } = await supabase.storage.from('task-files').createSignedUrl(filePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else alert('Could not generate a link for this file.');
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-xl font-semibold text-slate-800">
        {role === 'admin' ? 'Progress Logs' : 'Daily Progress'}
      </h1>

      {/* ── Add progress form (users only) ───────────────────────── */}
      {role !== 'admin' && (
        <div className="space-y-6">
          {/* Active Tasks Summary */}
          {tasks.length > 0 && !submittedLogId && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-blue-800">You have {tasks.length} active task{tasks.length !== 1 ? 's' : ''}</h2>
                <p className="text-xs text-blue-600 mt-0.5">Submit your daily update below to track progress.</p>
              </div>
              <div className="flex -space-x-2">
                {tasks.slice(0, 3).map((t, idx) => (
                  <div key={t.id} className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm" title={t.title}>
                    {idx + 1}
                  </div>
                ))}
                {tasks.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                    +{tasks.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Fill the form */}
          {!submittedLogId && (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Daily Update · {format(new Date(today), 'MMM d, yyyy')}
                </h2>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-red-600" />
                   {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Task</label>
                  <select
                    value={taskId}
                    onChange={e => setTaskId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                  >
                    <option value="">Select a task to log progress…</option>
                    {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">What success did you have today?</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe your progress, technical hurdles, or wins…"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? 'Submitting…' : 'Submit Progress Update'}
              </button>
            </form>
          )}

          {/* Step 2: Attach files to the log */}
          {submittedLogId && (
            <div className="bg-white border-2 border-indigo-100 rounded-xl p-8 text-center space-y-6 shadow-xl shadow-indigo-50 animate-in fade-in zoom-in duration-300">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                  ✨
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Great work! Update saved.</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Wait! Before you go, do you have any screenshots or notes?
                  </p>
                </div>
              </div>

              <div className="max-w-xs mx-auto">
                <FileUpload
                  taskId={submittedTaskId}
                  logId={submittedLogId}
                  onUploaded={() => {}}
                  label="📎 Upload file or screenshot"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={handleDone}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  No, I'm all done for today →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Log list ─────────────────────────────────────────────── */}
      <div id="my-history-section" ref={historyRef}>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          {role === 'admin' ? 'All Logs' : 'Your Logs'}
        </h2>

        {logsLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-400">No logs yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div
                key={log.id}
                className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:border-indigo-200 transition-colors"
                onClick={() => log.task_id && navigate(`/tasks/${log.task_id}`)}
              >
                {/* Header row: author + date + status badge */}
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-800">
                      {log._task?.title || 'Unknown task'}
                    </span>
                    {role === 'admin' && log._profile && (
                      <p className="text-xs text-indigo-600 mt-0.5">{displayName(log._profile)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {log._task?.status && <StatusBadge status={log._task.status} />}
                    <span className="text-xs text-slate-400">
                      {log.log_date
                        ? format(new Date(log.log_date + 'T00:00:00'), 'MMM d, yyyy')
                        : format(new Date(log.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 whitespace-pre-wrap">{log.description}</p>

                {/* Attachments */}
                {(logAttachments[log.id] || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                    {(logAttachments[log.id] || []).map(att => (
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
