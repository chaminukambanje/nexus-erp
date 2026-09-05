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
import { Receipt, Search, Pencil, Trash2, Plus, X, ArrowRight, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ItemSelect from '@/components/sales/ItemSelect';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const defaultInvoice = {
  invoice_number: '', customer_id: '', customer_name: '', invoice_date: format(new Date(), 'yyyy-MM-dd'),
  due_date: '', status: 'draft', lines: [], subtotal: 0, tax_amount: 0, discount_amount: 0,
  total_amount: 0, amount_paid: 0, balance_due: 0, notes: '', payment_terms: 'net_30', currency: 'USD'
};

const defaultLine = { item_name: '', description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 0, line_total: 0 };

export default function SalesInvoices() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [payDialog, setPayDialog] = useState(null); // invoice to record payment for
  const [payForm, setPayForm] = useState({ amount: 0, method: 'bank_transfer', date: '', notes: '' });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['salesInvoices'],
    queryFn: () => base44.entities.SalesInvoice.list('-created_date'),
  });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: () => base44.entities.Item.list() });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });

  const [form, setForm] = useState(defaultInvoice);

  const recalc = (lines, amountPaid) => {
    const updated = lines.map(l => {
      const sub = l.quantity * l.unit_price;
      const disc = sub * (l.discount_percent || 0) / 100;
      const taxable = sub - disc;
      const tax = taxable * (l.tax_percent || 0) / 100;
      return { ...l, line_total: taxable + tax };
    });
    const subtotal = updated.reduce((s, l) => s + l.quantity * l.unit_price, 0);
    const discount_amount = updated.reduce((s, l) => s + (l.quantity * l.unit_price * (l.discount_percent || 0) / 100), 0);
    const tax_amount = updated.reduce((s, l) => {
      const taxable = l.quantity * l.unit_price * (1 - (l.discount_percent || 0) / 100);
      return s + taxable * (l.tax_percent || 0) / 100;
    }, 0);
    const total_amount = subtotal - discount_amount + tax_amount;
    return { lines: updated, subtotal, discount_amount, tax_amount, total_amount, balance_due: total_amount - (amountPaid || 0) };
  };

  const setLine = (idx, key, val) => {
    const newLines = [...form.lines];
    newLines[idx] = { ...newLines[idx], [key]: val };
    if (key === 'item_id') {
      const item = items.find(i => i.id === val);
      const course = !item && courses.find(c => `course_${c.id}` === val);
      if (item) { newLines[idx].item_name = item.name; newLines[idx].unit_price = item.unit_price || 0; }
      else if (course) { newLines[idx].item_name = `${course.code} — ${course.name}`; newLines[idx].unit_price = 0; newLines[idx].description = course.description || ''; }
    }
    const calced = recalc(newLines, form.amount_paid);
    setForm(prev => ({ ...prev, ...calced }));
  };

  const addLine = () => setForm(prev => ({ ...prev, lines: [...prev.lines, { ...defaultLine }] }));
  const removeLine = (idx) => {
    const calced = recalc(form.lines.filter((_, i) => i !== idx), form.amount_paid);
    setForm(prev => ({ ...prev, ...calced }));
  };

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const num = data.invoice_number || `INV-${String(Date.now()).slice(-6)}`;
      return data.id
        ? base44.entities.SalesInvoice.update(data.id, { ...data, invoice_number: num })
        : base44.entities.SalesInvoice.create({ ...data, invoice_number: num });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salesInvoices'] }); setDialogOpen(false); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SalesInvoice.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salesInvoices'] }); setDeleteId(null); }
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ invoice, amount, method, date, notes }) => {
      const newPaid = (invoice.amount_paid || 0) + amount;
      const newBalance = invoice.total_amount - newPaid;
      const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
      await base44.entities.SalesInvoice.update(invoice.id, {
        ...invoice, amount_paid: newPaid, balance_due: Math.max(0, newBalance), status: newStatus
      });
      await base44.entities.Payment.create({
        payment_number: `PAY-${String(Date.now()).slice(-6)}`,
        type: 'incoming', party_type: 'customer',
        party_id: invoice.customer_id, party_name: invoice.customer_name,
        reference_type: 'invoice', reference_id: invoice.id, reference_number: invoice.invoice_number,
        date: date || new Date().toISOString().slice(0, 10),
        amount, method, status: 'completed', currency: invoice.currency || 'USD', notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setPayDialog(null);
      toast({ title: 'Payment recorded successfully' });
    }
  });

  const openCreate = () => { setForm({ ...defaultInvoice, invoice_date: format(new Date(), 'yyyy-MM-dd') }); setEditData(null); setDialogOpen(true); };
  const openEdit = (inv) => { setForm(inv); setEditData(inv); setDialogOpen(true); };

  const filtered = invoices.filter(i =>
    i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    i.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: 'Invoice #', render: (r) => <span className="font-mono text-xs">{r.invoice_number}</span> },
    { header: 'Customer', render: (r) => <span className="font-medium">{r.customer_name}</span> },
    { header: 'Date', render: (r) => r.invoice_date ? format(new Date(r.invoice_date), 'MMM d, yyyy') : '' },
    { header: 'Due Date', render: (r) => r.due_date ? format(new Date(r.due_date), 'MMM d, yyyy') : '' },
    { header: 'Total', render: (r) => <span className="font-semibold">${(r.total_amount || 0).toLocaleString()}</span> },
    { header: 'Balance', render: (r) => <span className={`font-semibold ${(r.balance_due || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>${(r.balance_due || 0).toLocaleString()}</span> },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: '',
      render: (r) => (
        <div className="flex gap-1">
          {!['paid', 'cancelled'].includes(r.status) && (
            <Button size="icon" variant="ghost" title="Record Payment" onClick={(e) => { e.stopPropagation(); setPayForm({ amount: r.balance_due || r.total_amount || 0, method: 'bank_transfer', date: new Date().toISOString().slice(0, 10), notes: '' }); setPayDialog(r); }}>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
        </div>
      )
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <PageHeader title="Sales Invoices" subtitle="Manage customer invoices and payments" actionLabel="New Invoice" onAction={openCreate}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
      </PageHeader>

      {!isLoading && invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" description="Create your first sales invoice" actionLabel="New Invoice" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Invoice' : 'New Invoice'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending} size="xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium">Customer</Label>
            <Select value={form.customer_id || ''} onValueChange={(v) => {
              const c = customers.find(c => c.id === v);
              setForm(prev => ({ ...prev, customer_id: v, customer_name: c?.name || '' }));
            }}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <FormField label="Status" type="select" value={form.status} onChange={v => setForm(prev => ({ ...prev, status: v }))} options={[
            { value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' }, { value: 'paid', label: 'Paid' },
            { value: 'partially_paid', label: 'Partially Paid' }, { value: 'overdue', label: 'Overdue' }, { value: 'cancelled', label: 'Cancelled' }
          ]} />
          <FormField label="Invoice Date" type="date" value={form.invoice_date} onChange={v => setForm(prev => ({ ...prev, invoice_date: v }))} />
          <FormField label="Due Date" type="date" value={form.due_date} onChange={v => setForm(prev => ({ ...prev, due_date: v }))} />
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
                  <Label className="text-[10px]">Item / Course</Label>
                  <ItemSelect value={line.item_id} onChange={(v) => setLine(idx, 'item_id', v)} items={items} courses={courses} placeholder="Select item or course" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Qty</Label>
                  <Input type="number" value={line.quantity} onChange={e => setLine(idx, 'quantity', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Price</Label>
                  <Input type="number" value={line.unit_price} onChange={e => setLine(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Tax %</Label>
                  <Input type="number" value={line.tax_percent} onChange={e => setLine(idx, 'tax_percent', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Total</Label>
                  <p className="mt-1 h-8 flex items-center text-xs font-semibold">${(line.line_total || 0).toFixed(2)}</p>
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(idx)} className="h-8 w-8"><X className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${(form.subtotal || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${(form.tax_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>${(form.total_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Paid</span><span>${(form.amount_paid || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-red-600 border-t pt-1"><span>Balance Due</span><span>${(form.balance_due || 0).toFixed(2)}</span></div>
          </div>
        </div>

        <FormField label="Notes" type="textarea" value={form.notes} onChange={v => setForm(prev => ({ ...prev, notes: v }))} />
      </FormDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Invoice</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {payDialog && (
        <FormDialog
          open={!!payDialog}
          onOpenChange={() => setPayDialog(null)}
          title={`Record Payment — ${payDialog.invoice_number}`}
          onSubmit={() => recordPaymentMutation.mutate({ invoice: payDialog, ...payForm })}
          isSubmitting={recordPaymentMutation.isPending}
          submitLabel="Record Payment"
          size="sm"
        >
          <div className="p-3 bg-muted/50 rounded-lg text-sm mb-3 space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice Total</span><span className="font-semibold">${(payDialog.total_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span>${(payDialog.amount_paid || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold"><span>Balance Due</span><span className="text-red-600">${(payDialog.balance_due || payDialog.total_amount || 0).toFixed(2)}</span></div>
          </div>
          <FormField label="Amount" type="number" value={payForm.amount} onChange={v => setPayForm(f => ({ ...f, amount: parseFloat(v) || 0 }))} required />
          <FormField label="Payment Date" type="date" value={payForm.date} onChange={v => setPayForm(f => ({ ...f, date: v }))} required />
          <FormField label="Payment Method" type="select" value={payForm.method} onChange={v => setPayForm(f => ({ ...f, method: v }))} options={[
            { value: 'cash', label: 'Cash' }, { value: 'check', label: 'Check' },
            { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'credit_card', label: 'Credit Card' }, { value: 'other', label: 'Other' }
          ]} />
          <FormField label="Notes" type="textarea" value={payForm.notes} onChange={v => setPayForm(f => ({ ...f, notes: v }))} />
        </FormDialog>
      )}
    </div>
  );
}