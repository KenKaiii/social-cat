import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCardSkeleton } from '@/components/ui/card-skeleton';

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Main Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* System Info Skeleton */}
        <div className="space-y-3">
          <div className="h-6 w-24 bg-gray-alpha-200 animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
