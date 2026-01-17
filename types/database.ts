export type Profile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  birthdate: string | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  show_master_list: boolean;
  created_at: string;
};

export type List = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  list_id: string;
  name: string;
  priority: 1 | 2 | 3 | 4 | 5;
  status: 'Active' | 'Inactive' | 'Completed';
  created_at: string;
  due_date: string | null;
};

export type ItemType = 'Errand' | 'ProjectItem' | 'ScheduledItem' | 'Routine';
export type ItemStatus = 'Active' | 'Inactive' | 'Completed';

export type Item = {
  id: string;
  user_id: string;
  list_id: string;
  name: string;
  project_id: string | null;
  type: ItemType;
  status: ItemStatus;
  date_added: string;
  date_completed: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
};

export type ProjectItemLink = {
  id: string;
  project_id: string;
  item_id: string;
  sequence: number;
};

export type MasterList = {
  id: string;
  user_id: string;
  list_id: string;
  position: number;
  item_id: string | null;
  project_placeholder_id: string | null;
};

