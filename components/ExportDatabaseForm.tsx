'use client';

import { useState } from 'react';

interface ExportDatabaseFormProps {
  userId: string;
}

export default function ExportDatabaseForm({ userId }: ExportDatabaseFormProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      const data = await response.json();
      
      const jsonString = JSON.stringify(data.data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `elephant-app-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="btn-secondary"
      >
        {isExporting ? 'Exporting...' : 'Export Database'}
      </button>
      {error && (
        <div style={{ 
          padding: '0.5rem', 
          marginTop: '0.5rem', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '4px', 
          color: '#c33',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

