export function statusBadgeClass(status) {
  const styles = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-700',
  };
  return styles[(status || '').toUpperCase()] || 'bg-muted text-muted-foreground';
}
