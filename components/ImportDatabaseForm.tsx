'use client';

interface ImportDatabaseFormProps {
  onSubmit: (formData: FormData) => void;
}

export default function ImportDatabaseForm({ onSubmit }: ImportDatabaseFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm('This will replace all your current data. Are you sure?')) {
      e.preventDefault();
      return;
    }
  };

  return (
    <form action={onSubmit} onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="import_file">Import Database (JSON file)</label>
        <input id="import_file" name="file" type="file" accept=".json" required />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-warning">Import Database</button>
      </div>
    </form>
  );
}

