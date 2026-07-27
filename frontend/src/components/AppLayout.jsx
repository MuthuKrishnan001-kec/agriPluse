import React from 'react';
import Sidebar from './Sidebar';

/**
 * AppLayout – basic page layout wrapping the dashboard.
 * Props:
 *   datasets, tables, selectedDataset, selectedTable – passed down to <Sidebar/>
 *   onSelectDataset, onSelectTable – callbacks for user selection.
 *   children – the main content rendered next to the sidebar.
 */
export default function AppLayout({
  datasets,
  tables,
  selectedDataset,
  selectedTable,
  onSelectDataset,
  onSelectTable,
  children,
}) {
  return (
    <div className="flex min-h-screen bg-linen">
      <Sidebar
        datasets={datasets}
        tables={tables}
        selectedDataset={selectedDataset}
        selectedTable={selectedTable}
        onSelectDataset={onSelectDataset}
        onSelectTable={onSelectTable}
      />
      <main className="flex-1 overflow-auto p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
