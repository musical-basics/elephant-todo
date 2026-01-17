'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CompletedFiltersProps {
  currentDateFilter: string;
  currentTypeFilter: string;
}

export default function CompletedFilters({ currentDateFilter, currentTypeFilter }: CompletedFiltersProps) {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState(currentDateFilter);
  const [typeFilter, setTypeFilter] = useState(currentTypeFilter);

  const handleApply = () => {
    const params = new URLSearchParams();
    if (dateFilter !== 'all') params.set('dateFilter', dateFilter);
    if (typeFilter !== 'all') params.set('typeFilter', typeFilter);
    router.push(`/completed?${params.toString()}`);
  };

  return (
    <div className="filters-container">
      <div className="filter-group">
        <label htmlFor="dateFilter">Date Range:</label>
        <select
          id="dateFilter"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="all">All time</option>
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="typeFilter">Type:</label>
        <select
          id="typeFilter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="errands">Errands Only</option>
          <option value="projects">Project Items Only</option>
        </select>
      </div>

      <button type="button" onClick={handleApply} className="btn-primary">
        Apply Filters
      </button>
    </div>
  );
}

