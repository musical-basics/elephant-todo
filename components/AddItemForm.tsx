'use client';

import { useState, useTransition } from 'react';

interface Project {
  id: string;
  name: string;
}

interface AddItemFormProps {
  projects: Project[];
  onSubmit: (formData: FormData) => void;
}

export default function AddItemForm({ projects, onSubmit }: AddItemFormProps) {
  const [showNewProject, setShowNewProject] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setShowNewProject(e.target.value === 'new');
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      await onSubmit(formData);
    });
  };

  return (
    <form action={handleSubmit} className="elegant-add-form">
      <div className="elegant-form-row">
        <div className="elegant-form-field">
          <label htmlFor="name" className="elegant-label">
            Item Name
          </label>
          <input 
            id="name" 
            name="name" 
            type="text" 
            required 
            placeholder="What do you need to do?" 
            className="elegant-input"
            disabled={isPending}
          />
        </div>
        
        <div className="elegant-form-field">
          <label htmlFor="project_select" className="elegant-label">
            Project
          </label>
          <div className="custom-select-wrapper">
            <select 
              id="project_select" 
              name="project_select" 
              onChange={handleProjectChange}
              className="elegant-select"
              disabled={isPending}
            >
              <option value="">None (Errand)</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
              <option value="new">+ Create New Project</option>
            </select>
            <span className="select-arrow">▼</span>
          </div>
        </div>
      </div>

      {showNewProject && (
        <div className="elegant-new-project-section">
          <div className="elegant-form-row">
            <div className="elegant-form-field">
              <label htmlFor="new_project_name" className="elegant-label">
                New Project Name
              </label>
              <input 
                id="new_project_name" 
                name="new_project_name" 
                type="text" 
                required={showNewProject} 
                placeholder="Enter project name" 
                className="elegant-input"
                disabled={isPending}
              />
            </div>
            
            <div className="elegant-form-field elegant-form-field-small">
              <label htmlFor="new_project_priority" className="elegant-label">
                Priority
              </label>
              <div className="custom-select-wrapper">
                <select 
                  id="new_project_priority" 
                  name="new_project_priority" 
                  defaultValue="3"
                  className="elegant-select"
                  disabled={isPending}
                >
                  <option value="5">★★★★★ Highest</option>
                  <option value="4">★★★★ High</option>
                  <option value="3">★★★ Medium</option>
                  <option value="2">★★ Low</option>
                  <option value="1">★ Lowest</option>
                </select>
                <span className="select-arrow">▼</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="elegant-form-actions">
        <button 
          type="submit" 
          className="elegant-submit-btn"
          disabled={isPending}
          style={{ cursor: isPending ? 'wait' : 'pointer' }}
        >
          <span className="btn-icon">+</span>
          {isPending ? 'Adding...' : 'Add Item'}
        </button>
      </div>
    </form>
  );
}

