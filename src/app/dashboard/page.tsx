'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCardSkeleton } from '@/components/ui/card-skeleton';
import { CheckCircle2, XCircle, Play, Building2, Users, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { useClient } from '@/components/providers/ClientProvider';
import { ProductTour } from '@/components/layout/ProductTour';

interface DashboardStats {
  automations: {
    successfulRuns: number;
    failedRuns: number;
    activeJobs: number;
    totalExecutions: number;
  };
  system: {
    database: string;
  };
}

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
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid date';

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

export default function DashboardPage() {
  const { currentClient, clients } = useClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldStartTour, setShouldStartTour] = useState(false);
  const [logs, setLogs] = useState<JobLog[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Include organizationId in request if client is selected
        const url = currentClient?.id
          ? `/api/dashboard/stats?organizationId=${currentClient.id}`
          : '/api/dashboard/stats';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          console.error('Failed to fetch stats:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh stats every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [currentClient]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Include organizationId in request if client is selected
        const url = currentClient?.id
          ? `/api/logs?limit=5&organizationId=${currentClient.id}`
          : '/api/logs?limit=5';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
        } else {
          // Silently handle auth errors (will show empty state)
          setLogs([]);
        }
      } catch {
        // Silently handle errors (will show empty state)
        setLogs([]);
      }
    };

    fetchLogs();

    // Refresh logs every 60 seconds
    const interval = setInterval(fetchLogs, 60000);
    return () => clearInterval(interval);
  }, [currentClient]);

  // Check if user should see the tour
  useEffect(() => {
    if (!loading) {
      const tourCompleted = localStorage.getItem('productTourCompleted');
      if (!tourCompleted) {
        // Small delay to ensure DOM is ready
        setTimeout(() => setShouldStartTour(true), 500);
      }
    }
  }, [loading]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          {/* Workflows Section Skeleton */}
          <div className="space-y-3">
            <div className="h-6 w-24 bg-gray-alpha-200 animate-pulse rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>

          {/* Clients Section Skeleton */}
          <div className="space-y-3">
            <div className="h-6 w-24 bg-gray-alpha-200 animate-pulse rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>

          {/* Activity Log Section Skeleton */}
          <div className="space-y-3">
            <div className="h-6 w-32 bg-gray-alpha-200 animate-pulse rounded" />
            <div className="h-64 bg-gray-alpha-200 animate-pulse rounded-lg" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const successfulRuns = stats?.automations?.successfulRuns ?? 0;
  const failedRuns = stats?.automations?.failedRuns ?? 0;
  const activeJobs = stats?.automations?.activeJobs ?? 0;

  // Calculate client stats
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => (c.status || 'active') === 'active').length;
  const totalMembers = clients.reduce((sum, c) => sum + (c.memberCount || 1), 0);

  return (
    <DashboardLayout>
      <ProductTour shouldStart={shouldStartTour} />
      <div className="p-6 space-y-4">
        {/* Workflows Stats */}
        <div className="space-y-3">
          <h2 className="section-title tracking-tight">Workflows</h2>
          <div className="dashboard-stats grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Successful Runs */}
          <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-green-500/30 via-emerald-500/20 to-green-600/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            {/* Status bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500" />
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="card-title">Successful Runs</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="card-stat-large tabular-nums">
                <AnimatedCounter value={successfulRuns} />
              </div>
              <p className="card-label">total successful executions</p>
            </CardContent>
          </Card>

          {/* Failed Runs */}
          <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-red-500/30 via-rose-500/20 to-red-600/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            {/* Status bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-rose-400 to-red-500" />
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-red-400 to-rose-500">
                  <XCircle className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="card-title">Failed Runs</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="card-stat-large tabular-nums">
                <AnimatedCounter value={failedRuns} />
              </div>
              <p className="card-label">total failed executions</p>
            </CardContent>
          </Card>

          {/* Active Jobs */}
          <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-blue-500/30 via-cyan-500/20 to-blue-600/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            {/* Status bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500">
                  <Play className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="card-title">Active Jobs</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="card-stat-large tabular-nums">
                <AnimatedCounter value={activeJobs} />
              </div>
              <p className="card-label">currently enabled</p>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Clients Info */}
        <div className="space-y-3 animate-fade-in">
          <h2 className="section-title tracking-tight">Clients</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Total Clients */}
            <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-primary/5 via-blue-500/3 to-primary/5 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary opacity-80" />
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="card-title">Total Clients</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="card-stat-large tabular-nums">
                  <AnimatedCounter value={totalClients} />
                </div>
                <p className="card-label">organizations managed</p>
              </CardContent>
            </Card>

            {/* Active Clients */}
            <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-green-500/30 via-emerald-500/20 to-green-600/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500" />
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="card-title">Active Clients</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="card-stat-large tabular-nums">
                  <AnimatedCounter value={activeClients} />
                </div>
                <p className="card-label">currently active</p>
              </CardContent>
            </Card>

            {/* Total Members */}
            <Card className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-purple-500/30 via-violet-500/20 to-purple-600/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-violet-400 to-purple-500" />
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="card-title">Total Members</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="card-stat-large tabular-nums">
                  <AnimatedCounter value={totalMembers} />
                </div>
                <p className="card-label">across all clients</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Log */}
        <div className="space-y-3">
          <h2 className="section-title tracking-tight">Recent Activity</h2>
          {logs.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground text-sm">
                No activity logs yet. Run a workflow to get started.
              </p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-lg border-0 bg-gradient-to-br from-primary/5 via-blue-500/3 to-primary/5 backdrop-blur-sm shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary opacity-80" />
              <table className="w-full mt-1">
                <thead>
                  <tr className="border-b border-border/50 bg-background/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/80 tracking-wide w-10">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/80 tracking-wide">
                      Job
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/80 tracking-wide">
                      Message
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground/80 tracking-wide">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-foreground/80 tracking-wide">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const status = log.status;
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
                        key={log.id}
                        className={`border-b border-border/30 transition-all duration-200 ${hoverClass}`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center">
                            {getStatusIcon(log.status)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-sm">{formatJobName(log.jobName)}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-xs text-secondary max-w-md truncate">{log.message}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-right text-xs font-mono text-secondary">
                            {formatDuration(log.duration)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-right text-xs text-secondary tabular-nums">
                            {formatDate(log.createdAt)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
