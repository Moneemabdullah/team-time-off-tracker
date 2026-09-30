/** '2026-10-14' or an ISO string -> '14 Oct 2026' (local time, date only). */
export function formatDate(value) {
  if (!value) return '—';
  const dateOnly = String(value).split('T')[0];
  const date = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateOnly;
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
