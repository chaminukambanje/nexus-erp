import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, Pencil, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import CustomerSalesPanel from '@/components/sales/CustomerSalesPanel';
import EmptyState from '@/components/shared/EmptyState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const defaultCustomer = {
  name: '', email: '', phone: '', address: '', city: '', state: '', country: '', zip_code: '',
  contact_person: '', payment_terms: 'net_30', credit_limit: 0, status: 'active', notes: '', tax_id: '',
  posting_group_id: '', posting_group_code: ''
};

const paymentTermOptions = [
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'due_on_receipt', label: 'Due on Receipt' },
];

export default function Customers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date'),
  });

  const { data: postingGroups = [] } = useQuery({
    queryKey: ['posting-groups'],
    queryFn: () => base44.entities.PostingGroup.list('code'),
  });

  const customerPostingGroups = useMemo(() =>
    postingGroups.filter(g => g.type === 'customer' || g.type === 'both'),
    [postingGroups]
  );

  const postingGroupOptions = useMemo(() => [
    { value: '', label: '— None —' },
    ...customerPostingGroups.map(g => ({ value: g.id, label: `${g.code}${g.description ? ' – ' + g.description : ''}` }))
  ], [customerPostingGroups]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const num = data.customer_number || `CUST-${String(Date.now()).slice(-6)}`;
      const pg = customerPostingGroups.find(g => g.id === data.posting_group_id);
      const payload = { ...data, customer_number: num, posting_group_code: pg?.code || '' };
      return data.id
        ? base44.entities.Customer.update(data.id, payload)
        : base44.entities.Customer.create(payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setDialogOpen(false); setEditData(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setDeleteId(null); }
  });

  const [form, setForm] = useState(defaultCustomer);
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const openCreate = () => { setForm(defaultCustomer); setEditData(null); setDialogOpen(true); };
  const openEdit = (c) => { setForm(c); setEditData(c); setDialogOpen(true); };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_number?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: 'Number', accessor: 'customer_number', render: (r) => <span className="text-xs font-mono text-muted-foreground">{r.customer_number}</span> },
    { header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'City', accessor: 'city' },
    { header: 'Posting Group', render: (r) => r.posting_group_code ? <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{r.posting_group_code}</span> : <span className="text-muted-foreground text-xs">—</span> },
    { header: 'Balance', render: (r) => <span className="font-semibold">${(r.balance || 0).toLocaleString()}</span> },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: '',
      render: (r) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
        
        </div>
      )
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <PageHeader title="Customers" subtitle="Manage your customer records" actionLabel="New Customer" onAction={openCreate}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
      </PageHeader>

      {!isLoading && customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="Add your first customer to start managing your sales" actionLabel="Add Customer" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={(c) => setSelectedCustomer(c)} />
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Customer' : 'New Customer'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Name" value={form.name} onChange={v => set('name', v)} required className="sm:col-span-2" />
          <FormField label="Email" type="email" value={form.email} onChange={v => set('email', v)} />
          <FormField label="Phone" value={form.phone} onChange={v => set('phone', v)} />
          <FormField label="Contact Person" value={form.contact_person} onChange={v => set('contact_person', v)} />
          <FormField label="Tax ID" value={form.tax_id} onChange={v => set('tax_id', v)} />
          <FormField label="Address" value={form.address} onChange={v => set('address', v)} className="sm:col-span-2" />
          <FormField label="City" value={form.city} onChange={v => set('city', v)} />
          <FormField label="State" value={form.state} onChange={v => set('state', v)} />
          <FormField label="Country" value={form.country} onChange={v => set('country', v)} />
          <FormField label="Zip Code" value={form.zip_code} onChange={v => set('zip_code', v)} />
          <FormField label="Payment Terms" type="select" value={form.payment_terms} onChange={v => set('payment_terms', v)} options={paymentTermOptions} />
          <FormField label="Credit Limit" type="number" value={form.credit_limit} onChange={v => set('credit_limit', v)} />
          <FormField label="Posting Group" type="select" value={form.posting_group_id || ''} onChange={v => set('posting_group_id', v)} options={postingGroupOptions} />
          <FormField label="Status" type="select" value={form.status} onChange={v => set('status', v)} options={[
            { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'blocked', label: 'Blocked' }
          ]} />
          <FormField label="Notes" type="textarea" value={form.notes} onChange={v => set('notes', v)} className="sm:col-span-2" />
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete this customer record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{selectedCustomer?.name}</SheetTitle>
            <div className="flex gap-4 text-sm text-muted-foreground">
              {selectedCustomer?.email && <span>{selectedCustomer.email}</span>}
              {selectedCustomer?.phone && <span>{selectedCustomer.phone}</span>}
              {selectedCustomer?.customer_number && <span className="font-mono">{selectedCustomer.customer_number}</span>}
            </div>
            <Button size="sm" variant="outline" className="w-fit mt-2" onClick={() => { openEdit(selectedCustomer); setSelectedCustomer(null); }}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Customer
            </Button>
          </SheetHeader>
          {selectedCustomer && (
            <CustomerSalesPanel customerId={selectedCustomer.id} customerName={selectedCustomer.name} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}