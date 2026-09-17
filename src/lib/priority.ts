import { Priority, PriorityFilter } from './types';

export const PRIORITY_ORDER: Priority[] = ['arabyatna', 'top', 'high', 'medium', 'low'];

export const PRIORITY_LABELS: Record<Priority, string> = {
  arabyatna: 'عربياتنا',
  top: 'قصوى',
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
};

export const PRIORITY_SECTION_LABELS: Record<Priority, string> = {
  arabyatna: 'عربياتنا',
  top: 'أولوية قصوى',
  high: 'أولوية عالية',
  medium: 'أولوية متوسطة',
  low: 'أولوية منخفضة',
};

export const PRIORITY_ACCENTS: Record<Priority, string> = {
  arabyatna: 'bg-rose-300',
  top: 'bg-accent-yellow',
  high: 'bg-accent-soft',
  medium: 'bg-bg-card',
  low: 'bg-bg-card-hover',
};

export const MAX_DESCRIPTION_WORDS = 1000;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function isPriority(value: string): value is Priority {
  return (PRIORITY_ORDER as string[]).includes(value);
}

export function isPriorityFilter(value: string): value is PriorityFilter {
  return value === 'all' || isPriority(value);
}
