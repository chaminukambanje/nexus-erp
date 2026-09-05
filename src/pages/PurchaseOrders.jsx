import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Search, Pencil, Trash2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const defaultOrder = {
  order_number: '', vendor_id: '', vendor_name: '', order_date: format(new Date(), 'yyyy-MM-dd'),
  expected_date: '', status: 'draft', lines: [], subtotal: 0, tax_amount: 0, total_amount: 0, notes: '', currency: 'USD'
};
const defaultLine = { item_id: '', item_name: '', description: '', quantity: 1, unit_cost: 0, tax_percent: 0, line_total: 0 };

export default function PurchaseOrders() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({ queryKey: ['purchaseOrders'], queryFn: () => base44.entities.PurchaseOrder.list('-created_date') });
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => base44.entities.Vendor.list() });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: () => base44.entities.Item.list() });

  const [form, setForm] = useState(defaultOrder);

  const recalc = (lines) => {
    const updated = lines.map(l => {
      const sub = l.quantity * l.unit_cost;
      const tax = sub * (l.tax_percent || 0) / 100;
      return { ...l, line_total: sub + tax };
    });
    const subtotal = updated.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
    const tax_amount = updated.reduce((s, l) => s + l.quantity * l.unit_cost * (l.tax_percent || 0) / 100, 0);
    return { lines: updated, subtotal, tax_amount, total_amount: subtotal + tax_amount };
  };

  const setLine = (idx, key, val) => {
    const newLines = [...form.lines];
    newLines[idx] = { ...newLines[idx], [key]: val };
    if (key === 'item_id') {
      const item = items.find(i => i.id === val);
      if (item) { newLines[idx].item_name = item.name; newLines[idx].unit_cost = item.unit_cost || 0; }
    }
    setForm(prev => ({ ...prev, ...recalc(newLines) }));
  };

  const addLine = () => setForm(prev => ({ ...prev, lines: [...prev.lines, { ...defaultLine }] }));
  const removeLine = (idx) => setForm(prev => ({ ...prev, ...recalc(prev.lines.filter((_, i) => i !== idx)) }));

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const num = data.order_number || `PO-${String(Date.now()).slice(-6)}`;
      return data.id ? base44.entities.PurchaseOrder.update(data.id, { ...data, order_number: num }) : base44.entities.PurchaseOrder.create({ ...data, order_number: num });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); setDialogOpen(false); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); setDeleteId(null); }
  });

  const openCreate = () => { setForm({ ...defaultOrder, order_date: format(new Date(), 'yyyy-MM-dd') }); setEditData(null); setDialogOpen(true); };
  const openEdit = (o) => { setForm(o); setEditData(o); setDialogOpen(true); };

  const filtered = orders.filter(o => o.order_number?.toLowerCase().includes(search.toLowerCase()) || o.vendor_name?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { header: 'PO #', render: (r) => <span className="font-mono text-xs">{r.order_number}</span> },
    { header: 'Vendor', render: (r) => <span className="font-medium">{r.vendor_name}</span> },
    { header: 'Date', render: (r) => r.order_date ? format(new Date(r.order_date), 'MMM d, yyyy') : '' },
    { header: 'Total', render: (r) => <span className="font-semibold">${(r.total_amount || 0).toLocaleString()}</span> },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { header: '', render: (r) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
      </div>
    )},
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <PageHeader title="Purchase Orders" subtitle="Manage vendor purchase orders" actionLabel="New PO" onAction={openCreate}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
      </PageHeader>

      {!isLoading && orders.length === 0 ? (
        <EmptyState icon={Package} title="No purchase orders" description="Create your first purchase order" actionLabel="New PO" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Purchase Order' : 'New Purchase Order'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending} size="xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium">Vendor</Label>
            <Select value={form.vendor_id || ''} onValueChange={(v) => {
              const vend = vendors.find(x => x.id === v);
              setForm(prev => ({ ...prev, vendor_id: v, vendor_name: vend?.name || '' }));
            }}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <FormField label="Status" type="select" value={form.status} onChange={v => setForm(prev => ({ ...prev, status: v }))} options={[
            { value: 'draft', label: 'Draft' }, { value: 'confirmed', label: 'Confirmed' },
            { value: 'received', label: 'Received' }, { value: 'billed', label: 'Billed' }, { value: 'cancelled', label: 'Cancelled' }
          ]} />
          <FormField label="Order Date" type="date" value={form.order_date} onChange={v => setForm(prev => ({ ...prev, order_date: v }))} />
          <FormField label="Expected Date" type="date" value={form.expected_date} onChange={v => setForm(prev => ({ ...prev, expected_date: v }))} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-medium">Line Items</Label>
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1 text-xs"><Plus className="w-3 h-3" />Add Line</Button>
          </div>
          <div className="space-y-2">
            {form.lines?.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/50 border">
                <div className="col-span-3">
                  <Label className="text-[10px]">Item</Label>
                  <Select value={line.item_id || ''} onValueChange={(v) => setLine(idx, 'item_id', v)}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label className="text-[10px]">Qty</Label><Input type="number" value={line.quantity} onChange={e => setLine(idx, 'quantity', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" /></div>
                <div className="col-span-2"><Label className="text-[10px]">Cost</Label><Input type="number" value={line.unit_cost} onChange={e => setLine(idx, 'unit_cost', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" /></div>
                <div className="col-span-2"><Label className="text-[10px]">Tax %</Label><Input type="number" value={line.tax_percent} onChange={e => setLine(idx, 'tax_percent', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" /></div>
                <div className="col-span-2"><Label className="text-[10px]">Total</Label><p className="mt-1 h-8 flex items-center text-xs font-semibold">${(line.line_total || 0).toFixed(2)}</p></div>
                <div className="col-span-1 flex justify-end"><Button type="button" size="icon" variant="ghost" onClick={() => removeLine(idx)} className="h-8 w-8"><X className="w-3 h-3" /></Button></div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${(form.subtotal || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${(form.tax_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>${(form.total_amount || 0).toFixed(2)}</span></div>
          </div>
        </div>
        <FormField label="Notes" type="textarea" value={form.notes} onChange={v => setForm(prev => ({ ...prev, notes: v }))} />
      </FormDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete PO</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}