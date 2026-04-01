# 📋 Internal Team Dashboard — Full Project Documentation

> **Stack:** React 19 (Vite) · Tailwind CSS v4 · Supabase (Auth, Database, Realtime)  
> **Location:** `c:\Users\DE\Desktop\Internal-dashboard\client`  
> **Dev Server:** `http://localhost:5173`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Directory Structure](#3-project-directory-structure)
4. [Database Schema (Supabase)](#4-database-schema-supabase)
5. [Row Level Security (RLS) Policies](#5-row-level-security-rls-policies)
6. [Authentication](#6-authentication)
7. [User Roles](#7-user-roles)
8. [Pages & Routes](#8-pages--routes)
9. [Components](#9-components)
10. [Feature Details](#10-feature-details)
11. [Supabase Client Setup](#11-supabase-client-setup)
12. [Styling System](#12-styling-system)
13. [How to Run](#13-how-to-run)
14. [Supabase Setup Instructions](#14-supabase-setup-instructions)
15. [Known Notes & Caveats](#15-known-notes--caveats)

---

## 1. Project Overview

**InternalDash** is a role-based internal team dashboard web application where:

- **Admins** can create and assign tasks, view all user progress logs, and send notifications to team members.
- **Users** can view their assigned tasks, update task statuses, log daily progress, and receive notifications.

The entire backend is powered exclusively by **Supabase** — no custom backend server is used for the dashboard logic (the `server/` folder was pre-existing and has not been modified).

---

## 2. Tech Stack & Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.4 | Core UI library |
| `react-dom` | ^19.2.4 | React DOM renderer |
| `react-router-dom` | ^7.13.2 | Client-side routing |
| `@supabase/supabase-js` | ^2.100.1 | Supabase client (auth, db, realtime) |
| `lucide-react` | ^1.7.0 | Icon components |
| `date-fns` | ^4.1.0 | Date formatting utilities |
| `clsx` | ^2.1.1 | Conditional class name utility |
| `tailwind-merge` | ^3.5.0 | Merge Tailwind classes without conflicts |

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `vite` | ^8.0.1 | Build tool & dev server |
| `@vitejs/plugin-react` | ^6.0.1 | Vite React plugin (Babel/SWC) |
| `tailwindcss` | ^4.2.2 | Utility-first CSS framework |
| `@tailwindcss/vite` | ^4.2.2 | Tailwind v4 Vite plugin |
| `postcss` | ^8.5.8 | CSS processing |
| `autoprefixer` | ^10.4.27 | CSS vendor prefixing |

---

## 3. Project Directory Structure

```
Internal-dashboard/
├── client/                          ← Frontend application (Vite + React)
│   ├── public/
│   ├── src/
│   │   ├── assets/                  ← Static assets (images, svgs)
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx      ← Global auth state (session, user, role)
│   │   │
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── AppLayout.jsx    ← Protected route shell
│   │   │       ├── Sidebar.jsx      ← Navigation sidebar
│   │   │       └── Navbar.jsx       ← Top bar (user info + logout)
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx        ← /login page
│   │   │   │   └── Signup.jsx       ← /signup page
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── Dashboard.jsx    ← /dashboard page
│   │   │   │
│   │   │   ├── tasks/
│   │   │   │   ├── Tasks.jsx        ← /tasks page
│   │   │   │   └── components/
│   │   │   │       ├── TaskCard.jsx         ← Reusable task card
│   │   │   │       └── TaskFormModal.jsx    ← Admin: create task modal
│   │   │   │
│   │   │   ├── progress/
│   │   │   │   ├── Progress.jsx     ← /progress page
│   │   │   │   └── components/
│   │   │   │       └── ProgressFormModal.jsx  ← User: log progress modal
│   │   │   │
│   │   │   └── notifications/
│   │   │       ├── Notifications.jsx    ← /notifications page
│   │   │       └── components/
│   │   │           └── NotificationFormModal.jsx  ← Admin: send notification modal
│   │   │
│   │   ├── supabaseclient.js        ← Supabase client initialization
│   │   ├── App.jsx                  ← Router + route definitions
│   │   ├── main.jsx                 ← React DOM entry point
│   │   └── index.css                ← Global styles + Tailwind v4 import
│   │
│   ├── package.json
│   ├── vite.config.js               ← Vite config with Tailwind v4 plugin
│   └── dist/                        ← Production build output (generated)
│
└── server/                          ← Pre-existing server (unused by dashboard)
```

---

## 4. Database Schema (Supabase)

All tables live in the `public` schema of your Supabase project.

### `profiles`

Automatically created for every new user via a database trigger.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | References `auth.users(id)` |
| `email` | `text` | NOT NULL | User's email |
| `role` | `user_role` | DEFAULT `'user'` | Enum: `'admin'` or `'user'` |
| `created_at` | `timestamptz` | DEFAULT `now()` | Auto-set |

### `tasks`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | Auto-generated |
| `title` | `text` | NOT NULL | Task title |
| `description` | `text` | — | Optional details |
| `assigned_to` | `uuid` | FK → `profiles.id` | User the task is assigned to |
| `created_by` | `uuid` | FK → `profiles.id` | Admin who created the task |
| `deadline` | `timestamptz` | — | Due date |
| `status` | `task_status` | DEFAULT `'pending'` | Enum: `'pending'`, `'in_progress'`, `'completed'` |
| `created_at` | `timestamptz` | DEFAULT `now()` | Auto-set |

### `progress_logs`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | Auto-generated |
| `user_id` | `uuid` | FK → `profiles.id` NOT NULL | Who logged progress |
| `task_id` | `uuid` | FK → `tasks.id` NOT NULL | Which task |
| `description` | `text` | NOT NULL | What was done |
| `hours_worked` | `numeric(5,2)` | NOT NULL | Hours spent |
| `created_at` | `timestamptz` | DEFAULT `now()` | Auto-set |

### `notifications`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | Auto-generated |
| `user_id` | `uuid` | FK → `profiles.id` NOT NULL | Recipient |
| `message` | `text` | NOT NULL | Notification message |
| `is_read` | `boolean` | DEFAULT `false` | Read status |
| `created_at` | `timestamptz` | DEFAULT `now()` | Auto-set |

### Custom ENUMs

```sql
CREATE TYPE user_role  AS ENUM ('admin', 'user');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
```

### Auto-Profile Trigger

Every time a user signs up via Supabase Auth, this trigger automatically inserts a row into `profiles`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 5. Row Level Security (RLS) Policies

RLS is **enabled** on all four tables. Below is a summary of who can do what:

### `profiles`

| Operation | Who |
|---|---|
| SELECT | Any authenticated user |
| UPDATE | Only the owner (`auth.uid() = id`) |

### `tasks`

| Operation | Who |
|---|---|
| SELECT | Any authenticated user |
| INSERT | Admins only |
| UPDATE | Admins, OR the user the task is assigned to |
| DELETE | Qualquer usuário autenticado (gerenciado pela UI) / Admins |

> [!NOTE]
> Added `DELETE` policy to resolve permission errors.
| DELETE | Admins only |

### `progress_logs`

| Operation | Who |
|---|---|
| SELECT | Any authenticated user |
| INSERT | Only the user inserting their own log (`user_id = auth.uid()`) |
| DELETE | Qualquer usuário autenticado (gerenciado pela UI) / Admins |

### `notifications`

| Operation | Who |
|---|---|
| SELECT | Only the recipient (`user_id = auth.uid()`) |
| INSERT | Admins only |
| UPDATE | Only the recipient (mark as read) |

---

## 6. Authentication

Authentication is handled entirely by **Supabase Auth** (email + password).

### `src/supabaseclient.js`

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = "https://amuwgjnwxeuiajzjdeza.supabase.co";
const supabaseKey  = "sb_publishable_O7pQwn0dAIvscvLOTZ7b2g_OnwS1Nw5";

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### `src/contexts/AuthContext.jsx`

A React Context that wraps the entire app and exposes:

| Value | Type | Description |
|---|---|---|
| `session` | `object \| null` | Full Supabase session object |
| `user` | `object \| null` | Supabase auth user |
| `role` | `'admin' \| 'user' \| null` | User's role from `profiles` table |
| `loading` | `boolean` | True while session/role is being fetched |
| `signOut()` | `async fn` | Signs out the current user |

**How it works:**
1. On mount, calls `supabase.auth.getSession()` to restore existing session.
2. Subscribes to `supabase.auth.onAuthStateChange` for real-time session updates.
3. Once a user is found, fetches their `role` from the `profiles` table.
4. Children are only rendered once `loading` is `false` (prevents flash).

---

## 7. User Roles

| Role | Access |
|---|---|
| `admin` | Full access — creates/assigns tasks, views all progress, sends notifications, sees total user count on dashboard |
| `user` | Limited access — views only assigned tasks, submits progress logs, receives notifications, sees personal stats only |

Role is stored in `profiles.role` and fetched at login. Role-based rendering happens in each page component using the `role` value from `useAuth()`.

---

## 8. Pages & Routes

### Route Configuration (`src/App.jsx`)

| Path | Component | Auth Required | Notes |
|---|---|---|---|
| `/login` | `Login` | ❌ Public | Redirects to `/dashboard` if already logged in |
| `/signup` | `Signup` | ❌ Public | Creates account + profile |
| `/` | —  | ✅ Protected | Redirects to `/dashboard` |
| `/dashboard` | `Dashboard` | ✅ Protected | Role-conditional stats |
| `/tasks` | `Tasks` | ✅ Protected | Role-conditional list + create |
| `/progress` | `Progress` | ✅ Protected | Role-conditional logs |
| `/notifications` | `Notifications` | ✅ Protected | User receives; admin sends |
| `*` (fallback) | — | — | Redirects to `/dashboard` |

Protected routes are wrapped in `<AppLayout />`, which redirects unauthenticated users to `/login`.

---

## 9. Components

### Layout Components (`src/components/layout/`)

#### `AppLayout.jsx`
- The shell for all authenticated pages
- Checks `user` from `useAuth()`; if absent, redirects to `/login`
- Shows a full-screen spinner while `loading` is `true`
- Renders: `<Sidebar />` + `<Navbar />` + `<Outlet />` (page content)

#### `Sidebar.jsx`
- Fixed-width left navigation (`w-64`, hidden on mobile)
- Uses `<NavLink>` from react-router-dom for active-state highlighting
- Active link: indigo background + indigo text
- Inactive link: slate-500 text with hover effects
- Bottom footer shows current role (`ADMIN` or `USER`)
- Nav items: Dashboard, Tasks, Progress, Notifications

#### `Navbar.jsx`
- Sticky top bar (`h-16`)
- Right side: user avatar icon + username (derived from email) + role badge
- Logout button calls `signOut()` then navigates to `/login`

---

### Page Components

#### `src/pages/auth/Login.jsx`
- Email + password form
- Calls `supabase.auth.signInWithPassword()`
- Shows inline error messages on failure
- "Create a new account" link navigates to `/signup`
- Loading spinner on submit button

#### `src/pages/auth/Signup.jsx`
- Email + password form
- Calls `supabase.auth.signUp()`
- If session is returned (email confirmation disabled), navigates directly to `/dashboard`
- Otherwise, shows a success message to check email
- "Sign in to your account" link navigates to `/login`

#### `src/pages/dashboard/Dashboard.jsx`

**Admin view** fetches:
- Total user count from `profiles`
- All tasks from `tasks` (status breakdown)

**User view** fetches:
- Only tasks where `assigned_to = user.id`

**Stat Cards displayed:**

| Card | Admin | User |
|---|---|---|
| Total Users | ✅ | ❌ |
| Total Tasks | ✅ | ✅ |
| Completed | ✅ | ✅ |
| In Progress / Pending | ✅ | ✅ |

Includes loading skeleton animation.

#### `src/pages/tasks/Tasks.jsx`
- **Admin:** Sees all tasks + "Create Task" button
- **User:** Sees only tasks where `assigned_to = user.id`
- Search bar filters tasks by title (client-side)
- Status filter dropdown (`All`, `Pending`, `In Progress`, `Completed`)
- Empty state with icon and contextual message
- Loading skeleton grid

**Supabase query (tasks with related emails):**
```js
supabase.from('tasks').select(`
  *,
  assigned_to_profile:profiles!tasks_assigned_to_fkey(email),
  created_by_profile:profiles!tasks_created_by_fkey(email)
`)
```

#### `src/pages/tasks/components/TaskCard.jsx`
- Shows: status badge, title, description (clamped), deadline, assigned email (admin only)
- Status action buttons: context-aware (only shows buttons for states you haven't reached)
  - e.g., if `pending` → shows "Start" and "Complete"
  - if `in_progress` → shows "Pending" and "Complete"
  - if `completed` → shows "Pending" and "Start"
- Calls `supabase.from('tasks').update({ status })` on click

#### `src/pages/tasks/components/TaskFormModal.jsx`
- Admin-only modal (opened from Tasks page)
- Fields: Title, Description, Assign User (dropdown of all profiles), Deadline (date picker)
- Validates all fields before submitting
- Calls `supabase.from('tasks').insert()`
- On success: closes modal and refreshes the task list

#### `src/pages/progress/Progress.jsx`
- **Admin:** Sees all logs sorted by newest. Each log shows: task title, logged-by email, hours worked, description, timestamp.
- **User:** Sees only their own logs + "Log Progress" button
- Loading skeleton list
- Empty state with contextual message

#### `src/pages/progress/components/ProgressFormModal.jsx`
- User-only modal
- Fetches active (non-completed) tasks assigned to the current user
- Fields: Task (dropdown), Description (textarea), Hours Worked (number input, step 0.5)
- Calls `supabase.from('progress_logs').insert()`
- On success: closes modal and refreshes the log list

#### `src/pages/notifications/Notifications.jsx`
- **Both roles:** See their own received notifications
- **Admin only:** "Send Notification" button opens the modal
- Unread count shown in subtitle
- "Mark all as read" button (visible when unread > 0)
- Per-notification "Mark as read" checkmark button
- Unread notifications have a highlighted indigo background
- **Real-time:** Uses `supabase.channel()` with `postgres_changes` to append new notifications instantly
- Cleans up channel subscription on component unmount

#### `src/pages/notifications/components/NotificationFormModal.jsx`
- Admin-only modal
- Fetches all profiles for the recipient dropdown
- Fields: User (dropdown), Message (textarea)
- Calls `supabase.from('notifications').insert()`

---

## 10. Feature Details

### Route Protection

`AppLayout.jsx` acts as a protected route wrapper:
```jsx
if (!user) return <Navigate to="/login" replace />;
```
All nested routes automatically inherit this guard.

### Real-Time Notifications

In `Notifications.jsx`, Supabase Realtime is used to push new notifications to the page without refreshing:

```js
const channel = supabase
  .channel('schema-db-changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${user?.id}`
  }, (payload) => {
    setNotifications(prev => [payload.new, ...prev]);
  })
  .subscribe();
```

### Task Foreign Key Joins

Supabase's PostgREST allows fetching related rows inline. Tasks are fetched with both creator and assignee emails:

```js
supabase.from('tasks').select(`
  *,
  assigned_to_profile:profiles!tasks_assigned_to_fkey(email),
  created_by_profile:profiles!tasks_created_by_fkey(email)
`)
```

### Loading States

Every data-fetching page shows a **skeleton animation** (`animate-pulse`) while loading, preventing layout shifts.

### Error Handling

- Auth errors (login/signup failures) are shown as inline red alert banners
- Supabase query errors are caught and logged to the console
- Form validations prevent empty submissions and display user-friendly inline error messages

---

## 11. Supabase Client Setup

**File:** `src/supabaseclient.js`

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://amuwgjnwxeuiajzjdeza.supabase.co";
const supabaseKey = "sb_publishable_O7pQwn0dAIvscvLOTZ7b2g_OnwS1Nw5";

export const supabase = createClient(supabaseUrl, supabaseKey);
```

The same `supabase` instance is imported throughout the app. Using the **publishable (anon)** key is standard for browser clients — the RLS policies on the database enforce data security.

---

## 12. Styling System

### Tailwind CSS v4

The project uses **Tailwind CSS v4** with the `@tailwindcss/vite` plugin (no `tailwind.config.js` needed).

**`src/index.css`:**
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: 'Outfit', sans-serif;
  --color-primary: #4f46e5;         /* Indigo-600 */
  --color-primary-foreground: #fff;
  --color-background: #f8fafc;
  --color-foreground: #0f172a;
  --color-sidebar-bg: #ffffff;
  --color-sidebar-border: #e2e8f0;
}
```

**`vite.config.js`:**
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
})
```

### Typography
- **Font:** [Outfit](https://fonts.google.com/specimen/Outfit) (Google Fonts) — weights 300–700
- **Base text:** `text-slate-900` / `text-slate-500` / `text-slate-400`

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `primary` | `#4f46e5` (Indigo 600) | Buttons, links, active nav, badges |
| `slate-50` | `#f8fafc` | Page background |
| `white` | `#ffffff` | Cards, sidebar, navbar |
| `slate-200` | `#e2e8f0` | Borders |
| `green-*` | — | Completed status |
| `orange-*` | — | Pending status |
| `blue-*` | — | In Progress status |
| `red-*` | — | Errors, logout hover |

### Design Patterns
- **Cards:** `bg-white rounded-2xl border border-slate-100 shadow-sm`
- **Modals:** Fixed overlay with `backdrop-blur-sm`, centered white card with `rounded-2xl`
- **Inputs:** `border border-slate-300 rounded-xl` with `focus:ring-2 focus:ring-primary`
- **Buttons (primary):** `bg-primary text-white rounded-xl hover:bg-primary/90`
- **Buttons (secondary):** `border border-slate-300 text-slate-700 hover:bg-slate-50`

---

## 13. How to Run

### Prerequisites
- Node.js 18+
- npm 8+

### Steps

```bash
# 1. Navigate to the client directory
cd c:\Users\DE\Desktop\Internal-dashboard\client

# 2. Install dependencies (already done, but just in case)
npm install

# 3. Start the development server
npm run dev
```

App is available at: **http://localhost:5173**

### Build for Production

```bash
npm run build
```

Output goes to `client/dist/`. Build size: ~503 KB JS (144 KB gzipped), ~28 KB CSS.

---

## 14. Supabase Setup Instructions

> ⚠️ The app will not work until these steps are completed.

### Step 1: Run the Database Schema

1. Open your Supabase project → **SQL Editor** → **New Query**
2. Paste the full schema SQL (see `database_schema.sql` in the conversation artifacts)
3. Click **Run**

This creates:
- `profiles`, `tasks`, `progress_logs`, `notifications` tables
- The `user_role` and `task_status` ENUMs
- RLS policies on all tables
- The `on_auth_user_created` trigger

### Step 2: Disable Email Confirmation (Recommended for Local Dev)

1. Supabase Dashboard → **Authentication → Settings**
2. Under **Email Auth**, toggle off **"Enable email confirmations"**
3. This allows instant login after signup

### Step 3: Make Yourself an Admin

After signing up for the first time:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your@email.com';
```

Run this in the Supabase SQL Editor. Subsequent accounts will be `user` by default.

### Step 4: Enable Realtime for Notifications

1. Supabase Dashboard → **Database → Replication**
2. Enable Realtime for the `notifications` table

---

## 15. Known Notes & Caveats

| Item | Details |
|---|---|
| **Email confirmation** | If enabled in Supabase, users must verify email before logging in. Disable for local dev. |
| **No email confirmation flow** | The signup page shows a success message if session is not returned, but there's no resend or verify page. |
| **Notifications are user-specific** | Each notification targets exactly one user. There's no "broadcast to all" feature. |
| **Admin role must be set manually** | The trigger defaults all new users to `'user'`. Promote to admin via SQL. |
| **Realtime requires table replication** | If real-time notifications aren't working, enable replication for the `notifications` table in Supabase Dashboard. |
| **`@theme` VS Code lint** | VS Code's CSS extension shows an "Unknown at rule @theme" warning — this is a false positive. Tailwind v4 uses `@theme` natively and the build works correctly. |
| **Bundle size** | The JS bundle is ~503 KB unminified. Code splitting can reduce this if needed for production. |
| **Mobile sidebar** | The sidebar is hidden on screens smaller than `md` (768px). Mobile navigation is not yet implemented. |

---

*Documentation generated: 2026-03-30*  
*Project: InternalDash — Internal Team Dashboard*
