'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TableSkeleton } from '@/components/ui/card-skeleton';
import { AlertCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useClient } from '@/components/providers/ClientProvider';
import { toast } from 'sonner';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';

interface JobLog {
  id: number;
  jobName: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string | null;
  duration?: number | null;
  createdAt: Date | string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return (
        <div className="p-1 rounded-md bg-gradient-to-br from-green-400 to-emerald-500">
          <CheckCircle2 className="h-3 w-3 text-white" />
        </div>
      );
    case 'error':
      return (
        <div className="p-1 rounded-md bg-gradient-to-br from-red-400 to-rose-500">
          <AlertCircle className="h-3 w-3 text-white" />
        </div>
      );
    case 'warning':
      return (
        <div className="p-1 rounded-md bg-gradient-to-br from-amber-400 to-yellow-500">
          <AlertTriangle className="h-3 w-3 text-white" />
        </div>
      );
    default:
      return (
        <div className="p-1 rounded-md bg-gradient-to-br from-blue-400 to-cyan-500">
          <Clock className="h-3 w-3 text-white" />
        </div>
      );
  }
};

const formatJobName = (name: string) => {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatDuration = (ms?: number | null) => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatDate = (date: Date | string | null) => {
  // Handle null/undefined dates
  if (!date) {
    return '—';
  }

  const d = typeof date === 'string' ? new Date(date) : date;

  // Validate the date
  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Component to display time that auto-updates every minute
function TimeCell({ date }: { date: Date | string | null }) {
  const [formattedTime, setFormattedTime] = useState(() => formatDate(date));

  useEffect(() => {
    // Update the formatted time immediately in case the date prop changed
    setFormattedTime(formatDate(date));

    // Set up interval to update time display every minute
    const interval = setInterval(() => {
      setFormattedTime(formatDate(date));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date]);

  return (
    <div className="text-right text-xs text-secondary tabular-nums">
      {formattedTime}
    </div>
  );
}

const columns: ColumnDef<JobLog>[] = [
  {
    accessorKey: 'status',
    header: () => <div className="w-10">Status</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        {getStatusIcon(row.original.status)}
      </div>
    ),
  },
  {
    accessorKey: 'jobName',
    header: 'Job',
    cell: ({ row }) => (
      <div className="font-medium text-sm">{formatJobName(row.original.jobName)}</div>
    ),
  },
  {
    accessorKey: 'message',
    header: 'Message',
    cell: ({ row }) => {
      const isError = row.original.status === 'error';
      const message = row.original.message;

      const handleCopyError = () => {
        if (isError && message) {
          // Select the text
          const range = document.createRange();
          const selection = window.getSelection();
          const messageElement = document.getElementById(`message-${row.id}`);

          if (messageElement && selection) {
            range.selectNodeContents(messageElement);
            selection.removeAllRanges();
            selection.addRange(range);

            // Copy to clipboard
            navigator.clipboard.writeText(message);
            toast.success('Error copied to clipboard');
          }
        }
      };

      return (
        <div
          id={`message-${row.id}`}
          className={`text-xs text-secondary max-w-2xl truncate ${isError ? 'cursor-pointer hover:text-destructive transition-colors' : ''}`}
          onClick={handleCopyError}
          title={isError ? 'Click to copy error message' : message}
        >
          {message}
        </div>
      );
    },
  },
  {
    accessorKey: 'duration',
    header: () => <div className="text-right">Duration</div>,
    cell: ({ row }) => (
      <div className="text-right text-xs font-mono text-secondary">
        {formatDuration(row.original.duration)}
      </div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: () => <div className="text-right">Time</div>,
    cell: ({ row }) => <TimeCell date={row.original.createdAt} />,
  },
];

export default function ActivityPage() {
  const { currentClient } = useClient();
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      // Include organizationId in request if client is selected
      const url = currentClient?.id
        ? `/api/logs?limit=50&organizationId=${currentClient.id}`
        : '/api/logs?limit=50';
      const response = await fetch(url);
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClient]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs();
    }, 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">

        {/* Activity Table */}
        <div className="animate-slide-up">
          {loading ? (
            <TableSkeleton rows={10} />
          ) : logs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">
                No activity logs yet. Run a workflow to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table */}
              <div className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-primary/5 via-blue-500/3 to-primary/5 backdrop-blur-sm shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary opacity-80" />
                <table className="w-full mt-1">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b border-border/50 bg-background/50">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-4 py-3 text-left text-xs font-semibold text-foreground/80 tracking-wide"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => {
                      const status = row.original.status;
                      const hoverClass =
                        status === 'success'
                          ? 'hover:bg-gradient-to-r hover:from-green-500/5 hover:to-transparent'
                          : status === 'error'
                            ? 'hover:bg-gradient-to-r hover:from-red-500/5 hover:to-transparent'
                            : status === 'warning'
                              ? 'hover:bg-gradient-to-r hover:from-amber-500/5 hover:to-transparent'
                              : 'hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent';

                      return (
                      <tr
                        key={row.id}
                        className={`border-b border-border/30 transition-all duration-200 ${hoverClass}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3.5">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-secondary px-1">
                <div className="font-medium">
                  Showing {table.getRowModel().rows.length} of {logs.length} logs
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-4 py-2 rounded-md border border-border/50 hover:border-primary/30 hover:bg-background/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    Previous
                  </button>
                  <span className="font-medium tabular-nums">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-4 py-2 rounded-md border border-border/50 hover:border-primary/30 hover:bg-background/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
