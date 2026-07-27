import React from "react";

/**
 * InsightBar – shows a short insight string and a button to request full advice.
 * Props:
 *   insight: string – the brief insight text (may be empty).
 *   onGetAdvice: () => void – callback when the "Get farm advice" button is clicked.
 */
export default function InsightBar({ insight, onGetAdvice }) {
  return (
    <div className="my-4 rounded border border-border/25 bg-linen p-4 shadow-md flex items-center justify-between">
      <div className="flex-1">
        {insight ? (
          <p className="text-sm text-earth/80">{insight}</p>
        ) : (
          <p className="text-sm text-earth/50 italic">No insight available yet.</p>
        )}
      </div>
      <button
        onClick={onGetAdvice}
        className="ml-4 rounded bg-crop px-3 py-1 text-sm font-medium text-linen hover:bg-moss disabled:opacity-50"
      >
        Get farm advice
      </button>
    </div>
  );
}
