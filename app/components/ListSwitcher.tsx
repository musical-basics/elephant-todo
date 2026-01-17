'use client';

import { useState } from 'react';
import type { List } from '@/types';

interface ListSwitcherProps {
  lists: List[];
  currentListId: string | null;
  onSwitch: (listId: string) => void;
}

export default function ListSwitcher({ lists, currentListId, onSwitch }: ListSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentList = lists.find(l => l.id === currentListId);

  const handleSelect = (listId: string) => {
    onSwitch(listId);
    setIsOpen(false);
  };

  if (lists.length === 0) {
    return null;
  }

  return (
    <div className="elephant-list-switcher">
      <button
        type="button"
        className="elephant-list-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="elephant-list-switcher-label">
          {currentList?.name || 'Select List'}
        </span>
        <svg
          className="elephant-list-switcher-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="elephant-list-switcher-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="elephant-list-switcher-dropdown">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                className={`elephant-list-switcher-item ${
                  list.id === currentListId ? 'active' : ''
                }`}
                onClick={() => handleSelect(list.id)}
              >
                <span className="elephant-list-switcher-item-name">{list.name}</span>
                {list.is_default && (
                  <span className="elephant-list-switcher-item-badge">Default</span>
                )}
                {list.id === currentListId && (
                  <svg
                    className="elephant-list-switcher-item-check"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13 4L6 11L3 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .elephant-list-switcher {
          position: relative;
          display: inline-block;
        }

        .elephant-list-switcher-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          color: #555;
          transition: color 0.2s;
          border-radius: 4px;
        }

        .elephant-list-switcher-button:hover {
          color: #0066cc;
          background: rgba(0, 102, 204, 0.05);
        }

        .elephant-list-switcher-label {
          white-space: nowrap;
        }

        .elephant-list-switcher-icon {
          transition: transform 0.2s;
          opacity: 0.6;
        }

        .elephant-list-switcher-button:hover .elephant-list-switcher-icon {
          opacity: 1;
        }

        .elephant-list-switcher-button[aria-expanded='true'] {
          color: #0066cc;
        }

        .elephant-list-switcher-button[aria-expanded='true'] .elephant-list-switcher-icon {
          transform: rotate(180deg);
          opacity: 1;
        }

        .elephant-list-switcher-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
        }

        .elephant-list-switcher-dropdown {
          position: absolute;
          top: calc(100% + 0.25rem);
          left: 0;
          min-width: 220px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          z-index: 1000;
          overflow: hidden;
          padding: 0.5rem 0;
        }

        .elephant-list-switcher-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          color: #333;
          text-align: left;
          transition: background 0.15s;
          gap: 0.75rem;
        }

        .elephant-list-switcher-item:hover {
          background: #f8f9fa;
        }

        .elephant-list-switcher-item.active {
          background: #e8f4fd;
          color: #0066cc;
          font-weight: 500;
        }

        .elephant-list-switcher-item-name {
          flex: 1;
        }

        .elephant-list-switcher-item-badge {
          font-size: 0.7rem;
          padding: 0.15rem 0.5rem;
          background: #0066cc;
          color: white;
          border-radius: 3px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .elephant-list-switcher-item.active .elephant-list-switcher-item-badge {
          background: #004d99;
        }

        .elephant-list-switcher-item-check {
          color: #0066cc;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .elephant-list-switcher-button {
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }

          .elephant-list-switcher-dropdown {
            min-width: 200px;
          }

          .elephant-list-switcher-item {
            padding: 0.65rem 0.875rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}

