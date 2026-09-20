import { LoadingState } from '@/components/LoadingState';

export default function AdminDashboardLoading() {
  return (
    <div className="min-h-screen bg-admin-bg text-admin-text flex items-center justify-center">
      <LoadingState variant="page" />
    </div>
  );
}