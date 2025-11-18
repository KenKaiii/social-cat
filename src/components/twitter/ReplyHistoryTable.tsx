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
import { Heart, Repeat2, MessageCircle, Eye, ArrowUpDown, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { NoRepliesState, LoadingState } from '@/components/ui/empty-state';
import { logger } from '@/lib/logger';
import { formatDate, formatNumber } from '@/lib/format-utils';

interface TweetReply {
  id: number;
  originalTweet: {
    id: string;
    text: string;
    author: string;
    authorName: string | null;
    likes: number;
    retweets: number;
    replies: number;
    views: number;
  };
  ourReply: {
    text: string;
    tweetId: string | null;
  };
  status: string;
  createdAt: Date | number | null;
  repliedAt: Date | number | null;
}

export function ReplyHistoryTable() {
  const [data, setData] = useState<TweetReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    fetchReplies();
  }, []);

  const fetchReplies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/twitter/replies?limit=100');
      const result = await response.json();
      if (result.success) {
        setData(result.replies);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to fetch replies');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<TweetReply>[] = [
    {
      accessorKey: 'originalTweet.author',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Username
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const author = row.original.originalTweet.author;
        const authorName = row.original.originalTweet.authorName;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="text-xs font-medium text-foreground">{authorName || author}</div>
            <div className="text-[10px] text-secondary">@{author}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'originalTweet.text',
      header: 'Their Tweet',
      cell: ({ row }) => {
        const text = row.original.originalTweet.text;
        return (
          <div className="max-w-[300px]">
            <p className="text-xs text-foreground line-clamp-2">{text}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'originalTweet.likes',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <Heart className="h-3 w-3" />
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="text-xs text-secondary text-center">
            {formatNumber(row.original.originalTweet.likes, '0')}
          </div>
        );
      },
    },
    {
      accessorKey: 'originalTweet.retweets',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <Repeat2 className="h-3 w-3" />
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="text-xs text-secondary text-center">
            {formatNumber(row.original.originalTweet.retweets, '0')}
          </div>
        );
      },
    },
    {
      accessorKey: 'originalTweet.replies',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <MessageCircle className="h-3 w-3" />
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="text-xs text-secondary text-center">
            {formatNumber(row.original.originalTweet.replies, '0')}
          </div>
        );
      },
    },
    {
      accessorKey: 'originalTweet.views',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <Eye className="h-3 w-3" />
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="text-xs text-secondary text-center">
            {formatNumber(row.original.originalTweet.views, '0')}
          </div>
        );
      },
    },
    {
      accessorKey: 'ourReply.text',
      header: 'Our Reply',
      cell: ({ row }) => {
        const text = row.original.ourReply.text;
        const tweetId = row.original.ourReply.tweetId;
        return (
          <div className="max-w-[300px]">
            <p className="text-xs text-foreground line-clamp-2">{text}</p>
            {tweetId && (
              <a
                href={`https://twitter.com/i/web/status/${tweetId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 mt-1"
              >
                View reply <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="text-xs text-secondary whitespace-nowrap">
            {formatDate(row.original.createdAt)}
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
    return <LoadingState message="Hunting for reply history... 🐱🔍" />;
  }

  if (data.length === 0) {
    return <NoRepliesState />;
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by username or tweet text..."
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm h-8 text-xs"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReplies}
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
