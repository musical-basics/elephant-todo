# Elephant App

A task and project management application built with Next.js 15, Supabase, and TypeScript.

## Overview

Elephant App is a productivity tool that helps you manage tasks and projects using a master list system. It implements the "Elephant in the Room" methodology where you always work on the most important task first.

## Features

- **Project Management**: Create and manage projects with priorities
- **Task Management**: Add errands and project items
- **Master List**: Automatic prioritization of tasks
- **Do Now Page**: Focus on one task at a time
- **Take a Bite**: Break down large tasks into smaller pieces
- **Completion Tracking**: View all completed tasks and projects
- **Import/Export**: Backup and restore your data
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: CSS Modules
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd elephant-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Note:** 
- For local development, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- For production, set it to your actual domain (e.g., `https://yourdomain.com`)
- You can copy `.env.local.example` to `.env.local` and update the values

### 4. Supabase Email Configuration

For password reset to work properly, you need to configure the email template in Supabase:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Find **"Reset Password"** template
4. Make sure the redirect URL uses this format: `{{ .SiteURL }}/auth/callback?code={{ .TokenHash }}&type=recovery&next=/auth/reset-password`
5. Or use the default template which should work automatically

### 5. Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  birthdate DATE,
  gender TEXT,
  show_master_list BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE
);

-- Create items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_completed TIMESTAMP WITH TIME ZONE
);

-- Create master_list table
CREATE TABLE master_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  project_placeholder_id TEXT,
  UNIQUE(user_id, position)
);

-- Create project_item_links table
CREATE TABLE project_item_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  UNIQUE(project_id, item_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_item_links ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own items" ON items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own items" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own items" ON items FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own master list" ON master_list FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own master list" ON master_list FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own master list" ON master_list FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own master list" ON master_list FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view project item links" ON project_item_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_item_links.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can insert project item links" ON project_item_links FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_item_links.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update project item links" ON project_item_links FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_item_links.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can delete project item links" ON project_item_links FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_item_links.project_id AND projects.user_id = auth.uid())
);
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Usage

### Getting Started

1. **Sign Up**: Create an account at `/auth/signup`
2. **Add Items**: Go to Dashboard and add your first task
3. **Create Projects**: Organize related tasks into projects
4. **Do Now**: Navigate to "Do Now" to work on your top priority
5. **Complete Tasks**: Mark tasks as completed when done
6. **View Progress**: Check completed items in the Completed page

### Master List

The Master List automatically prioritizes your tasks based on:
- Project priorities (1-5, where 1 is highest)
- Project item sequence
- Errand order

### Take a Bite

When a task is too large, use "Take a Bite" to:
1. Split the current task into two smaller tasks
2. Work on the first part immediately
3. Keep the second part in the queue

## Known Limitations

- Master List is a testing feature (enable in Settings)
- Import/Export uses JSON format only
- Maximum 1200px container width on desktop

## Project Structure

```
elephant-app/
├── app/                    # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── completed/         # Completed items page
│   ├── dashboard/         # Dashboard page
│   ├── do-now/            # Do Now page
│   ├── master-list/       # Master List page
│   ├── projects/          # Projects pages
│   ├── settings/          # Settings page
│   ├── components/        # React components
│   └── globals.css        # Global styles
├── lib/                   # Utility functions
│   ├── actions/           # Server actions
│   ├── supabase/          # Supabase clients
│   └── utils/             # Helper functions
├── components/            # Shared components
└── middleware.ts          # Next.js middleware
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
