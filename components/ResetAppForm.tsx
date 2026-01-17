'use client';

interface ResetAppFormProps {
  onSubmit: () => void;
}

export default function ResetAppForm({ onSubmit }: ResetAppFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm('This will delete ALL your data permanently. Are you absolutely sure?')) {
      e.preventDefault();
      return;
    }
  };

  return (
    <form action={onSubmit} onSubmit={handleSubmit}>
      <div className="form-actions">
        <button type="submit" className="btn-danger">
          Reset App (Full Reset)
        </button>
      </div>
    </form>
  );
}

