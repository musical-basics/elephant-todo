'use client';

import { useState } from 'react';
import { completeItem } from '@/lib/actions/items';

interface QuickCompleteButtonProps {
  position: number;
}

export default function QuickCompleteButton({ position }: QuickCompleteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await completeItem(position);
      window.location.reload();
    } catch (error) {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleComplete}
      disabled={isLoading}
      className="btn-success btn-small"
      style={{ minWidth: '80px' }}
    >
      {isLoading ? '...' : '✓'}
    </button>
  );
}

