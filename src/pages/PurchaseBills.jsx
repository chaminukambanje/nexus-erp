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
import { CreditCard, Search, Pencil, Trash2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const defaultBill = {
  bill_number: '', vendor_id: '', vendor_name: '', bill_date: format(new Date(), 'yyyy-MM-dd'),
  due_date: '', status: 'draft', lines: [], subtotal: 0, tax_amount: 0, total_amount: 0,
  amount_paid: 0, balance_due: 0, notes: '', currency: 'USD'
};
const defaultLine = { item_name: '', description: '', quantity: 1, unit_cost: 0, tax_percent: 0, line_total: 0 };

export default function PurchaseBills() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: bills = [], isLoading } = useQuery({ queryKey: ['purchaseBills'], queryFn: () => base44.entities.PurchaseBill.list('-created_date') });
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => base44.entities.Vendor.list() });

  const [form, setForm] = useState(defaultBill);

  const recalc = (lines, amountPaid) => {
    const updated = lines.map(l => ({ ...l, line_total: l.quantity * l.unit_cost * (1 + (l.tax_percent || 0) / 100) }));
    const subtotal = updated.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
    const tax_amount = updated.reduce((s, l) => s + l.quantity * l.unit_cost * (l.tax_percent || 0) / 100, 0);
    const total_amount = subtotal + tax_amount;
    return { lines: updated, subtotal, tax_amount, total_amount, balance_due: total_amount - (amountPaid || 0) };
  };

  const setLine = (idx, key, val) => {
    const newLines = [...form.lines];
    newLines[idx] = { ...newLines[idx], [key]: val };
    setForm(prev => ({ ...prev, ...recalc(newLines, prev.amount_paid) }));
  };
  const addLine = () => setForm(prev => ({ ...prev, lines: [...prev.lines, { ...defaultLine }] }));
  const removeLine = (idx) => setForm(prev => ({ ...prev, ...recalc(prev.lines.filter((_, i) => i !== idx), prev.amount_paid) }));

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const num = data.bill_number || `BILL-${String(Date.now()).slice(-6)}`;
      return data.id ? base44.entities.PurchaseBill.update(data.id, { ...data, bill_number: num }) : base44.entities.PurchaseBill.create({ ...data, bill_number: num });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseBills'] }); setDialogOpen(false); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseBill.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchaseBills'] }); setDeleteId(null); }
  });

  const openCreate = () => { setForm({ ...defaultBill, bill_date: format(new Date(), 'yyyy-MM-dd') }); setEditData(null); setDialogOpen(true); };
  const openEdit = (b) => { setForm(b); setEditData(b); setDialogOpen(true); };
  const filtered = bills.filter(b => b.bill_number?.toLowerCase().includes(search.toLowerCase()) || b.vendor_name?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { header: 'Bill #', render: (r) => <span className="font-mono text-xs">{r.bill_number}</span> },
    { header: 'Vendor', render: (r) => <span className="font-medium">{r.vendor_name}</span> },
    { header: 'Date', render: (r) => r.bill_date ? format(new Date(r.bill_date), 'MMM d, yyyy') : '' },
    { header: 'Total', render: (r) => <span className="font-semibold">${(r.total_amount || 0).toLocaleString()}</span> },
    { header: 'Balance', render: (r) => <span className={`font-semibold ${(r.balance_due || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>${(r.balance_due || 0).toLocaleString()}</span> },
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
      <PageHeader title="Purchase Bills" subtitle="Manage vendor bills and payments" actionLabel="New Bill" onAction={openCreate}>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" /></div>
      </PageHeader>

      {!isLoading && bills.length === 0 ? (
        <EmptyState icon={CreditCard} title="No bills yet" description="Create your first vendor bill" actionLabel="New Bill" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Bill' : 'New Bill'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending} size="xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label className="text-xs font-medium">Vendor</Label>
            <Select value={form.vendor_id || ''} onValueChange={(v) => { const vend = vendors.find(x => x.id === v); setForm(prev => ({ ...prev, vendor_id: v, vendor_name: vend?.name || '' })); }}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <FormField label="Status" type="select" value={form.status} onChange={v => setForm(prev => ({ ...prev, status: v }))} options={[
            { value: 'draft', label: 'Draft' }, { value: 'received', label: 'Received' }, { value: 'paid', label: 'Paid' },
            { value: 'partially_paid', label: 'Partially Paid' }, { value: 'overdue', label: 'Overdue' }, { value: 'cancelled', label: 'Cancelled' }
          ]} />
          <FormField label="Bill Date" type="date" value={form.bill_date} onChange={v => setForm(prev => ({ ...prev, bill_date: v }))} />
          <FormField label="Due Date" type="date" value={form.due_date} onChange={v => setForm(prev => ({ ...prev, due_date: v }))} />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2"><Label className="text-xs font-medium">Line Items</Label><Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1 text-xs"><Plus className="w-3 h-3" />Add</Button></div>
          {form.lines?.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/50 border mb-2">
              <div className="col-span-4"><Label className="text-[10px]">Description</Label><Input value={line.item_name} onChange={e => setLine(idx, 'item_name', e.target.value)} className="mt-1 h-8 text-xs" placeholder="Item" /></div>
              <div className="col-span-2"><Label className="text-[10px]">Qty</Label><Input type="number" value={line.quantity} onChange={e => setLine(idx, 'quantity', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" /></div>
              <div className="col-span-2"><Label className="text-[10px]">Cost</Label><Input type="number" value={line.unit_cost} onChange={e => setLine(idx, 'unit_cost', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" /></div>
              <div className="col-span-2"><Label className="text-[10px]">Total</Label><p className="mt-1 h-8 flex items-center text-xs font-semibold">${(line.line_total || 0).toFixed(2)}</p></div>
              <div className="col-span-2 flex justify-end"><Button type="button" size="icon" variant="ghost" onClick={() => removeLine(idx)} className="h-8 w-8"><X className="w-3 h-3" /></Button></div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${(form.subtotal || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${(form.tax_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>${(form.total_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-red-600 border-t pt-1"><span>Balance</span><span>${(form.balance_due || 0).toFixed(2)}</span></div>
          </div>
        </div>
        <FormField label="Notes" type="textarea" value={form.notes} onChange={v => setForm(prev => ({ ...prev, notes: v }))} />
      </FormDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Bill</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}