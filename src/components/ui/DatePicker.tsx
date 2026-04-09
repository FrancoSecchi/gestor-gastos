import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface DatePickerProps {
  value: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

const CALENDAR_WIDTH = 256; // w-64
const CALENDAR_HEIGHT = 300; // approximate

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, className, required }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [viewDate, setViewDate] = useState<Date>(() =>
    value ? parseISO(value) : new Date()
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const selected = value ? parseISO(value) : null;

  useEffect(() => {
    if (value) setViewDate(parseISO(value));
  }, [value]);

  const updatePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.left;

    const top = spaceBelow >= CALENDAR_HEIGHT
      ? rect.bottom + 6
      : rect.top - CALENDAR_HEIGHT - 6;

    const left = spaceRight >= CALENDAR_WIDTH
      ? rect.left
      : rect.right - CALENDAR_WIDTH;

    setPos({ top, left });
  }, []);

  const handleOpen = () => {
    updatePos();
    setOpen(o => !o);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        calendarRef.current && !calendarRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const handler = () => { updatePos(); };
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, updatePos]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 }),
  });

  const handleSelectDay = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const displayLabel = selected
    ? format(selected, "d 'de' MMM, yyyy", { locale: es })
    : 'Seleccionar fecha';

  const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  const calendar = open ? createPortal(
    <div
      ref={calendarRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: CALENDAR_WIDTH, zIndex: 9999 }}
      className="bg-bg-card border border-border-color rounded-2xl shadow-2xl p-3 animate-fade-in"
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewDate(d => subMonths(d, 1))}
          className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-text-primary capitalize">
          {format(viewDate, 'MMMM yyyy', { locale: es })}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(d => addMonths(d, 1))}
          className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs text-text-secondary font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map(day => {
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelectDay(day)}
              className={`
                h-8 w-full rounded-lg text-xs font-medium transition-all duration-100
                ${!isCurrentMonth ? 'text-text-secondary/30' : ''}
                ${isSelected
                  ? 'bg-accent-blue text-white shadow-sm'
                  : isToday && isCurrentMonth
                    ? 'border border-accent-blue/50 text-accent-blue'
                    : isCurrentMonth
                      ? 'text-text-primary hover:bg-bg-secondary'
                      : 'hover:bg-bg-secondary/50'
                }
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Today shortcut */}
      <div className="mt-2 pt-2 border-t border-border-color">
        <button
          type="button"
          onClick={() => handleSelectDay(new Date())}
          className="w-full text-xs text-text-secondary hover:text-accent-blue transition-colors py-1"
        >
          Hoy
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={`${className} flex items-center gap-2 text-left cursor-pointer`}
      >
        <Calendar size={13} className="text-text-secondary shrink-0" />
        <span className={selected ? 'text-text-primary' : 'text-text-secondary'}>
          {displayLabel}
        </span>
      </button>
      {calendar}
    </div>
  );
};
