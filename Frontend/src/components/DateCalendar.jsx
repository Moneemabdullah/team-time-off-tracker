import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from 'cn';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function toKey(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function todayKey() {
  const now = new Date();
  return toKey(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Month calendar with day coloring:
 *   green  — available (not requested, not in the past)
 *   red    — already covered by a pending/approved request (not selectable)
 *   gray   — Sunday (weekend) or in the past (not selectable)
 * `selected` (blue) wins over the others. Dates are 'YYYY-MM-DD' strings.
 */
function DateCalendar({ selected, minDate, blocked, onSelect }) {
  const fallback = selected || minDate || todayKey();
  const [view, setView] = useState(() => {
    const [year, month] = fallback.split('-').map(Number);
    return { year, month: month - 1 };
  });

  const blockedSet = blocked || new Set();
  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta) {
    setView((v) =>
      v.month + delta < 0
        ? { year: v.year - 1, month: 11 }
        : v.month + delta > 11
          ? { year: v.year + 1, month: 0 }
          : { year: v.year, month: v.month + delta }
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <p className="text-sm font-medium">
          {MONTHS[view.month]} {view.year}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className={`flex size-9 items-center justify-center text-xs font-medium ${
              day === 'Su'
                ? 'text-muted-foreground/50'
                : 'text-muted-foreground'
            }`}
          >
            {day}
          </div>
        ))}

        {cells.map((day, index) => {
          if (day === null) return <div key={`blank-${index}`} />;

          const key = toKey(view.year, view.month, day);
          const isPast = key < minDate;
          const dayOfWeek = new Date(view.year, view.month, day).getDay();
          const isWeekend = dayOfWeek === 0; // Sunday only
          const isBlocked = blockedSet.has(key);
          const isSelected = key === selected;
          const disabled = isPast || isWeekend || isBlocked;

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(key)}
              title={
                isWeekend
                  ? 'Weekend — not selectable'
                  : isBlocked
                    ? 'Already requested'
                    : undefined
              }
              aria-label={`${MONTHS[view.month]} ${day}, ${view.year}`}
              className={cn(
                'flex size-9 items-center justify-center rounded-lg text-sm transition-colors',
                isSelected
                  ? 'bg-primary font-semibold text-primary-foreground shadow-sm'
                  : isPast
                    ? 'cursor-not-allowed text-muted-foreground/40'
                    : isWeekend
                      ? 'cursor-not-allowed bg-muted/60 text-muted-foreground/50'
                      : isBlocked
                        ? 'cursor-not-allowed bg-red-100 font-medium text-red-700 ring-1 ring-inset ring-red-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t pt-2.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-green-100 ring-1 ring-inset ring-green-300" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-100 ring-1 ring-inset ring-red-300" />
          Requested
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-muted" />
          Sunday
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
          Past
        </span>
      </div>
    </div>
  );
}

export { DateCalendar };
