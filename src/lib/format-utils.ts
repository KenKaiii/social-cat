/**
 * Centralized formatting utilities
 * Consolidates duplicate formatting functions across the codebase
 */

export const formatDuration = (ms: number | null | undefined, fallback: string = 'N/A'): string => {
  if (!ms) return fallback;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const formatDate = (
  date: Date | string | number | null | undefined,
  fallback: string = 'N/A'
): string => {
  if (!date) return fallback;

  const dateObj = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;

  if (isNaN(dateObj.getTime())) return fallback;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

export const formatRelativeTime = (date: Date | string | number | null | undefined): string => {
  if (!date) return 'Never';

  const dateObj = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;

  if (isNaN(dateObj.getTime())) return 'Invalid date';

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return formatDate(dateObj);
};

export const formatNumber = (num: number | null | undefined, fallback: string = '0'): string => {
  if (num === null || num === undefined) return fallback;

  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

export const formatBytes = (bytes: number | null | undefined, decimals: number = 2): string => {
  if (!bytes) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

export const formatPercentage = (value: number, total: number, decimals: number = 1): string => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(decimals)}%`;
};
