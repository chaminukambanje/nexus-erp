import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, Pencil, Trash2, Search, Plus, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import ItemSelect from '@/components/sales/ItemSelect';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const defaultQuote = { customer_name: '', quote_date: new Date().toISOString().slice(0, 10), status: 'draft', payment_terms: 'net_30', currency: 'USD', lines: [], subtotal: 0, tax_amount: 0, discount_amount: 0, total_amount: 0 };

export default function SalesQuotes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(defaultQuote);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: quotes = [], isLoading } = useQuery({ queryKey: ['salesQuotes'], queryFn: () => base44.entities.SalesQuote.list('-created_date', 200) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: () => base44.entities.Item.list() });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });

  const recalc = (lines) => {
    const sub = lines.reduce((s, l) => s + (l.line_total || 0), 0);
    const tax = lines.reduce((s, l) => s + ((l.line_total || 0) * (l.tax_percent || 0) / 100), 0);
    return { subtotal: sub, tax_amount: parseFloat(tax.toFixed(2)), total_amount: parseFloat((sub + tax).toFixed(2)) };
  };

  const mutation = useMutation({
    mutationFn: (data) => {
      const num = data.quote_number || `QT-${String(Date.now()).slice(-5)}`;
      return data.id ? base44.entities.SalesQuote.update(data.id, { ...data, quote_number: num }) : base44.entities.SalesQuote.create({ ...data, quote_number: num });
    },
    onSuccess: () => { qc.invalidateQueries(['salesQuotes']); setDialog(false); setForm(defaultQuote); }
  });

  const convertMutation = useMutation({
    mutationFn: async (quote) => {
      const orderNum = `SO-${String(Date.now()).slice(-5)}`;
      const order = await base44.entities.SalesOrder.create({ order_number: orderNum, customer_id: quote.customer_id, customer_name: quote.customer_name, order_date: new Date().toISOString().slice(0, 10), status: 'confirmed', lines: quote.lines, subtotal: quote.subtotal, tax_amount: quote.tax_amount, total_amount: quote.total_amount, payment_terms: quote.payment_terms, currency: quote.currency });
      await base44.entities.SalesQuote.update(quote.id, { ...quote, status: 'converted', converted_to_order_id: order.id });
      return order;
    },
    onSuccess: () => { qc.invalidateQueries(['salesQuotes']); qc.invalidateQueries(['salesOrders']); toast({ title: 'Quote converted to Sales Order' }); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SalesQuote.delete(id),
    onSuccess: () => { qc.invalidateQueries(['salesQuotes']); setDeleteTarget(null); }
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () => setForm(f => ({ ...f, lines: [...(f.lines || []), { item_id: '', item_name: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 0, line_total: 0 }] }));
  const updateLine = (i, k, v) => {
    setForm(f => {
      const lines = [...(f.lines || [])];
      lines[i] = { ...lines[i], [k]: v };
      if (k === 'item_id') {
        const item = items.find(x => x.id === v);
        const course = !item && courses.find(c => `course_${c.id}` === v);
        if (item) { lines[i].item_name = item.name; lines[i].unit_price = item.unit_price || 0; }
        else if (course) { lines[i].item_name = `${course.code} — ${course.name}`; lines[i].unit_price = 0; }
      }
      const qty = lines[i].quantity || 0, price = lines[i].unit_price || 0, disc = lines[i].discount_percent || 0;
      lines[i].line_total = parseFloat((qty * price * (1 - disc / 100)).toFixed(2));
      return { ...f, lines, ...recalc(lines) };
    });
  };
  const removeLine = (i) => setForm(f => { const lines = f.lines.filter((_, idx) => idx !== i); return { ...f, lines, ...recalc(lines) }; });

  const filtered = quotes.filter(q => `${q.customer_name} ${q.quote_number || ''} ${q.status}`.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { header: 'Quote #', render: r => <div><p className="font-medium">{r.quote_number}</p><p className="text-xs text-muted-foreground">{r.customer_name}</p></div> },
    { header: 'Date', render: r => <span className="text-sm">{r.quote_date ? format(new Date(r.quote_date), 'MMM d, yyyy') : '—'}</span> },
    { header: 'Valid Until', render: r => <span className="text-sm">{r.valid_until ? format(new Date(r.valid_until), 'MMM d, yyyy') : '—'}</span> },
    { header: 'Amount', render: r => <span className="font-semibold">${(r.total_amount || 0).toLocaleString()}</span> },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-2">
          {!['converted', 'rejected', 'expired'].includes(r.status) && <Button size="sm" variant="ghost" title="Convert to Order" onClick={e => { e.stopPropagation(); convertMutation.mutate(r); }}><ArrowRight className="w-3.5 h-3.5 text-primary" /></Button>}
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setForm(r); setDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <PageHeader title="Sales Quotes" subtitle="Create and manage customer quotations" actionLabel="New Quote" onAction={() => { setForm(defaultQuote); setDialog(true); }} />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={FileText} title="No sales quotes" description="Create quotations for customers." actionLabel="New Quote" onAction={() => { setForm(defaultQuote); setDialog(true); }} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} />
      )}

      <FormDialog open={dialog} onOpenChange={setDialog} title={form.id ? 'Edit Quote' : 'New Quote'} onSubmit={() => mutation.mutate(form)} isSubmitting={mutation.isPending} size="xl">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Customer" type="select" value={form.customer_id || ''} onChange={v => { const c = customers.find(x => x.id === v); setForm(f => ({ ...f, customer_id: v, customer_name: c?.name || '' })); }} options={customers.map(c => ({ value: c.id, label: c.name }))} required />
          <FormField label="Status" type="select" value={form.status} onChange={v => set('status', v)} options={['draft','sent','accepted','rejected','expired','converted'].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
          <FormField label="Quote Date" type="date" value={form.quote_date} onChange={v => set('quote_date', v)} />
          <FormField label="Valid Until" type="date" value={form.valid_until} onChange={v => set('valid_until', v)} />
          <FormField label="Payment Terms" type="select" value={form.payment_terms} onChange={v => set('payment_terms', v)} options={[{value:'net_15',label:'Net 15'},{value:'net_30',label:'Net 30'},{value:'net_45',label:'Net 45'},{value:'net_60',label:'Net 60'},{value:'due_on_receipt',label:'Due on Receipt'}]} />
          <FormField label="Currency" value={form.currency} onChange={v => set('currency', v)} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Line Items</h4>
            <Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> Add Line</Button>
          </div>
          {(form.lines || []).map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end p-3 rounded-lg bg-muted/50 border">
              <div className="col-span-4">
                <Label className="text-[10px]">Item / Course</Label>
                <ItemSelect value={line.item_id} onChange={v => updateLine(i, 'item_id', v)} items={items} courses={courses} placeholder="Select item or course" />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">Qty</Label>
                <Input type="number" placeholder="Qty" value={line.quantity || ''} onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">Price</Label>
                <Input type="number" placeholder="Price" value={line.unit_price || ''} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
              </div>
              <div className="col-span-1">
                <Label className="text-[10px]">Disc%</Label>
                <Input type="number" placeholder="0" value={line.discount_percent || ''} onChange={e => updateLine(i, 'discount_percent', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
              </div>
              <div className="col-span-1">
                <Label className="text-[10px]">Tax%</Label>
                <Input type="number" placeholder="0" value={line.tax_percent || ''} onChange={e => updateLine(i, 'tax_percent', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
              </div>
              <div className="col-span-1 text-xs font-semibold text-right pt-5">${(line.line_total || 0).toLocaleString()}</div>
              <div className="col-span-1 flex justify-end pt-4"><Button type="button" size="sm" variant="ghost" className="text-destructive h-8 w-8" onClick={() => removeLine(i)}><Trash2 className="w-3 h-3" /></Button></div>
            </div>
          ))}
          <div className="flex justify-end mt-2 text-sm space-x-6">
            <span>Subtotal: <strong>${(form.subtotal || 0).toLocaleString()}</strong></span>
            <span>Tax: <strong>${(form.tax_amount || 0).toLocaleString()}</strong></span>
            <span>Total: <strong>${(form.total_amount || 0).toLocaleString()}</strong></span>
          </div>
        </div>
        <FormField label="Notes" type="textarea" value={form.notes} onChange={v => set('notes', v)} />
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Quote?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}