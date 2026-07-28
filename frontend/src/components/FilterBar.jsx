import React from 'react';
import SearchableSelect from './SearchableSelect';

function getFieldIcon(key) {
  switch (key) {
    case 'zone':
    case 'district_name':
      return '📍';
    case 'crop':
      return '🌱';
    case 'season':
      return '⛅';
    case 'soil_type':
      return '🟤';
    case 'year':
      return '📅';
    default:
      return '🏷️';
  }
}

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
      <div className="rounded-2xl border border-dashed border-border/60 bg-white/50 p-8 text-center text-sm text-slate-500 shadow-sm backdrop-blur-sm">
        The live table is loading filter options. You can still inspect the dashboard data below while the backend finishes preparing the controls.
      </div>
    );
  }
  
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-earth">Filters</h2>
        <div className="space-x-3">
          <button onClick={onClearFilters} className="text-sm font-medium text-slate-500 hover:text-earth transition-colors">Clear all</button>
          <button onClick={onRefresh} className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-moss hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0" disabled={running}>
            {running ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filterFields.map(field => (
          <div key={field.key} className="relative group">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors group-focus-within:text-crop">
              <span className="text-base leading-none">{getFieldIcon(field.key)}</span>
              {field.label}
            </label>
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
