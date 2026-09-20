import { LoadingState } from '@/components/LoadingState';

export default function AdminUsersLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 bg-admin-card rounded skeleton-shine" />
      <LoadingState count={4} variant="list" />
    </div>
  );
}