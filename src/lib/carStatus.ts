import { CarStatus } from './types';

export interface StatusMeta {
  label: string;
  lightClass: string;
  adminClass: string;
  pickerClass: string;
}

export const STATUS_META: Record<CarStatus, StatusMeta> = {
  active: {
    label: 'متاحة',
    lightClass: 'bg-green-600 text-white',
    adminClass: 'bg-green-500 text-slate-900',
    pickerClass: 'bg-green-600 text-white border-green-700',
  },
  reserved: {
    label: 'محجوزة',
    lightClass: 'bg-orange-500 text-white',
    adminClass: 'bg-orange-400 text-slate-900',
    pickerClass: 'bg-orange-500 text-white border-orange-600',
  },
  sold: {
    label: 'مباعة',
    lightClass: 'bg-red-600 text-white',
    adminClass: 'bg-red-500 text-white',
    pickerClass: 'bg-red-600 text-white border-red-700',
  },
  inactive: {
    label: 'غير معروضة',
    lightClass: 'bg-slate-500 text-white',
    adminClass: 'bg-slate-500 text-white',
    pickerClass: 'bg-slate-500 text-white border-slate-600',
  },
};

export const STATUS_OPTIONS: Array<{ value: CarStatus; label: string }> = [
  { value: 'active', label: STATUS_META.active.label },
  { value: 'reserved', label: STATUS_META.reserved.label },
  { value: 'sold', label: STATUS_META.sold.label },
];

export function getStatusMeta(status: CarStatus | string): StatusMeta {
  return STATUS_META[status as CarStatus] || STATUS_META.active;
}

export function getStatusLabel(status: CarStatus | string): string {
  return getStatusMeta(status).label;
}
