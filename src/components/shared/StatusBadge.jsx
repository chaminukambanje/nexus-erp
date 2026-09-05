import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  posted: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200',
  invoiced: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partially_paid: 'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  billed: 'bg-amber-50 text-amber-700 border-amber-200',
  reversed: 'bg-red-50 text-red-600 border-red-200',
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-red-50 text-red-600 border-red-200',
  prospect: 'bg-slate-100 text-slate-600 border-slate-200',
  qualification: 'bg-blue-50 text-blue-700 border-blue-200',
  proposal: 'bg-purple-50 text-purple-700 border-purple-200',
  negotiation: 'bg-amber-50 text-amber-700 border-amber-200',
  closed_won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed_lost: 'bg-red-50 text-red-600 border-red-200',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const style = statusStyles[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <Badge variant="outline" className={cn('text-xs font-medium border capitalize', style)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}