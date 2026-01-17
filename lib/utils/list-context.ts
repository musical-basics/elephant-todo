'use server';

import { getCurrentListId, ensureUserHasDefaultList } from '@/lib/actions/lists';

export async function getActiveListId(): Promise<string> {
  await ensureUserHasDefaultList();
  
  const listId = await getCurrentListId();
  
  if (!listId) {
    const { listId: defaultListId } = await ensureUserHasDefaultList();
    if (!defaultListId) {
      throw new Error('Failed to get or create default list');
    }
    return defaultListId;
  }
  
  return listId;
}

