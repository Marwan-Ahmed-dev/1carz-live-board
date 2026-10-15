import { Suspense } from 'react';
import { LoadingState } from '@/components/LoadingState';

export default function NewBuyerLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState variant="page" />}>{children}</Suspense>;
}