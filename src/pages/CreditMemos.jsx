import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileMinus, Pencil, Trash2, Search, Plus } from 'lucide-react';
import { format } from 'date-fns';

const defaultMemo = { type: 'sales', customer_name: '', vendor_name: '', memo_date: new Date().toISOString().slice(0, 10), status: 'draft', reason: '', lines: [], subtotal: 0, tax_amount: 0, total_amount: 0, currency: 'USD' };

export default function CreditMemos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(defaultMemo);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tab, setTab] = useState('all');

  const { data: memos = [], isLoading } = useQuery({ queryKey: ['creditMemos'], queryFn: () => base44.entities.CreditMemo.list('-created_date', 200) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => base44.entities.Vendor.list() });

  const recalc = (lines) => {
    const sub = lines.reduce((s, l) => s + (l.line_total || 0), 0);
    return { subtotal: sub, total_amount: sub };
  };

  const mutation = useMutation({
    mutationFn: (data) => {
      const num = data.memo_number || `CM-${String(Date.now()).slice(-5)}`;
      return data.id ? base44.entities.CreditMemo.update(data.id, { ...data, memo_number: num }) : base44.entities.CreditMemo.create({ ...data, memo_number: num });
    },
    onSuccess: () => { qc.invalidateQueries(['creditMemos']); setDialog(false); setForm(defaultMemo); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CreditMemo.delete(id),
    onSuccess: () => { qc.invalidateQueries(['creditMemos']); setDeleteTarget(null); }
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () => setForm(f => ({ ...f, lines: [...(f.lines || []), { item_name: '', description: '', quantity: 1, unit_price: 0, line_total: 0 }] }));
  const updateLine = (i, k, v) => {
    setForm(f => {
      const lines = [...(f.lines || [])];
      lines[i] = { ...lines[i], [k]: v };
      if (k === 'quantity' || k === 'unit_price') lines[i].line_total = (lines[i].quantity || 0) * (lines[i].unit_price || 0);
      return { ...f, lines, ...recalc(lines) };
    });
  };
  const removeLine = (i) => setForm(f => { const lines = f.lines.filter((_, idx) => idx !== i); return { ...f, lines, ...recalc(lines) }; });

  const displayData = memos.filter(m => {
    const byTab = tab === 'all' || m.type === tab;
    const q = search.toLowerCase();
    return byTab && `${m.memo_number || ''} ${m.customer_name || ''} ${m.vendor_name || ''} ${m.status}`.toLowerCase().includes(q);
  });

  const columns = [
    { header: 'Memo #', render: r => <div><p className="font-medium">{r.memo_number}</p><p className="text-xs text-muted-foreground">{r.type === 'sales' ? r.customer_name : r.vendor_name}</p></div> },
    { header: 'Type', render: r => <span className="capitalize text-sm font-medium">{r.type}</span> },
    { header: 'Date', render: r => <span className="text-sm">{r.memo_date ? format(new Date(r.memo_date), 'MMM d, yyyy') : '—'}</span> },
    { header: 'Reason', render: r => <span className="text-sm text-muted-foreground line-clamp-1">{r.reason || '—'}</span> },
    { header: 'Amount', render: r => <span className="font-semibold text-red-600">(${(r.total_amount || 0).toLocaleString()})</span> },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setForm(r); setDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <PageHeader title="Credit Memos" subtitle="Manage sales and purchase credit notes" actionLabel="New Credit Memo" onAction={() => { setForm(defaultMemo); setDialog(true); }} />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="purchase">Purchase</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search memos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <TabsContent value={tab} className="mt-4">
          {displayData.length === 0 && !isLoading ? (
            <EmptyState icon={FileMinus} title="No credit memos" description="Issue credit notes for returns and corrections." actionLabel="New Credit Memo" onAction={() => { setForm(defaultMemo); setDialog(true); }} />
          ) : (
            <DataTable columns={columns} data={displayData} isLoading={isLoading} />
          )}
        </TabsContent>
      </Tabs>

      <FormDialog open={dialog} onOpenChange={setDialog} title={form.id ? 'Edit Credit Memo' : 'New Credit Memo'} onSubmit={() => mutation.mutate(form)} isSubmitting={mutation.isPending} size="xl">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type" type="select" value={form.type} onChange={v => set('type', v)} options={[{ value: 'sales', label: 'Sales Credit Memo' }, { value: 'purchase', label: 'Purchase Credit Memo' }]} />
          <FormField label="Status" type="select" value={form.status} onChange={v => set('status', v)} options={['draft','posted','applied','cancelled'].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
          {form.type === 'sales' ? (
            <FormField label="Customer" type="select" value={form.customer_id || ''} onChange={v => { const c = customers.find(x => x.id === v); setForm(f => ({ ...f, customer_id: v, customer_name: c?.name || '' })); }} options={customers.map(c => ({ value: c.id, label: c.name }))} />
          ) : (
            <FormField label="Vendor" type="select" value={form.vendor_id || ''} onChange={v => { const vnd = vendors.find(x => x.id === v); setForm(f => ({ ...f, vendor_id: v, vendor_name: vnd?.name || '' })); }} options={vendors.map(v => ({ value: v.id, label: v.name }))} />
          )}
          <FormField label="Memo Date" type="date" value={form.memo_date} onChange={v => set('memo_date', v)} />
          <FormField label="Original Invoice #" value={form.original_invoice_number} onChange={v => set('original_invoice_number', v)} />
          <FormField label="Reason" value={form.reason} onChange={v => set('reason', v)} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Line Items</h4>
            <Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> Add Line</Button>
          </div>
          {(form.lines || []).map((line, i) => (
            <div key={i} className="grid grid-cols-10 gap-2 mb-2 items-end">
              <div className="col-span-4"><Input placeholder="Item/Description" value={line.item_name || ''} onChange={e => updateLine(i, 'item_name', e.target.value)} className="text-sm" /></div>
              <div className="col-span-2"><Input type="number" placeholder="Qty" value={line.quantity || ''} onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} className="text-sm" /></div>
              <div className="col-span-2"><Input type="number" placeholder="Price" value={line.unit_price || ''} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} className="text-sm" /></div>
              <div className="col-span-1 text-xs font-medium text-right">${(line.line_total || 0).toLocaleString()}</div>
              <div className="col-span-1"><Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => removeLine(i)}><Trash2 className="w-3 h-3" /></Button></div>
            </div>
          ))}
          <div className="flex justify-end mt-2 text-sm">
            <span>Total Credit: <strong className="text-red-600">(${(form.total_amount || 0).toLocaleString()})</strong></span>
          </div>
        </div>
        <FormField label="Notes" type="textarea" value={form.notes} onChange={v => set('notes', v)} />
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Credit Memo?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}