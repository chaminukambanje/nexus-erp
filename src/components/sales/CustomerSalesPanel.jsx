import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import StatusBadge from '@/components/shared/StatusBadge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, CheckCircle, Plus, Trash2, FileText, ShoppingCart, Receipt } from 'lucide-react';
import ItemSelect from '@/components/sales/ItemSelect';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const defaultLine = { item_name: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 0, line_total: 0 };

function recalc(lines) {
  const updated = lines.map(l => {
    const sub = (l.quantity || 0) * (l.unit_price || 0);
    const disc = sub * ((l.discount_percent || 0) / 100);
    const taxable = sub - disc;
    const tax = taxable * ((l.tax_percent || 0) / 100);
    return { ...l, line_total: parseFloat((taxable + tax).toFixed(2)) };
  });
  const subtotal = updated.reduce((s, l) => s + (l.quantity || 0) * (l.unit_price || 0), 0);
  const discount_amount = updated.reduce((s, l) => s + (l.quantity || 0) * (l.unit_price || 0) * ((l.discount_percent || 0) / 100), 0);
  const tax_amount = updated.reduce((s, l) => {
    const taxable = (l.quantity || 0) * (l.unit_price || 0) * (1 - (l.discount_percent || 0) / 100);
    return s + taxable * ((l.tax_percent || 0) / 100);
  }, 0);
  const total_amount = subtotal - discount_amount + tax_amount;
  return { lines: updated, subtotal, discount_amount, tax_amount, total_amount };
}

export default function CustomerSalesPanel({ customerId, customerName }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [newDocDialog, setNewDocDialog] = useState(null); // 'quote' | 'order' | 'invoice'
  const [docForm, setDocForm] = useState({ lines: [], notes: '', payment_terms: 'net_30', currency: 'USD' });
  const [payDialog, setPayDialog] = useState(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: 'bank_transfer', date: new Date().toISOString().slice(0, 10), notes: '' });

  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: () => base44.entities.Item.list() });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: quotes = [] } = useQuery({ queryKey: ['salesQuotes'], queryFn: () => base44.entities.SalesQuote.list('-created_date', 200) });
  const { data: orders = [] } = useQuery({ queryKey: ['salesOrders'], queryFn: () => base44.entities.SalesOrder.list('-created_date', 200) });
  const { data: invoices = [] } = useQuery({ queryKey: ['salesInvoices'], queryFn: () => base44.entities.SalesInvoice.list('-created_date', 200) });

  const custQuotes = quotes.filter(q => q.customer_id === customerId);
  const custOrders = orders.filter(o => o.customer_id === customerId);
  const custInvoices = invoices.filter(i => i.customer_id === customerId);

  const setLine = (i, k, v) => {
    setDocForm(f => {
      const lines = [...f.lines];
      lines[i] = { ...lines[i], [k]: v };
      if (k === 'item_id') {
        const item = items.find(x => x.id === v);
        const course = !item && courses.find(c => `course_${c.id}` === v);
        if (item) { lines[i].item_name = item.name; lines[i].unit_price = item.unit_price || 0; }
        else if (course) { lines[i].item_name = `${course.code} — ${course.name}`; lines[i].unit_price = 0; lines[i].description = course.description || ''; }
      }
      return { ...f, ...recalc(lines) };
    });
  };
  const addLine = () => setDocForm(f => ({ ...f, lines: [...f.lines, { ...defaultLine }] }));
  const removeLine = (i) => setDocForm(f => { const lines = f.lines.filter((_, idx) => idx !== i); return { ...f, ...recalc(lines) }; });
  const set = (k, v) => setDocForm(f => ({ ...f, [k]: v }));

  const today = new Date().toISOString().slice(0, 10);

  const createDocMutation = useMutation({
    mutationFn: async ({ type, form }) => {
      if (type === 'quote') {
        return base44.entities.SalesQuote.create({
          quote_number: `QT-${String(Date.now()).slice(-5)}`,
          customer_id: customerId, customer_name: customerName,
          quote_date: today, status: 'draft', ...form
        });
      } else if (type === 'order') {
        return base44.entities.SalesOrder.create({
          order_number: `SO-${String(Date.now()).slice(-6)}`,
          customer_id: customerId, customer_name: customerName,
          order_date: today, status: 'confirmed', ...form
        });
      } else {
        return base44.entities.SalesInvoice.create({
          invoice_number: `INV-${String(Date.now()).slice(-6)}`,
          customer_id: customerId, customer_name: customerName,
          invoice_date: today, status: 'draft',
          amount_paid: 0, balance_due: form.total_amount || 0, ...form
        });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['salesQuotes']); qc.invalidateQueries(['salesOrders']); qc.invalidateQueries(['salesInvoices']);
      setNewDocDialog(null);
      toast({ title: `${vars.type === 'quote' ? 'Quote' : vars.type === 'order' ? 'Order' : 'Invoice'} created` });
    }
  });

  const convertQuoteMutation = useMutation({
    mutationFn: async (quote) => {
      const order = await base44.entities.SalesOrder.create({ order_number: `SO-${String(Date.now()).slice(-6)}`, customer_id: quote.customer_id, customer_name: quote.customer_name, order_date: today, status: 'confirmed', lines: quote.lines, subtotal: quote.subtotal, tax_amount: quote.tax_amount, total_amount: quote.total_amount, payment_terms: quote.payment_terms, currency: quote.currency });
      await base44.entities.SalesQuote.update(quote.id, { ...quote, status: 'converted', converted_to_order_id: order.id });
    },
    onSuccess: () => { qc.invalidateQueries(['salesQuotes']); qc.invalidateQueries(['salesOrders']); toast({ title: 'Quote converted to Order' }); }
  });

  const convertOrderMutation = useMutation({
    mutationFn: async (order) => {
      const invoice = await base44.entities.SalesInvoice.create({ invoice_number: `INV-${String(Date.now()).slice(-6)}`, customer_id: order.customer_id, customer_name: order.customer_name, invoice_date: today, status: 'draft', lines: order.lines, subtotal: order.subtotal, tax_amount: order.tax_amount, discount_amount: order.discount_amount, total_amount: order.total_amount, amount_paid: 0, balance_due: order.total_amount, payment_terms: order.payment_terms, currency: order.currency, sales_order_id: order.id });
      await base44.entities.SalesOrder.update(order.id, { ...order, status: 'invoiced' });
      return invoice;
    },
    onSuccess: () => { qc.invalidateQueries(['salesOrders']); qc.invalidateQueries(['salesInvoices']); toast({ title: 'Order converted to Invoice' }); }
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ invoice, amount, method, date, notes }) => {
      const newPaid = (invoice.amount_paid || 0) + amount;
      const newBalance = invoice.total_amount - newPaid;
      const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
      await base44.entities.SalesInvoice.update(invoice.id, { ...invoice, amount_paid: newPaid, balance_due: Math.max(0, newBalance), status: newStatus });
      await base44.entities.Payment.create({ payment_number: `PAY-${String(Date.now()).slice(-6)}`, type: 'incoming', party_type: 'customer', party_id: invoice.customer_id, party_name: invoice.customer_name, reference_type: 'invoice', reference_id: invoice.id, reference_number: invoice.invoice_number, date: date || today, amount, method, status: 'completed', currency: invoice.currency || 'USD', notes });
    },
    onSuccess: () => { qc.invalidateQueries(['salesInvoices']); qc.invalidateQueries(['payments']); setPayDialog(null); toast({ title: 'Payment recorded' }); }
  });

  const openNew = (type) => {
    setDocForm({ lines: [], notes: '', payment_terms: 'net_30', currency: 'USD', subtotal: 0, tax_amount: 0, discount_amount: 0, total_amount: 0 });
    setNewDocDialog(type);
  };

  const LineItemEditor = () => (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs font-medium">Line Items</Label>
        <Button type="button" size="sm" variant="outline" onClick={addLine} className="gap-1 text-xs"><Plus className="w-3 h-3" />Add Line</Button>
      </div>
      <div className="space-y-2">
        {docForm.lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg bg-muted/50 border">
            <div className="col-span-4">
              <Label className="text-[10px]">Item / Course</Label>
              <ItemSelect value={line.item_id} onChange={(v) => setLine(idx, 'item_id', v)} items={items} courses={courses} placeholder="Select item or course" />
            </div>
            <div className="col-span-2"><Label className="text-[10px]">Qty</Label><Input type="number" value={line.quantity} onChange={e => setLine(idx, 'quantity', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" /></div>
            <div className="col-span-2"><Label className="text-[10px]">Price</Label><Input type="number" value={line.unit_price} onChange={e => setLine(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" /></div>
            <div className="col-span-2"><Label className="text-[10px]">Tax%</Label><Input type="number" value={line.tax_percent} onChange={e => setLine(idx, 'tax_percent', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" /></div>
            <div className="col-span-1"><Label className="text-[10px]">Total</Label><p className="mt-1 h-8 flex items-center text-xs font-semibold">${(line.line_total || 0).toFixed(2)}</p></div>
            <div className="col-span-1 flex justify-end"><Button type="button" size="icon" variant="ghost" onClick={() => removeLine(idx)} className="h-8 w-8"><Trash2 className="w-3 h-3" /></Button></div>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-2 text-sm space-x-4">
        <span className="text-muted-foreground">Subtotal: <strong>${(docForm.subtotal || 0).toFixed(2)}</strong></span>
        <span className="text-muted-foreground">Tax: <strong>${(docForm.tax_amount || 0).toFixed(2)}</strong></span>
        <span className="font-bold">Total: <strong>${(docForm.total_amount || 0).toFixed(2)}</strong></span>
      </div>
    </div>
  );

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Sales Documents</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openNew('quote')}><FileText className="w-3 h-3" />New Quote</Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openNew('order')}><ShoppingCart className="w-3 h-3" />New Order</Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openNew('invoice')}><Receipt className="w-3 h-3" />New Invoice</Button>
        </div>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="mb-3">
          <TabsTrigger value="quotes">Quotes ({custQuotes.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({custOrders.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({custInvoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes">
          {custQuotes.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No quotes</p> : (
            <div className="space-y-2">
              {custQuotes.map(q => (
                <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{q.quote_number}</p>
                    <p className="text-xs text-muted-foreground">{q.quote_date ? format(new Date(q.quote_date), 'MMM d, yyyy') : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">${(q.total_amount || 0).toLocaleString()}</span>
                    <StatusBadge status={q.status} />
                    {!['converted', 'rejected', 'expired'].includes(q.status) && (
                      <Button size="sm" variant="ghost" title="Convert to Order" onClick={() => convertQuoteMutation.mutate(q)}>
                        <ArrowRight className="w-3.5 h-3.5 text-primary" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {custOrders.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No orders</p> : (
            <div className="space-y-2">
              {custOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">{o.order_date ? format(new Date(o.order_date), 'MMM d, yyyy') : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">${(o.total_amount || 0).toLocaleString()}</span>
                    <StatusBadge status={o.status} />
                    {!['invoiced', 'cancelled'].includes(o.status) && (
                      <Button size="sm" variant="ghost" title="Convert to Invoice" onClick={() => convertOrderMutation.mutate(o)}>
                        <ArrowRight className="w-3.5 h-3.5 text-primary" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices">
          {custInvoices.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">No invoices</p> : (
            <div className="space-y-2">
              {custInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoice_date ? format(new Date(inv.invoice_date), 'MMM d, yyyy') : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-sm">${(inv.total_amount || 0).toLocaleString()}</p>
                      {(inv.balance_due || 0) > 0 && <p className="text-xs text-red-600">Bal: ${(inv.balance_due || 0).toLocaleString()}</p>}
                    </div>
                    <StatusBadge status={inv.status} />
                    {!['paid', 'cancelled'].includes(inv.status) && (
                      <Button size="sm" variant="ghost" title="Record Payment" onClick={() => { setPayForm({ amount: inv.balance_due || inv.total_amount || 0, method: 'bank_transfer', date: today, notes: '' }); setPayDialog(inv); }}>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Document Dialog */}
      {newDocDialog && (
        <FormDialog
          open={!!newDocDialog}
          onOpenChange={() => setNewDocDialog(null)}
          title={`New ${newDocDialog === 'quote' ? 'Quote' : newDocDialog === 'order' ? 'Order' : 'Invoice'} — ${customerName}`}
          onSubmit={() => createDocMutation.mutate({ type: newDocDialog, form: docForm })}
          isSubmitting={createDocMutation.isPending}
          submitLabel="Create"
          size="xl"
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payment Terms" type="select" value={docForm.payment_terms} onChange={v => set('payment_terms', v)} options={[{value:'net_15',label:'Net 15'},{value:'net_30',label:'Net 30'},{value:'net_45',label:'Net 45'},{value:'net_60',label:'Net 60'},{value:'due_on_receipt',label:'Due on Receipt'}]} />
            <FormField label="Currency" value={docForm.currency} onChange={v => set('currency', v)} />
          </div>
          <LineItemEditor />
          <FormField label="Notes" type="textarea" value={docForm.notes} onChange={v => set('notes', v)} />
        </FormDialog>
      )}

      {/* Record Payment Dialog */}
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
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">${(payDialog.total_amount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>${(payDialog.amount_paid || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold"><span>Balance Due</span><span className="text-red-600">${(payDialog.balance_due || 0).toFixed(2)}</span></div>
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