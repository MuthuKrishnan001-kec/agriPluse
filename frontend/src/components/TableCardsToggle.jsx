import React from 'react';

/**
 * TableCardsToggle – button to switch between table view and card view.
 * Props:
 *   viewAsCards: boolean – current mode (true = cards, false = table).
 *   onToggle: () => void – callback to toggle the mode.
 */
export default function TableCardsToggle({ viewAsCards, onToggle }) {
  return (
    <div className="my-4 flex justify-end">
      <button
        type="button"
        onClick={onToggle}
        className="rounded bg-crop px-3 py-1 text-sm text-linen hover:bg-moss"
      >
        {viewAsCards ? 'Show Table' : 'Show Cards'}
      </button>
    </div>
  );
}
