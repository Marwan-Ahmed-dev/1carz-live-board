import { LoadingState } from '@/components/LoadingState';

export default function MarketEntryLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <LoadingState variant="page" />
    </div>
  );
}