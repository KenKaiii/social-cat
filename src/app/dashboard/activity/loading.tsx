import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TableSkeleton } from '@/components/ui/card-skeleton';

export default function ActivityLoading() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="animate-slide-up">
          <TableSkeleton rows={10} />
        </div>
      </div>
    </DashboardLayout>
  );
}
