# TeamDesk V3 — Project Context & Current Status
### Last Updated: 2026-03-31

## 1. Project Overview
**TeamDesk** is a role-based internal team dashboard built with React (Vite) and Supabase. It allows admins to manage tasks and team members, while users can track their assigned work and submit daily progress logs.

## 2. Core Features (Implemented)
- **Role-Based Access Control (RBAC):**
  - **Admin:** Can create tasks, assign them to users, view the full member directory, and see all progress logs.
  - **User:** Can view their assigned tasks, update task status (Pending -> In Progress), and submit daily progress logs with file attachments.
- **Task Management:**
  - Dedicated `TaskDetail` page for every task.
  - Shared description editing (both roles can update the task brief).
  - Status tracking with a "Status Badge" system.
  - Automatic status transitions (Task moves from 'Pending' to 'In Progress' when a user submits their first log).
- **Progress Tracking:**
  - Daily log submission (one log per task per day).
  - Inline file/image attachments for logs and tasks.
  - Historical view of all progress reports.
- **Storage:**
  - Files are stored in a private Supabase Storage bucket (`task-files`).
  - Secure access via 1-hour signed URLs.

## 3. Technology Stack
- **Frontend:** React 19, React Router v7, Lucide Icons.
- **Styling:** Tailwind CSS v4 (using the `@tailwindcss/vite` plugin).
- **Backend:** Supabase (Auth, PostgreSQL, Storage).
- **Infrastructure:** Vite development server.

## 4. Project Structure (Key Files)
- `src/App.jsx`: Main router and role-based redirects.
- `src/contexts/AuthContext.jsx`: Manages user session, profiles, and roles.
- `src/pages/dashboard/Dashboard.jsx`: Admin overview (member directory & stats).
- `src/pages/tasks/Tasks.jsx`: Task list view (filtered by role).
- `src/pages/tasks/TaskDetail.jsx`: Deep dive into a single task (description, files, logs).
- `src/pages/progress/Progress.jsx`: Daily log submission and full history.
- `src/supabaseclient.js`: Supabase initialization.

## 5. Recent Changes & Debugging
- **FIXED:** Resolved a critical "Blank Screen" bug on the Dashboard page caused by a missing variable (`role`) in the `useAuth` destructuring.
- **Optimized:** Refined the Admin Overview layout to show member task counts and recent activity.
- **Enhanced:** Improved the file upload flow to allow attachments at both the Task and Log levels.

## 6. Database Schema Summary
- **profiles:** Stores `id`, `email`, `full_name`, and `role` (admin/user).
- **tasks:** Stores `title`, `description`, `assigned_to`, `status`, `priority`, and `due_date`.
- **progress_logs:** Stores `user_id`, `task_id`, `description`, and `log_date`.
- **task_attachments:** Stores `file_name`, `file_path`, `file_url`, and link to `task_id` or `log_id`.

---
*Context Version 3.1*
