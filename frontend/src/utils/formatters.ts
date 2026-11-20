export function formatBytes(bytes?: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatScore(score?: number): string {
  if (score === undefined || score === null) return '';
  const percent = Math.round(score * 100);
  return `${percent}%`;
}

export function truncateUUID(uuid?: string, chars = 8): string {
  if (!uuid) return '';
  if (uuid.length <= chars * 2) return uuid;
  return `${uuid.substring(0, chars)}...`;
}
