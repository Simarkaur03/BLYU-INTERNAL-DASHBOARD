import { useRef, useState } from 'react';
import { supabase } from '../supabaseclient';
import { useAuth } from '../contexts/AuthContext';

const ACCEPTED = 'image/*,.pdf,.doc,.docx,.xlsx,.txt';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ taskId, logId, onUploaded, label = '+ Attach file' }) {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const inputId = `fu-${taskId ?? ''}-${logId ?? ''}`;

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');

    if (file.size > MAX_BYTES) {
      setError('File must be under 10 MB.');
      return;
    }

    setUploading(true);

    const ts = Date.now();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = logId ? `logs/${logId}` : `tasks/${taskId}`;
    const path = `${folder}/${ts}_${safe}`;

    const { error: upErr } = await supabase.storage
      .from('task-files')
      .upload(path, file, { upsert: false });

    if (upErr) {
      setError('Upload failed: ' + upErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = await supabase.storage
      .from('task-files')
      .createSignedUrl(path, 60 * 60);

    const { error: dbErr } = await supabase.from('task_attachments').insert({
      task_id: taskId ?? null,
      log_id: logId ?? null,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: path,
      file_url: urlData?.signedUrl ?? '',
      file_type: file.type.startsWith('image/') ? 'image' : 'document',
      file_size: file.size,
    });

    if (dbErr) {
      setError('Recorded storage but DB insert failed: ' + dbErr.message);
    } else {
      onUploaded?.();
    }

    if (inputRef.current) inputRef.current.value = '';
    setUploading(false);
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED}
        onChange={handleChange}
        className="hidden"
      />
      <label
        htmlFor={inputId}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors select-none ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {uploading ? 'Uploading…' : label}
      </label>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
