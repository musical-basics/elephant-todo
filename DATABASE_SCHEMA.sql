CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  birthdate DATE,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  show_master_list BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  priority INTEGER CHECK (priority >= 1 AND priority <= 5) NOT NULL,
  status TEXT CHECK (status IN ('Active', 'Inactive', 'Completed')) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE
);

CREATE TABLE items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('Errand', 'ProjectItem', 'ScheduledItem', 'Routine')) DEFAULT 'Errand',
  status TEXT CHECK (status IN ('Active', 'Inactive', 'Completed')) DEFAULT 'Active',
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_completed TIMESTAMP WITH TIME ZONE,
  scheduled_start_time TIMESTAMP WITH TIME ZONE,
  scheduled_end_time TIMESTAMP WITH TIME ZONE
);

CREATE TABLE project_item_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  sequence INTEGER NOT NULL,
  UNIQUE(project_id, item_id),
  UNIQUE(project_id, sequence)
);

CREATE TABLE master_list (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  project_placeholder_id TEXT,
  UNIQUE(user_id, list_id, position),
  CHECK ((item_id IS NOT NULL AND project_placeholder_id IS NULL) OR 
         (item_id IS NULL AND project_placeholder_id IS NOT NULL))
);

CREATE INDEX idx_lists_user_id ON lists(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_list_id ON projects(list_id);
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_list_id ON items(list_id);
CREATE INDEX idx_items_project_id ON items(project_id);
CREATE INDEX idx_project_item_links_project ON project_item_links(project_id);
CREATE INDEX idx_master_list_user_position ON master_list(user_id, list_id, position);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_item_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own lists" ON lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lists" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON lists FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own items" ON items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own items" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own items" ON items FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own project_item_links" ON project_item_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_item_links.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can insert own project_item_links" ON project_item_links FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_item_links.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own project_item_links" ON project_item_links FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_item_links.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can delete own project_item_links" ON project_item_links FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_item_links.project_id AND projects.user_id = auth.uid())
);

CREATE POLICY "Users can view own master_list" ON master_list FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own master_list" ON master_list FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own master_list" ON master_list FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own master_list" ON master_list FOR DELETE USING (auth.uid() = user_id);
