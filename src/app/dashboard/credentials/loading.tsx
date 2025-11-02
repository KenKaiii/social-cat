import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';

export default function CredentialsLoading() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Add Button Skeleton */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Credentials Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
