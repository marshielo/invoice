'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Option {
  value: string
  label: string
  sublabel?: string | undefined
}

interface Props {
  options: Option[]
  value: string | null
  onChange: (value: string | null) => void
  onSearch?: (query: string) => void
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
  loading?: boolean
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  onSearch,
  placeholder = 'Pilih...',
  clearable = true,
  disabled = false,
  loading = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const handleOpen = useCallback(() => {
    if (disabled) return
    setOpen(true)
    setQuery('')
    if (onSearch) onSearch('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [disabled, onSearch])

  const handleSelect = useCallback(
    (opt: Option) => {
      onChange(opt.value)
      setOpen(false)
      setQuery('')
    },
    [onChange],
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(null)
    },
    [onChange],
  )

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
      if (onSearch) onSearch(e.target.value)
    },
    [onSearch],
  )

  const filtered = onSearch
    ? options
    : options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.sublabel?.toLowerCase().includes(query.toLowerCase()) ?? false),
      )

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm shadow-sm transition ${
          disabled
            ? 'cursor-not-allowed border-border bg-muted text-muted-foreground'
            : 'border-border bg-card text-foreground hover:border-ring focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring'
        }`}
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {clearable && selected && (
            <span
              onClick={handleClear}
              className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              ×
            </span>
          )}
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Cari..."
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">Memuat...</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">Tidak ditemukan</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full px-3 py-2 text-left hover:bg-secondary ${
                    opt.value === value ? 'bg-secondary font-medium text-primary' : 'text-foreground'
                  }`}
                >
                  <div className="text-sm">{opt.label}</div>
                  {opt.sublabel && (
                    <div className="text-xs text-muted-foreground">{opt.sublabel}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
