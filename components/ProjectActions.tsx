'use client';

import { useState } from 'react';

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
  onComplete: (projectId: string) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}

export default function ProjectActions({ 
  projectId, 
  projectName, 
  onComplete, 
  onDelete 
}: ProjectActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleComplete = async () => {
    setIsProcessing(true);
    await onComplete(projectId);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${projectName}"? This will delete the project and all Active/Inactive items (Completed items will be preserved).`)) {
      setIsProcessing(true);
      await onDelete(projectId);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleComplete}
        className="btn-success"
        disabled={isProcessing}
        title="Complete all Active/Inactive items"
        style={{ cursor: isProcessing ? 'wait' : 'pointer' }}
      >
        {isProcessing ? 'Processing...' : 'Complete'}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        className="btn-danger"
        disabled={isProcessing}
        title="Delete project and all Active/Inactive items"
        style={{ cursor: isProcessing ? 'wait' : 'pointer' }}
      >
        {isProcessing ? 'Deleting...' : 'Delete'}
      </button>
    </>
  );
}

