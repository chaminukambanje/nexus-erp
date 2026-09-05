import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { DollarSign, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';

export default function BillingStatementTab({ invoices }) {
  const totalBilled = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const balance = totalBilled - totalPaid;
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const outstandingInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><DollarSign className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Billed</p><p className="text-xl font-bold">${totalBilled.toFixed(2)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Paid</p><p className="text-xl font-bold text-emerald-600">${totalPaid.toFixed(2)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-xl font-bold text-red-600">${balance.toFixed(2)}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Invoice History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No invoices on record.</p>
          ) : (
            <div className="divide-y">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      Issued: {inv.invoice_date ? format(new Date(inv.invoice_date), 'MMM d, yyyy') : '—'}
                      {inv.due_date && ` · Due: ${format(new Date(inv.due_date), 'MMM d, yyyy')}`}
                    </p>
                    {inv.lines && inv.lines.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">{inv.lines.map(l => l.item_name || l.description).join(', ')}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium">${(inv.total_amount || 0).toFixed(2)}</span>
                    {inv.amount_paid > 0 && inv.amount_paid < inv.total_amount && (
                      <span className="text-xs text-emerald-600">Paid ${inv.amount_paid.toFixed(2)}</span>
                    )}
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {balance > 0 && (
            <div className="px-4 py-3 bg-red-50 border-t flex justify-between font-semibold">
              <span className="text-red-700">Outstanding Balance</span>
              <span className="text-red-600">${balance.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}