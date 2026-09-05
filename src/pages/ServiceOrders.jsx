import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Wrench, Pencil, Trash2, Search, Plus } from 'lucide-react';
import { format } from 'date-fns';

const defaultOrder = { customer_name: '', description: '', status: 'pending', priority: 'medium', order_date: new Date().toISOString().slice(0, 10), service_type: '', assigned_to: '', total_amount: 0, currency: 'USD', lines: [] };

export default function ServiceOrders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(defaultOrder);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: orders = [], isLoading } = useQuery({ queryKey: ['serviceOrders'], queryFn: () => base44.entities.ServiceOrder.list('-created_date', 200) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });

  const mutation = useMutation({
    mutationFn: (data) => {
      const num = data.order_number || `SRV-${String(Date.now()).slice(-5)}`;
      const total = (data.lines || []).reduce((s, l) => s + (l.line_total || 0), 0);
      return data.id ? base44.entities.ServiceOrder.update(data.id, { ...data, order_number: num, total_amount: total }) : base44.entities.ServiceOrder.create({ ...data, order_number: num, total_amount: total });
    },
    onSuccess: () => { qc.invalidateQueries(['serviceOrders']); setDialog(false); setForm(defaultOrder); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceOrder.delete(id),
    onSuccess: () => { qc.invalidateQueries(['serviceOrders']); setDeleteTarget(null); }
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addLine = () => setForm(f => ({ ...f, lines: [...(f.lines || []), { description: '', type: 'item', quantity: 1, unit_price: 0, line_total: 0 }] }));
  const updateLine = (i, k, v) => {
    setForm(f => {
      const lines = [...(f.lines || [])];
      lines[i] = { ...lines[i], [k]: v };
      if (k === 'quantity' || k === 'unit_price') lines[i].line_total = (lines[i].quantity || 0) * (lines[i].unit_price || 0);
      return { ...f, lines };
    });
  };
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  const filtered = orders.filter(o => `${o.customer_name} ${o.order_number || ''} ${o.description || ''} ${o.status}`.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { header: 'Order', render: r => <div><p className="font-medium">{r.order_number}</p><p className="text-xs text-muted-foreground">{r.customer_name}</p></div> },
    { header: 'Description', render: r => <span className="text-sm line-clamp-1">{r.description}</span> },
    { header: 'Service Type', render: r => <span className="text-sm">{r.service_type || '—'}</span> },
    { header: 'Priority', render: r => <StatusBadge status={r.priority} /> },
    { header: 'Assigned To', render: r => <span className="text-sm">{r.assigned_to || '—'}</span> },
    { header: 'Date', render: r => <span className="text-sm">{r.order_date ? format(new Date(r.order_date), 'MMM d, yyyy') : '—'}</span> },
    { header: 'Amount', render: r => <span className="font-semibold">${(r.total_amount || 0).toLocaleString()}</span> },
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

  const stats = [
    { label: 'Total', value: orders.length },
    { label: 'Pending', value: orders.filter(o => o.status === 'pending').length },
    { label: 'In Progress', value: orders.filter(o => o.status === 'in_progress').length },
    { label: 'Completed', value: orders.filter(o => o.status === 'completed').length },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <PageHeader title="Service Management" subtitle="Manage service orders and repairs" actionLabel="New Service Order" onAction={() => { setForm(defaultOrder); setDialog(true); }} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => <Card key={s.label}><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></CardContent></Card>)}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Wrench} title="No service orders" description="Create your first service order." actionLabel="New Service Order" onAction={() => { setForm(defaultOrder); setDialog(true); }} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} />
      )}

      <FormDialog open={dialog} onOpenChange={setDialog} title={form.id ? 'Edit Service Order' : 'New Service Order'} onSubmit={() => mutation.mutate(form)} isSubmitting={mutation.isPending} size="xl">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Customer" type="select" value={form.customer_id || ''} onChange={v => { const c = customers.find(x => x.id === v); setForm(f => ({ ...f, customer_id: v, customer_name: c?.name || '' })); }} options={customers.map(c => ({ value: c.id, label: c.name }))} />
          <FormField label="Service Type" value={form.service_type} onChange={v => set('service_type', v)} />
          <FormField label="Priority" type="select" value={form.priority} onChange={v => set('priority', v)} options={['low','medium','high','critical'].map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
          <FormField label="Status" type="select" value={form.status} onChange={v => set('status', v)} options={['pending','in_progress','on_hold','completed','cancelled','invoiced'].map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
          <FormField label="Order Date" type="date" value={form.order_date} onChange={v => set('order_date', v)} />
          <FormField label="Assigned To" value={form.assigned_to} onChange={v => set('assigned_to', v)} />
          <FormField label="Item Description" value={form.item_description} onChange={v => set('item_description', v)} />
          <FormField label="Serial Number" value={form.serial_number} onChange={v => set('serial_number', v)} />
          <FormField label="Description" type="textarea" value={form.description} onChange={v => set('description', v)} className="col-span-2" required />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Service Lines</h4>
            <Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> Add Line</Button>
          </div>
          {(form.lines || []).map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
              <div className="col-span-5"><Input placeholder="Description" value={line.description || ''} onChange={e => updateLine(i, 'description', e.target.value)} className="text-sm" /></div>
              <div className="col-span-2"><Input type="number" placeholder="Qty" value={line.quantity || ''} onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} className="text-sm" /></div>
              <div className="col-span-2"><Input type="number" placeholder="Price" value={line.unit_price || ''} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)} className="text-sm" /></div>
              <div className="col-span-2 text-sm font-medium text-right">${(line.line_total || 0).toLocaleString()}</div>
              <div className="col-span-1"><Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => removeLine(i)}><Trash2 className="w-3 h-3" /></Button></div>
            </div>
          ))}
        </div>
        <FormField label="Notes" type="textarea" value={form.notes} onChange={v => set('notes', v)} />
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Service Order?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}