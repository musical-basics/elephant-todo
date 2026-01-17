'use client';

import { useState } from 'react';

interface ProjectItem {
  id: string;
  name: string;
  dateCompleted: string;
  sequence: number;
}

interface ProjectGroup {
  projectId: string;
  projectName: string;
  items: ProjectItem[];
}

interface ProjectItemsSectionProps {
  projectGroups: ProjectGroup[];
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

export default function ProjectItemsSection({ projectGroups }: ProjectItemsSectionProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  return (
    <div className="project-items-container">
      {projectGroups.map((group) => {
        const isExpanded = expandedProjects.has(group.projectId);
        return (
          <div key={group.projectId} className="project-group">
            <div
              className="project-header"
              onClick={() => toggleProject(group.projectId)}
            >
              <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
              <span className="project-name">{group.projectName}</span>
              <span className="item-count">({group.items.length} items)</span>
            </div>
            {isExpanded && (
              <div className="project-items">
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Date Completed</th>
                        <th>Sequence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{formatDateTime(item.dateCompleted)}</td>
                          <td>{item.sequence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

