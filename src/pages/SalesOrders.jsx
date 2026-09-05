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
import { ShoppingCart, Search, Pencil, Trash2, Plus, X, ArrowRight } from 'lucide-react';
import ItemSelect from '@/components/sales/ItemSelect';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const defaultOrder = {
  order_number: '', customer_id: '', customer_name: '', order_date: format(new Date(), 'yyyy-MM-dd'),
  due_date: '', status: 'draft', lines: [], subtotal: 0, tax_amount: 0, discount_amount: 0,
  total_amount: 0, notes: '', payment_terms: 'net_30', currency: 'USD'
};

const defaultLine = { item_id: '', item_name: '', description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 0, line_total: 0 };

export default function SalesOrders() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: () => base44.entities.SalesOrder.list('-created_date'),
  });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: () => base44.entities.Item.list() });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });

  const [form, setForm] = useState(defaultOrder);

  const recalc = (lines) => {
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
    return { lines: updated, subtotal, discount_amount, tax_amount, total_amount: subtotal - discount_amount + tax_amount };
  };

  const setLine = (idx, key, val) => {
    const newLines = [...form.lines];
    newLines[idx] = { ...newLines[idx], [key]: val };
    if (key === 'item_id') {
      const item = items.find(i => i.id === val);
      const course = !item && courses.find(c => `course_${c.id}` === val);
      if (item) {
        newLines[idx].item_name = item.name;
        newLines[idx].unit_price = item.unit_price || 0;
        newLines[idx].description = item.description || '';
      } else if (course) {
        newLines[idx].item_name = `${course.code} — ${course.name}`;
        newLines[idx].unit_price = 0;
        newLines[idx].description = course.description || '';
      }
    }
    const calced = recalc(newLines);
    setForm(prev => ({ ...prev, ...calced }));
  };

  const addLine = () => setForm(prev => ({ ...prev, lines: [...prev.lines, { ...defaultLine }] }));
  const removeLine = (idx) => {
    const newLines = form.lines.filter((_, i) => i !== idx);
    const calced = recalc(newLines);
    setForm(prev => ({ ...prev, ...calced }));
  };

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const num = data.order_number || `SO-${String(Date.now()).slice(-6)}`;
      return data.id
        ? base44.entities.SalesOrder.update(data.id, { ...data, order_number: num })
        : base44.entities.SalesOrder.create({ ...data, order_number: num });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salesOrders'] }); setDialogOpen(false); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SalesOrder.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salesOrders'] }); setDeleteId(null); }
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async (order) => {
      const invoiceNum = `INV-${String(Date.now()).slice(-6)}`;
      const today = format(new Date(), 'yyyy-MM-dd');
      const invoice = await base44.entities.SalesInvoice.create({
        invoice_number: invoiceNum, customer_id: order.customer_id, customer_name: order.customer_name,
        invoice_date: today, status: 'draft', lines: order.lines, subtotal: order.subtotal,
        tax_amount: order.tax_amount, discount_amount: order.discount_amount,
        total_amount: order.total_amount, amount_paid: 0, balance_due: order.total_amount,
        payment_terms: order.payment_terms, currency: order.currency, sales_order_id: order.id,
        notes: order.notes
      });
      await base44.entities.SalesOrder.update(order.id, { ...order, status: 'invoiced' });
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
      toast({ title: 'Order converted to Invoice' });
    }
  });

  const openCreate = () => {
    setForm({ ...defaultOrder, order_date: format(new Date(), 'yyyy-MM-dd') });
    setEditData(null); setDialogOpen(true);
  };
  const openEdit = (o) => { setForm(o); setEditData(o); setDialogOpen(true); };

  const filtered = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: 'Order #', render: (r) => <span className="font-mono text-xs">{r.order_number}</span> },
    { header: 'Customer', render: (r) => <span className="font-medium">{r.customer_name}</span> },
    { header: 'Date', render: (r) => r.order_date ? format(new Date(r.order_date), 'MMM d, yyyy') : '' },
    { header: 'Total', render: (r) => <span className="font-semibold">${(r.total_amount || 0).toLocaleString()}</span> },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: '',
      render: (r) => (
        <div className="flex gap-1">
          {r.status !== 'invoiced' && r.status !== 'cancelled' && (
            <Button size="icon" variant="ghost" title="Convert to Invoice" onClick={(e) => { e.stopPropagation(); convertToInvoiceMutation.mutate(r); }}>
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
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
      <PageHeader title="Sales Orders" subtitle="Manage customer orders" actionLabel="New Order" onAction={openCreate}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
      </PageHeader>

      {!isLoading && orders.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No sales orders" description="Create your first sales order" actionLabel="New Order" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Sales Order' : 'New Sales Order'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending} size="xl">
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
          <FormField label="Order Date" type="date" value={form.order_date} onChange={v => setForm(prev => ({ ...prev, order_date: v }))} />
          <FormField label="Due Date" type="date" value={form.due_date} onChange={v => setForm(prev => ({ ...prev, due_date: v }))} />
          <FormField label="Status" type="select" value={form.status} onChange={v => setForm(prev => ({ ...prev, status: v }))} options={[
            { value: 'draft', label: 'Draft' }, { value: 'confirmed', label: 'Confirmed' },
            { value: 'shipped', label: 'Shipped' }, { value: 'invoiced', label: 'Invoiced' }, { value: 'cancelled', label: 'Cancelled' }
          ]} />
        </div>

        {/* Line Items */}
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

        {/* Totals */}
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
          <AlertDialogHeader><AlertDialogTitle>Delete Order</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}