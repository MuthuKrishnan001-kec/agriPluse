import React, { useEffect, useState } from 'react';
import { api } from '../api';

/**
 * AdviceModal – displays farm advice fetched from the backend.
 * Props:
 *   onClose: () => void – called when the user dismisses the modal.
 *   dataset: string – selected dataset.
 *   table: string – selected table.
 *   filters: object – active filter values to be sent to the insights endpoint.
 */
export default function AdviceModal({ onClose, dataset, table, filters }) {
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdvice = async () => {
      try {
        const res = await api.getInsights(dataset, table, filters);
        setAdvice(res.insight || 'No advice returned.');
      } catch (e) {
        setError(e.message || 'Failed to load advice');
      } finally {
        setLoading(false);
      }
    };
    fetchAdvice();
  }, [dataset, table, filters]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-md rounded bg-linen p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 text-earth/60 hover:text-earth"
          aria-label="Close"
        >✕</button>
        <h2 className="mb-4 text-lg font-semibold text-earth">Farm Advice</h2>
        {loading && <p className="text-sm text-earth/60 italic">Loading advice...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && (
          <p className="whitespace-pre-wrap text-sm text-earth/80">{advice}</p>
        )}
      </div>
    </div>
  );
}
