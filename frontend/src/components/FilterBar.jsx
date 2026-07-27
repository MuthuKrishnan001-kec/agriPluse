import React from 'react';
import SearchableSelect from './SearchableSelect';

export default function FilterBar({
  filters,
  filterFields,
  filterOptions,
  loadingFilterOptions,
  running,
  onFilterChange,
  onClearFilters,
  onRefresh
}) {
  if (!filterFields || filterFields.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/40 bg-linen/50 p-8 text-center text-sm text-earth/60 shadow-soft">
        Select a dataset and table from the sidebar to view and apply filters.
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border border-border/25 bg-linen p-4 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-earth">Filters</h2>
        <div className="space-x-2">
          <button onClick={onClearFilters} className="text-sm text-earth/60 hover:text-earth">Clear all</button>
          <button onClick={onRefresh} className="rounded bg-accent px-3 py-1 text-sm text-linen hover:bg-accent/90 disabled:opacity-50" disabled={running}>
            {running ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filterFields.map(field => (
          <div key={field.key}>
            <label className="mb-1 block text-sm font-medium text-earth/80">{field.label}</label>
            <SearchableSelect
              options={filterOptions?.[field.key] || []}
              value={filters[field.key] || ''}
              onChange={(val) => onFilterChange(field.key, val)}
              placeholder={`Select ${field.label}...`}
              loading={loadingFilterOptions}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
