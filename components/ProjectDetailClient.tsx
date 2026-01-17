'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  updateProjectName,
  updateProjectPriority,
  updateItemSequence,
  deleteProjectItem,
  updateItemName,
} from '@/lib/actions/projects';

interface ProjectDetailClientProps {
  projectId: string;
  project: any;
  projectItems: any[];
  editItemId?: string;
  onAddItem: (formData: FormData) => void;
}

export default function ProjectDetailClient({
  projectId,
  project,
  projectItems,
  editItemId,
  onAddItem,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAddingItems, startAddTransition] = useTransition();
  const [optimisticItems, setOptimisticItems] = useState(projectItems);
  const [itemInputs, setItemInputs] = useState([{ id: 1, value: '' }]);
  const [bulkText, setBulkText] = useState('');

  const handleUpdateName = async (formData: FormData) => {
    const name = formData.get('name') as string;
    if (name) {
      startTransition(async () => {
        await updateProjectName(projectId, name);
        router.refresh();
      });
    }
  };

  const handleUpdatePriority = async (formData: FormData) => {
    const priority = parseInt(formData.get('priority') as string);
    startTransition(async () => {
      await updateProjectPriority(projectId, priority);
      router.refresh();
    });
  };


  const handleMoveUp = async (itemId: string, index: number) => {
    const newItems = [...optimisticItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setOptimisticItems(newItems);

    startTransition(async () => {
      await updateItemSequence(projectId, itemId, 'up');
      router.refresh();
    });
  };

  const handleMoveDown = async (itemId: string, index: number) => {
    const newItems = [...optimisticItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setOptimisticItems(newItems);

    startTransition(async () => {
      await updateItemSequence(projectId, itemId, 'down');
      router.refresh();
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    setOptimisticItems(optimisticItems.filter((link: any) => link.items.id !== itemId));

    startTransition(async () => {
      await deleteProjectItem(itemId);
      router.refresh();
    });
  };

  const handleUpdateItemName = async (itemId: string, formData: FormData) => {
    const name = formData.get('name') as string;
    if (name) {
      startTransition(async () => {
        await updateItemName(itemId, name);
        router.push(`/projects/${projectId}`);
      });
    }
  };

  const addItemInput = () => {
    if (itemInputs.length < 10) {
      setItemInputs([...itemInputs, { id: Date.now(), value: '' }]);
    }
  };

  const removeItemInput = (id: number) => {
    if (itemInputs.length > 1) {
      setItemInputs(itemInputs.filter(input => input.id !== id));
    }
  };

  const handleInputChange = (id: number, value: string) => {
    setItemInputs(itemInputs.map(input => 
      input.id === id ? { ...input, value } : input
    ));
  };

  const handleAddItems = async (formData: FormData) => {
    startAddTransition(async () => {
      await onAddItem(formData);
    });
  };

  const handleBulkPaste = () => {
    const lines = bulkText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return;

    const newInputs = lines.slice(0, 50).map((line, index) => ({
      id: Date.now() + index,
      value: line
    }));

    setItemInputs(newInputs);
    setBulkText('');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <Link href="/projects">
          <button type="button" className="btn-back">← Back to Projects</button>
        </Link>
        <h1 className="page-title">Edit Project</h1>
        <p className="page-subtitle">{project.name}</p>
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Project Name</h2>
        </div>
        <form action={handleUpdateName}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={project.name}
              required
              placeholder="Enter project name"
              disabled={isPending}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Updating...' : 'Update Name'}
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Priority</h2>
        </div>
        <form action={handleUpdatePriority}>
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              defaultValue={project.priority.toString()}
              disabled={isPending}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Updating...' : 'Update Priority'}
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Project Items</h2>
        </div>
        {!optimisticItems || optimisticItems.length === 0 ? (
          <div className="table-empty">
            <p>No items in this project.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Name</th>
                  <th>Status</th>
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {optimisticItems.map((link: any, index: number) => {
                  const item = link.items;
                  const isEditing = editItemId === item.id;

                  return (
                    <tr key={link.id}>
                      <td>{index + 1}</td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <form action={handleUpdateItemName.bind(null, item.id)} style={{ display: 'flex', gap: '0.5rem', flex: 1, margin: 0, padding: 0, boxShadow: 'none', background: 'transparent' }}>
                              <input
                                name="name"
                                type="text"
                                defaultValue={item.name}
                                required
                                style={{ flex: 1, minWidth: '200px' }}
                                disabled={isPending}
                              />
                              <button type="submit" className="btn-success" disabled={isPending} style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
                                {isPending ? 'Saving...' : 'Save'}
                              </button>
                            </form>
                            <Link href={`/projects/${projectId}`}>
                              <button type="button" className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>Cancel</button>
                            </Link>
                          </div>
                        ) : (
                          item.name
                        )}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.85rem',
                          color: item.status === 'Active' ? '#28a745' : item.status === 'Completed' ? '#007bff' : '#6c757d',
                          fontWeight: 'bold'
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td className="actions-column">
                        {!isEditing && (
                          <>
                            <Link href={`/projects/${projectId}?editItem=${item.id}`}>
                              <button type="button" className="btn-warning">Edit</button>
                            </Link>
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveUp(item.id, index)}
                                className="btn-secondary"
                                disabled={isPending}
                              >
                                ↑
                              </button>
                            )}
                            {index < optimisticItems.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveDown(item.id, index)}
                                className="btn-secondary"
                                disabled={isPending}
                              >
                                ↓
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="btn-danger"
                              disabled={isPending}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Add Items To Project</h2>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: '600' }}>
            Bulk Add (Paste from Excel)
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.75rem' }}>
            Paste a list of items (one per line). Works great with copy-paste from Excel or any text editor.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Paste your list here (one item per line)&#10;Example:&#10;Write script for video&#10;Plan out video scenes&#10;shoot video scene 1"
            disabled={isAddingItems}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '0.75rem',
              fontSize: '0.95rem',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontFamily: 'inherit',
              resize: 'vertical',
              marginBottom: '0.75rem'
            }}
          />
          <button
            type="button"
            onClick={handleBulkPaste}
            disabled={isAddingItems || !bulkText.trim()}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            Load Items from List
          </button>
        </div>

        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#e7f3ff', borderRadius: '6px', border: '1px solid #b3d9ff' }}>
          <p style={{ fontSize: '0.875rem', margin: 0, color: '#004085' }}>
            <strong>Or add items individually below:</strong>
          </p>
        </div>

        <form id="add-item-form" action={handleAddItems}>
          {itemInputs.map((input, index) => (
            <div key={input.id} className="form-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor={`item_name_${input.id}`}>
                  Item {index + 1} Name
                </label>
                <input
                  id={`item_name_${input.id}`}
                  name={`name_${index}`}
                  type="text"
                  value={input.value}
                  onChange={(e) => handleInputChange(input.id, e.target.value)}
                  placeholder="Enter item name"
                  disabled={isAddingItems}
                />
              </div>
              {itemInputs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItemInput(input.id)}
                  className="btn-danger"
                  style={{ marginBottom: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  disabled={isAddingItems}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <div className="form-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {itemInputs.length < 50 && (
              <button
                type="button"
                onClick={addItemInput}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                disabled={isAddingItems}
              >
                + Add Another Item
              </button>
            )}
            {itemInputs.length > 1 && itemInputs.some(input => input.value.trim() !== '') && (
              <button
                type="button"
                onClick={() => setItemInputs([{ id: Date.now(), value: '' }])}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                disabled={isAddingItems}
              >
                Clear All
              </button>
            )}
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', cursor: isAddingItems ? 'wait' : 'pointer' }}
              disabled={isAddingItems}
            >
              {isAddingItems ? 'Adding...' : `Add ${itemInputs.length} Item${itemInputs.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

