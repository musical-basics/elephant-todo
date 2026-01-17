import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProjectItems } from '@/lib/actions/project-items';
import { createNewItem } from '@/lib/actions/items';
import ProjectDetailClient from '@/components/ProjectDetailClient';

async function handleAddItem(projectId: string, formData: FormData) {
  'use server';
  
  const entries = Array.from(formData.entries());
  const itemNames = entries
    .filter(([key]) => key.startsWith('name_'))
    .map(([_, value]) => value as string)
    .filter(name => name && name.trim() !== '');

  for (const name of itemNames) {
    await createNewItem(name, projectId);
  }
  
  redirect(`/projects/${projectId}`);
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editItem?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { id: projectId } = await params;
  const query = await searchParams;

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (!project) {
    redirect('/projects');
  }

  const { data: projectItems } = await getProjectItems(projectId);

  return (
    <ProjectDetailClient
      projectId={projectId}
      project={project}
      projectItems={projectItems || []}
      editItemId={query.editItem}
      onAddItem={handleAddItem.bind(null, projectId)}
    />
  );
}

