'use client';

interface DeleteListButtonProps {
  listId: string;
  onDelete: (formData: FormData) => Promise<void>;
}

export default function DeleteListButton({ listId, onDelete }: DeleteListButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!confirm('Are you sure you want to delete this list? All items in this list will be permanently deleted.')) {
      e.preventDefault();
    }
  };

  return (
    <form style={{ 
      display: 'inline-block',
      padding: 0,
      margin: 0,
      background: 'transparent',
      boxShadow: 'none',
      border: 'none'
    }}>
      <input type="hidden" name="listId" value={listId} />
      <button
        type="submit"
        formAction={onDelete}
        className="btn-sm btn-danger"
        onClick={handleClick}
        style={{ margin: 0 }}
      >
        Delete
      </button>
    </form>
  );
}

