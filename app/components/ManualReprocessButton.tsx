'use client';

import { useTransition } from 'react';

interface ManualReprocessButtonProps {
  onReprocess: () => Promise<void>;
}

export default function ManualReprocessButton({ onReprocess }: ManualReprocessButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await onReprocess();
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn-warning"
      disabled={isPending}
      style={{ cursor: isPending ? 'wait' : 'pointer' }}
    >
      {isPending ? 'Processing...' : 'MANUAL REPROCESS'}
    </button>
  );
}

