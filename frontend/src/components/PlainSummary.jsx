import React from 'react';

export default function PlainSummary({ summary }) {
  if (!summary) return null;
  return (
    <div className="rounded-2xl border border-border/80 bg-earth/70 px-4 py-4 shadow-soft my-6 text-linen">
      <h3 className="font-semibold">{summary.headline}</h3>
      <p className="mt-1 text-sm text-linen/80">{summary.detail}</p>
    </div>
  );
}
