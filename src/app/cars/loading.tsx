import { LoadingState } from '@/components/LoadingState';

export default function CarsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <LoadingState variant="page" />
    </div>
  );
}