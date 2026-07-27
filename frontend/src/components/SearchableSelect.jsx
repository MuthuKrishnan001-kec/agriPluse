import { useEffect, useRef, useState } from 'react'

/**
 * SearchableSelect — a keyboard-friendly combobox that replaces plain <select>.
 *
 * Props:
 *   value        string  — currently selected value ('' = "All")
 *   options      string[] — available options fetched from backend
 *   placeholder  string  — text shown when nothing is selected (e.g. "All zones")
 *   label        string  — accessible label (shown in trigger button)
 *   loading      bool    — show spinner and disable while options are loading
 *   onChange     fn(value: string) — called with '' to clear or a specific value
 */
export default function SearchableSelect({ value, options = [], placeholder, loading = false, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handlePointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  // Focus the search input when the dropdown opens
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const filtered = query.trim()
    ? options.filter((opt) => String(opt).toLowerCase().includes(query.toLowerCase()))
    : options

  function handleSelect(opt) {
    onChange(opt)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e) {
    e.stopPropagation()
    onChange('')
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  function handleListKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
    if (e.key === 'ArrowDown') {
      const items = listRef.current?.querySelectorAll('[role="option"]')
      if (items?.[0]) items[0].focus()
    }
  }

  function handleOptionKeyDown(e, opt) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(opt) }
    if (e.key === 'ArrowDown') e.currentTarget.nextElementSibling?.focus()
    if (e.key === 'ArrowUp') {
      if (e.currentTarget.previousElementSibling) {
        e.currentTarget.previousElementSibling.focus()
      } else {
        inputRef.current?.focus()
      }
    }
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  const displayLabel = value ? String(value) : placeholder

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { if (!loading) setOpen((o) => !o) }}
        disabled={loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          'flex min-h-[46px] w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-left text-base shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crop focus-visible:border-crop',
          'transition-all duration-200',
          loading
            ? 'cursor-not-allowed border-border bg-slate-50 text-slate-400'
            : value
              ? 'border-crop bg-crop/5 text-earth ring-1 ring-crop/20'
              : 'border-border bg-white text-earth hover:border-slate-300 hover:bg-slate-50',
        ].join(' ')}
      >
        <span className={`flex-1 truncate text-sm ${value ? 'font-medium' : 'text-earth/55'}`}>
          {loading ? 'Loading…' : displayLabel}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value && !loading && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => { if (e.key === 'Enter') handleClear(e) }}
              aria-label="Clear selection"
              className="flex h-5 w-5 items-center justify-center rounded-full text-earth/50 hover:bg-border/30 hover:text-earth"
            >
              ✕
            </span>
          )}
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-crop border-t-transparent" />
          ) : (
            <ChevronIcon open={open} />
          )}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-white shadow-md">
          {/* Search input */}
          <div className="border-b border-border/60 px-2 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 py-2">
              <SearchIcon />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleListKeyDown}
                placeholder="Search…"
                className="flex-1 bg-transparent text-sm text-earth placeholder:text-earth/40 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-earth/40 hover:text-earth"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Option list */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto py-1 text-sm"
          >
            {/* "All …" option */}
            <li
              role="option"
              tabIndex={0}
              aria-selected={!value}
              onClick={() => handleSelect('')}
              onKeyDown={(e) => handleOptionKeyDown(e, '')}
              className={[
                'flex cursor-pointer items-center gap-2 px-3 py-2 focus:outline-none',
                !value
                  ? 'bg-crop/10 font-semibold text-crop'
                  : 'text-slate-500 hover:bg-slate-50 focus:bg-slate-50',
              ].join(' ')}
            >
              <span className="w-4 text-center">{!value && <TickIcon />}</span>
              {placeholder}
            </li>

            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-earth/40">
                {query ? `No matches for "${query}"` : 'No options available'}
              </li>
            )}

            {filtered.map((opt) => (
              <li
                key={opt}
                role="option"
                tabIndex={0}
                aria-selected={String(value) === String(opt)}
                onClick={() => handleSelect(opt)}
                onKeyDown={(e) => handleOptionKeyDown(e, opt)}
                className={[
                  'flex cursor-pointer items-center gap-2 px-3 py-2 focus:outline-none',
                  String(value) === String(opt)
                    ? 'bg-crop/10 font-semibold text-crop'
                    : 'text-earth hover:bg-slate-50 focus:bg-slate-50',
                ].join(' ')}
              >
                <span className="w-4 shrink-0 text-center">
                  {String(value) === String(opt) && <TickIcon />}
                </span>
                <span className="truncate">{opt}</span>
              </li>
            ))}
          </ul>

          {filtered.length > 0 && (
            <p className="border-t border-border/15 px-3 py-1.5 text-xs text-earth/40">
              {filtered.length} of {options.length} option{options.length !== 1 ? 's' : ''}
              {query && ` matching "${query}"`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-earth/50 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-earth/40"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function TickIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-crop"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
