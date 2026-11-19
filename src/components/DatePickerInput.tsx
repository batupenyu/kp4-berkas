import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatIsoToIndonesianDate, parseIndonesianDateToIso } from '../utils/dateUtils';

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const WEEKDAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

interface DatePickerInputProps {
  value: string;
  onChange: (nextIndonesianDate: string) => void;
  allowDash?: boolean;
  placeholder?: string;
  className?: string;
}

function toIso(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  allowDash = false,
  placeholder = 'Pilih tanggal...',
  className = '',
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isoValue = useMemo(() => parseIndonesianDateToIso(value), [value]);

  const initialDate = useMemo(() => {
    if (isoValue) {
      const [y, m, d] = isoValue.split('-').map(Number);
      return { year: y, month: m - 1, day: d };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }, [isoValue]);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (open) {
      setViewYear(initialDate.year);
      setViewMonth(initialDate.month);
    }
  }, [open, initialDate.year, initialDate.month]);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const popWidth = 288;
    const popHeight = 330;

    let left = rect.left;
    if (left + popWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popWidth - 12);
    }
    if (left < 12) left = 12;

    let top = rect.bottom + 6;
    if (top + popHeight > window.innerHeight - 12 && rect.top > popHeight + 12) {
      top = rect.top - popHeight - 6;
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const onScrollOrResize = () => updatePosition();
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const yearOptions = useMemo(() => {
    const list: number[] = [];
    const current = new Date().getFullYear();
    const maxYear = Math.max(current + 10, viewYear + 5, 2035);
    const minYear = Math.min(1940, viewYear - 5);
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [viewYear]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Monday-first index (0 = Mon ... 6 = Sun)
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, iso: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, iso: toIso(viewYear, viewMonth, d) });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectIso = (iso: string) => {
    onChange(formatIsoToIndonesianDate(iso));
    setOpen(false);
  };

  const handleToday = () => {
    const now = new Date();
    const iso = toIso(now.getFullYear(), now.getMonth(), now.getDate());
    onChange(formatIsoToIndonesianDate(iso));
    setOpen(false);
  };

  const handleClear = () => {
    onChange(allowDash ? '-' : '');
    setOpen(false);
  };

  const todayIso = useMemo(() => {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  return (
    <div ref={triggerRef} className="mt-1 relative flex items-center gap-1">
      <div className="relative flex-1 min-w-0">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => setOpen(true)}
          className={`${className} !mt-0 pr-9`}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          aria-label="Buka pemilih tanggal"
          title="Pilih tanggal dari kalender"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {allowDash && value.trim() !== '-' && value.trim() !== '' && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleClear();
          }}
          title="Setel ke '-'"
          aria-label="Setel ke strip"
          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-50 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-3 text-slate-900 dark:text-slate-100 select-none"
          >
            <div className="flex items-center justify-between gap-1.5 mb-2.5">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Bulan sebelumnya"
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <select
                  aria-label="Pilih bulan"
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="flex-1 min-w-0 px-1.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                >
                  {MONTHS_ID.map((mName, idx) => (
                    <option key={mName} value={idx}>
                      {mName}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Pilih tahun"
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="w-[74px] px-1.5 py-1 text-xs font-mono-tabular font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                aria-label="Bulan berikutnya"
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEKDAYS_ID.map((wd) => (
                <div
                  key={wd}
                  className="text-[11px] font-medium text-slate-500 dark:text-slate-400 py-1"
                >
                  {wd}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((cell, idx) => {
                if (!cell.day || !cell.iso) {
                  return <div key={`empty-${idx}`} className="h-8" />;
                }
                const isSelected = cell.iso === isoValue;
                const isToday = cell.iso === todayIso;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => handleSelectIso(cell.iso!)}
                    className={`h-8 w-full rounded-md text-xs font-mono-tabular transition-colors flex items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-900 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold'
                        : isToday
                          ? 'border border-emerald-700 dark:border-emerald-400 text-emerald-900 dark:text-emerald-300 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded text-xs font-medium text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {allowDash ? "Setel '-'" : 'Kosongkan'}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
