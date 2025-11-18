'use client';

import { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, ChevronLeft, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import { LoadingState } from '@/components/ui/empty-state';
import { logger } from '@/lib/logger';
import { formatDate } from '@/lib/format-utils';

interface PostedThread {
  id: number;
  content: string;
  tweetId: string | null;
  status: string;
  postedAt: Date | number | null;
  createdAt: Date | number | null;
}

export function PostedThreadsHistoryTable() {
  const [data, setData] = useState<PostedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/twitter/threads?limit=100');
      const result = await response.json();
      if (result.success) {
        setData(result.threads);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to fetch threads');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<PostedThread>[] = [
    {
      accessorKey: 'content',
      header: 'Thread Content',
      cell: ({ row }) => {
        const content = row.original.content;
        return (
          <div className="max-w-[500px]">
            <p className="text-xs text-foreground line-clamp-3 whitespace-pre-wrap">{content}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className={`text-xs font-medium ${
            status === 'posted' ? 'text-green-600 dark:text-green-400' :
            status === 'draft' ? 'text-yellow-600 dark:text-yellow-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            {status.toUpperCase()}
          </div>
        );
      },
    },
    {
      accessorKey: 'tweetId',
      header: 'Link',
      cell: ({ row }) => {
        const tweetId = row.original.tweetId;
        if (!tweetId) {
          return <div className="text-xs text-secondary">N/A</div>;
        }
        return (
          <a
            href={`https://twitter.com/i/web/status/${tweetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            View thread <ExternalLink className="h-3 w-3" />
          </a>
        );
      },
    },
    {
      accessorKey: 'postedAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Posted Date
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="text-xs text-secondary whitespace-nowrap">
            {formatDate(row.original.postedAt)}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (loading) {
    return <LoadingState message="Fetching thread history... 🐱🔍" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <FileText className="h-12 w-12 text-secondary mb-4" />
        <h3 className="text-lg font-semibold mb-2">No threads posted yet</h3>
        <p className="text-sm text-secondary max-w-sm">
          Once you start posting threads, they&apos;ll appear here for you to review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search thread content..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm h-8 text-xs"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchThreads}
          className="h-8 px-3 text-xs"
        >
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border bg-surface overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-9">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="text-sm text-secondary">No results found</div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-secondary">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 px-3 text-xs"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <div className="text-xs text-secondary">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 px-3 text-xs"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
