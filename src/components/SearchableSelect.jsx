import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check, AlertCircle } from 'lucide-react';

/**
 * Reusable Searchable Dropdown / Combobox Component
 * Supports:
 * - Real-time filtering by label, code, subtitle, or custom search fields
 * - Case-insensitive & partial matching
 * - Keyboard navigation (Up/Down/Enter/Escape)
 * - Click outside detection
 * - Clear button
 * - Custom option formatting & badges
 * - Special action option (e.g. "+ Tambah Baru")
 */
export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Pilih data...',
  searchPlaceholder = 'Cari nama atau kode...',
  disabled = false,
  required = false,
  clearable = false,
  className = '',
  emptyMessage = 'Data tidak ditemukan',
  actionOption = null, // { label: '+ Tambah Vendor', onSelect: () => {} }
  renderOption = null,
  renderSelected = null,
  size = 'sm'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options to { value, label, code, subtitle, badge, data }
  const normalizedOptions = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return {
          value: opt,
          label: String(opt),
          code: '',
          subtitle: '',
          data: opt
        };
      }
      return {
        value: opt.value !== undefined ? opt.value : (opt.id || opt.code),
        label: opt.label || opt.name || opt.title || String(opt.value || ''),
        code: opt.code || opt.sku || '',
        subtitle: opt.subtitle || opt.category || opt.unit || '',
        badge: opt.badge || opt.type || '',
        badgeColor: opt.badgeColor || '',
        extraSearch: opt.extraSearch || '',
        data: opt.data || opt
      };
    });
  }, [options]);

  // Current selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find(opt => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  // Filtered options based on query
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return normalizedOptions;
    const q = query.toLowerCase().trim();
    return normalizedOptions.filter(opt => {
      const matchLabel = opt.label && opt.label.toLowerCase().includes(q);
      const matchCode = opt.code && opt.code.toLowerCase().includes(q);
      const matchSub = opt.subtitle && opt.subtitle.toLowerCase().includes(q);
      const matchBadge = opt.badge && opt.badge.toLowerCase().includes(q);
      const matchExtra = opt.extraSearch && opt.extraSearch.toLowerCase().includes(q);
      return matchLabel || matchCode || matchSub || matchBadge || matchExtra;
    });
  }, [normalizedOptions, query]);

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollIntoView = (index) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-combobox-item]');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSelect = (opt) => {
    if (onChange) {
      onChange(opt.value, opt.data);
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange('', null);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div 
      ref={containerRef} 
      className="relative w-full select-none"
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for HTML5 form required validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          required
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Main Trigger Button */}
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left transition cursor-pointer border rounded-lg bg-white ${
          isSmall ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        } ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
            : 'border-slate-300 hover:border-slate-400 text-slate-800'
        } ${className}`}
      >
        <div className="flex-1 min-w-0 pr-1 truncate">
          {renderSelected ? (
            renderSelected(selectedOption)
          ) : selectedOption ? (
            <div className="flex items-center gap-1.5 truncate">
              {selectedOption.code && (
                <span className="font-mono font-bold text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 flex-shrink-0">
                  {selectedOption.code}
                </span>
              )}
              <span className="font-semibold text-slate-800 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.subtitle && (
                <span className="text-[10px] text-slate-400 font-normal truncate hidden sm:inline">
                  • {selectedOption.subtitle}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 pl-1 text-slate-400">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:text-rose-600 rounded hover:bg-slate-100 transition"
              title="Hapus pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 z-[80] overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[240px]">
          {/* Search Box Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                  title="Bersihkan pencarian"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Action Option (e.g. "+ Tambah Vendor Baru") */}
          {actionOption && (
            <div className="p-1 border-b border-slate-100 bg-emerald-50/50">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  actionOption.onSelect && actionOption.onSelect();
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100/70 rounded-lg transition flex items-center gap-1.5"
              >
                <span>{actionOption.label}</span>
              </button>
            </div>
          )}

          {/* Option List */}
          <div 
            ref={listRef}
            className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-50"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-3 text-center text-slate-400">
                <AlertCircle className="w-4 h-4 mx-auto mb-1 text-slate-300" />
                <span className="text-xs font-semibold">{emptyMessage}</span>
                {query && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Tidak cocok dengan "{query}"
                  </p>
                )}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value || idx}
                    data-combobox-item
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-2.5 py-2 rounded-lg cursor-pointer transition text-xs flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : isHighlighted
                        ? 'bg-slate-100/90 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {renderOption ? (
                      renderOption(opt, isSelected)
                    ) : (
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {opt.code && (
                            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              isSelected
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {opt.code}
                            </span>
                          )}
                          <span className="truncate font-semibold">
                            {opt.label}
                          </span>
                        </div>
                        {opt.subtitle && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {opt.subtitle}
                          </div>
                        )}
                      </div>
                    )}

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

