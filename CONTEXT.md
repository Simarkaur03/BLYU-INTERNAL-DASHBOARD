# TeamDesk — Complete Project Context
### Last updated: 2026-03-31 | Version: v3 (TeamDesk)

---

## 1. What This Project Is

**TeamDesk** is an internal team dashboard web application for role-based task and progress management.

- **Admin** creates tasks, assigns them to users, views all progress logs, and sees the full member directory.
- **User** views their assigned tasks, submits daily progress updates, and attaches files to their logs.

**Tech stack:** React 19 (Vite) · Tailwind CSS v4 · Supabase (Auth, Database, Realtime Storage) · React Router v7

---

## 2. Project Directory Structure

```
Internal-dashboard/
├── client/                              ← Frontend (Vite + React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.jsx           ← Reusable file upload → Supabase Storage
│   │   │   └── layout/
│   │   │       ├── AppLayout.jsx        ← Protected shell (auth guard + layout)
│   │   │       ├── Sidebar.jsx          ← Role-based navigation
│   │   │       └── Navbar.jsx           ← Top bar: user email + logout
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx          ← Global auth: session, user, role, signOut
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx            ← /login
│   │   │   │   └── Signup.jsx           ← /signup
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── Dashboard.jsx        ← /dashboard
│   │   │   │                              Admin: member directory table
│   │   │   │                              User: welcome + task count
│   │   │   │
│   │   │   ├── tasks/
│   │   │   │   ├── Tasks.jsx            ← /tasks (list of tasks)
│   │   │   │   ├── TaskDetail.jsx       ← /tasks/:id (full detail view)
│   │   │   │   └── components/
│   │   │   │       ├── TaskCard.jsx     ← Clickable task row → navigates to detail
│   │   │   │       └── TaskFormModal.jsx ← Admin: create task modal
│   │   │   │
│   │   │   └── progress/
│   │   │       └── Progress.jsx         ← /progress
│   │   │                                  User: inline form + file attach step
│   │   │                                  Admin: all logs with user/task info
│   │   │
│   │   ├── supabaseclient.js            ← Supabase client initialization
│   │   ├── App.jsx                      ← Router + route definitions
│   │   ├── main.jsx                     ← React DOM entry point
│   │   └── index.css                    ← Tailwind v4 + Outfit font
│   │
│   ├── package.json
│   └── vite.config.js
│
├── server/                              ← Pre-existing Express server (not used by dashboard)
└── PROJECT_DOCUMENTATION.md            ← Original docs (superseded by this file)
```

---

## 3. Routes

| Path | Component | Auth | Notes |
|---|---|---|---|
| `/login` | `Login` | Public | Redirects to `/dashboard` if logged in |
| `/signup` | `Signup` | Public | Auto-creates profile via trigger |
| `/dashboard` | `Dashboard` | ✅ | Admin: member directory; User: welcome |
| `/tasks` | `Tasks` | ✅ | Admin: all tasks; User: assigned tasks |
| `/tasks/:id` | `TaskDetail` | ✅ | Full task detail (both roles) |
| `/progress` | `Progress` | ✅ | Admin: all logs; User: form + own logs |
| `*` | Redirect | — | → `/dashboard` |

---

## 4. Sidebar Navigation (Role-Based)

**Admin nav:**
- Overview → `/dashboard`
- All Tasks → `/tasks`
- Progress Logs → `/progress`

**User nav:**
- Home → `/dashboard`
- My Tasks → `/tasks`
- Daily Progress → `/progress`

---

## 5. Database Schema (Supabase)

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | References `auth.users(id)` |
| `email` | `text` | |
| `full_name` | `text` | Auto-set from email prefix if not provided |
| `role` | `user_role` enum | `'admin'` or `'user'` (default: `'user'`) |
| `avatar_url` | `text` | Optional |
| `created_at` | `timestamptz` | |

### `tasks`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `title` | `text` | Required |
| `description` | `text` | Editable by both admin and user |
| `assigned_to` | `uuid` → `profiles.id` | |
| `created_by` | `uuid` → `profiles.id` | |
| `due_date` | `date` | Optional |
| `priority` | `text` | `'low'`, `'medium'`, `'high'` (default: `'medium'`) |
| `status` | `task_status` enum | `'pending'`, `'in_progress'`, `'completed'` |
| `description_updated_by` | `uuid` → `profiles.id` | Tracks last editor |
| `description_updated_at` | `timestamptz` | |
| `created_at` | `timestamptz` | |

### `progress_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` → `profiles.id` | Not null |
| `task_id` | `uuid` → `tasks.id` | Not null |
| `description` | `text` | Required |
| `hours_worked` | `numeric(5,2)` | Default 0 (not shown in UI) |
| `log_date` | `date` | Default `CURRENT_DATE` |
| `created_at` | `timestamptz` | |

> **One log per task per day** — enforced in the Progress page form before inserting.

### `task_attachments`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `task_id` | `uuid` → `tasks.id` | Nullable — file belongs to task |
| `log_id` | `uuid` → `progress_logs.id` | Nullable — file belongs to log entry |
| `uploaded_by` | `uuid` → `profiles.id` | |
| `file_name` | `text` | Original filename |
| `file_path` | `text` | Path inside `task-files` Storage bucket |
| `file_url` | `text` | Signed URL (generated at upload time, expires) |
| `file_type` | `text` | `'image'` or `'document'` |
| `file_size` | `bigint` | Bytes |
| `created_at` | `timestamptz` | |

> A file can belong to a task directly (admin uploads a brief) OR a specific log entry (user uploads screenshot of work).

### Custom ENUMs
```sql
CREATE TYPE user_role   AS ENUM ('admin', 'user');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
```

---

## 6. Supabase Storage

- **Bucket name:** `task-files`
- **Visibility:** Private (files accessed via signed URLs only)
- **Max file size:** 10 MB (enforced in `FileUpload.jsx`)

### File path convention
```
task-files/
  tasks/{task_id}/{timestamp}_{sanitized_filename}
  logs/{log_id}/{timestamp}_{sanitized_filename}
```

### Accepted file types
Images: `.jpg .png .webp .gif`
Documents: `.pdf .doc .docx .xlsx .txt`

### Signed URL access
Files are opened via 1-hour signed URLs:
```js
const { data } = await supabase.storage
  .from('task-files')
  .createSignedUrl(filePath, 3600);
window.open(data.signedUrl, '_blank');
```

---

## 7. Row Level Security (RLS)

### `tasks`
```sql
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated USING (true);
```
> Role enforcement is handled in the UI. Open policies prevent FK-related permission errors.

### `progress_logs`
```sql
CREATE POLICY "read_logs"       ON progress_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_logs" ON progress_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
```

### `task_attachments`
```sql
CREATE POLICY "att_select" ON task_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "att_insert" ON task_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "att_delete" ON task_attachments FOR DELETE TO authenticated USING (uploaded_by = auth.uid());
```

### `profiles`
```sql
CREATE POLICY "read_profiles"       ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "update_own_profile"  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
```

### Supabase Storage
```sql
CREATE POLICY "storage_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-files');
CREATE POLICY "storage_read"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'task-files');
CREATE POLICY "storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'task-files' AND owner = auth.uid());
```

---

## 8. Authentication

- **Provider:** Supabase Auth (email + password)
- **Client file:** `src/supabaseclient.js`

```js
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = "https://amuwgjnwxeuiajzjdeza.supabase.co";
const supabaseKey = "sb_publishable_O7pQwn0dAIvscvLOTZ7b2g_OnwS1Nw5";
export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Auto-profile trigger
When a user signs up, a row is auto-inserted into `profiles`:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### AuthContext exposes
| Value | Type | Description |
|---|---|---|
| `session` | object | Full Supabase session |
| `user` | object | Auth user (`user.id`, `user.email`) |
| `role` | `'admin'` \| `'user'` | Fetched from `profiles` |
| `loading` | boolean | True while session/role loads |
| `signOut()` | async fn | Signs out + clears state |

---

## 9. Component Details

### `FileUpload.jsx`
- Props: `taskId`, `logId`, `onUploaded`, `label`
- Validates file size (≤10 MB)
- Uploads to `task-files` bucket
- Saves record to `task_attachments`
- Generates signed URL and stores it
- Resets input after upload so same file can be re-picked

### `TaskDetail.jsx` (route: `/tasks/:id`)
All data fetched via **separate queries** (no FK joins) to avoid Supabase ambiguous FK errors.

**Fetches:**
1. Task (`tasks` by `id`)
2. Assignee profile (`profiles` by `assigned_to`)
3. Description editor profile (`profiles` by `description_updated_by`)
4. Progress logs for task (`progress_logs` by `task_id`)
5. Log author profiles (`profiles` by `user_id` IN array)
6. Task-level attachments (`task_attachments` where `task_id = id AND log_id IS NULL`)
7. Log-level attachments (`task_attachments` where `log_id IN [...]`)

**Features:**
- Status dropdown (admin) or badge (user)
- Editable description with last-edited-by tracking (both roles can edit)
- File upload at task level (`FileUpload` with `taskId`)
- Lists all progress logs with author name, date, and attached files
- Opens any file via generated signed URL

### `Tasks.jsx`
- Admin: all tasks; User: only `assigned_to = user.id`
- Fetches profiles separately and maps `email`/`full_name` by UUID
- Shows visible error if Supabase query fails
- "+ New Task" button visible to admin only

### `TaskCard.jsx`
- Clickable card → `navigate('/tasks/${task.id}')`
- Shows: title, assigned name (admin), priority, due date, status badge
- Hover effect signals clickability

### `TaskFormModal.jsx`
- Fields: title (required), description, assign to (required), due date, priority
- Priority selected via three toggle buttons (low/medium/high)
- Only non-admin profiles appear in the assign dropdown

### `Dashboard.jsx`

**Admin view:**
- Fetches all profiles + pending task counts
- Renders member directory table: avatar initials, full name, clickable email (`mailto:`), role badge, pending task count

**User view:**
- Fetches count of tasks assigned to current user
- Shows simple welcome message + count

### `Progress.jsx`

**User flow (two steps):**
1. Select task + write description → Submit
2. One-log-per-task-per-day check before insert
3. After submit: optional file attach step (`FileUpload` with both `taskId` + `logId`)
4. "Done →" button resets and refreshes log list

**Admin view:**
- Displays all logs from all users
- Shows task title + author name resolved from separate fetches
- Clicking a log navigates to `/tasks/:id`

---

## 10. Key Design Decisions

| Decision | Rationale |
|---|---|
| **No FK joins in queries** | Tasks has two FKs → profiles (`assigned_to`, `created_by`). PostgREST returns ambiguous error → all joins are done separately in JS |
| **Private Storage bucket** | Files accessed via signed URLs only. More secure than public URLs |
| **Separate fetches merged in JS** | Avoids ALL Supabase join issues. Profiles, tasks, attachments all fetched independently |
| **One log per task per day** | Checked client-side with a SELECT before INSERT |
| **React Router (not state-based)** | Already configured, better UX (browser back works, URLs are shareable) |
| **Open task RLS policies** | Initial restrictive policies caused insert failures. Simplified to `USING (true)` since role enforcement is done in UI |
| **Tailwind v4 with `@tailwindcss/vite`** | No `tailwind.config.js` needed. Configured via `@theme` in `index.css` |

---

## 11. npm Dependencies

### Runtime
| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.4 | UI library |
| `react-dom` | ^19.2.4 | DOM renderer |
| `react-router-dom` | ^7.13.2 | Client routing |
| `@supabase/supabase-js` | ^2.100.1 | Supabase client |
| `lucide-react` | ^1.7.0 | Icons (sidebar nav) |
| `date-fns` | ^4.1.0 | Date formatting |
| `clsx` | ^2.1.1 | Conditional classes |
| `tailwind-merge` | ^3.5.0 | Merge Tailwind classes |

### Dev
| Package | Purpose |
|---|---|
| `vite` ^8.0.1 | Build tool + dev server |
| `@vitejs/plugin-react` | React JSX transform |
| `tailwindcss` ^4.2.2 | CSS framework |
| `@tailwindcss/vite` ^4.2.2 | Tailwind v4 Vite plugin |

---

## 12. How to Run

```bash
cd c:\Users\DE\Desktop\Internal-dashboard\client
npm run dev
```
Opens at **http://localhost:5173** (or 5174 if 5173 is taken)

```bash
npm run build   # production build → dist/
```

---

## 13. Supabase Setup Checklist

Everything that must be done in the Supabase Dashboard:

- [x] Run the full schema SQL (tables, enums, RLS, trigger)
- [x] Run `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT`
- [x] Run `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE`
- [x] Run `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT`
- [x] Run `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description_updated_by UUID`
- [x] Run `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description_updated_at TIMESTAMPTZ`
- [x] Run `ALTER TABLE progress_logs ADD COLUMN IF NOT EXISTS log_date DATE`
- [x] Run `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT`
- [x] Create `task_attachments` table
- [x] Create `task-files` private Storage bucket
- [x] Apply Storage RLS policies
- [x] Set admin role: `UPDATE profiles SET role = 'admin' WHERE email = 'ksimar232@gmail.com'`
- [ ] Disable email confirmation (optional, for faster local dev)
  - Supabase Dashboard → Authentication → Settings → Toggle off "Enable email confirmations"

---

## 14. Admin Setup SQL (run once per Supabase project)

```sql
-- Make a user an admin:
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';

-- Check all users and their roles:
SELECT email, role, full_name, created_at FROM profiles ORDER BY created_at;

-- Clear all test data (keeps users):
DELETE FROM task_attachments;
DELETE FROM progress_logs;
DELETE FROM tasks;

-- Check what tasks exist:
SELECT t.title, t.status, t.priority, p.email as assigned_to
FROM tasks t
LEFT JOIN profiles p ON p.id = t.assigned_to;
```

---

## 15. Known Issues & Notes

| Issue | Status | Note |
|---|---|---|
| Supabase ambiguous FK joins | ✅ Fixed | All queries use separate fetches merged in JS |
| `profiles(email)` join ambiguity | ✅ Fixed | Tasks has two FKs to profiles — avoided entirely |
| `task_status` enum missing `in_progress` | ✅ Fixed | `ALTER TYPE task_status ADD VALUE 'in_progress'` |
| `description` column missing from tasks | ✅ Fixed | Added via ALTER TABLE |
| `tasks_select` RLS blocking reads | ✅ Fixed | Replaced with `USING (true)` |
| Notifications system | ✅ Removed | Deliberately removed in v2 simplification |
| Realtime subscriptions | ✅ Removed | Deliberately removed in v2 simplification |
| Mobile sidebar | ⚠️ Not implemented | Sidebar hidden on small screens (< md breakpoint) |
| File signed URLs expire | ⚠️ By design | 1-hour expiry. Files must be re-opened from the UI |
| `hours_worked` field | ⚠️ Hidden | Column exists in DB, defaults to 0, not shown in UI |

---

*Context version 3.0 · TeamDesk Internal Dashboard · 2026-03-31*
