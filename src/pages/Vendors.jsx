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
import { Truck, Search, Pencil, Trash2 } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const defaultVendor = {
  name: '', email: '', phone: '', address: '', city: '', state: '', country: '', zip_code: '',
  contact_person: '', payment_terms: 'net_30', status: 'active', notes: '', tax_id: '',
  posting_group_id: '', posting_group_code: ''
};

const paymentTermOptions = [
  { value: 'net_15', label: 'Net 15' }, { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' }, { value: 'net_60', label: 'Net 60' },
  { value: 'due_on_receipt', label: 'Due on Receipt' },
];

export default function Vendors() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list('-created_date'),
  });

  const { data: postingGroups = [] } = useQuery({
    queryKey: ['posting-groups'],
    queryFn: () => base44.entities.PostingGroup.list('code'),
  });

  const vendorPostingGroups = useMemo(() =>
    postingGroups.filter(g => g.type === 'vendor' || g.type === 'both'),
    [postingGroups]
  );

  const postingGroupOptions = useMemo(() => [
    { value: '', label: '— None —' },
    ...vendorPostingGroups.map(g => ({ value: g.id, label: `${g.code}${g.description ? ' – ' + g.description : ''}` }))
  ], [vendorPostingGroups]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const num = data.vendor_number || `VEND-${String(Date.now()).slice(-6)}`;
      const pg = vendorPostingGroups.find(g => g.id === data.posting_group_id);
      const payload = { ...data, vendor_number: num, posting_group_code: pg?.code || '' };
      return data.id
        ? base44.entities.Vendor.update(data.id, payload)
        : base44.entities.Vendor.create(payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); setDialogOpen(false); setEditData(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); setDeleteId(null); }
  });

  const [form, setForm] = useState(defaultVendor);
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const openCreate = () => { setForm(defaultVendor); setEditData(null); setDialogOpen(true); };
  const openEdit = (v) => { setForm(v); setEditData(v); setDialogOpen(true); };

  const filtered = vendors.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: 'Number', render: (r) => <span className="text-xs font-mono text-muted-foreground">{r.vendor_number}</span> },
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
      <PageHeader title="Vendors" subtitle="Manage your vendor records" actionLabel="New Vendor" onAction={openCreate}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
      </PageHeader>

      {!isLoading && vendors.length === 0 ? (
        <EmptyState icon={Truck} title="No vendors yet" description="Add your first vendor to manage purchasing" actionLabel="Add Vendor" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Vendor' : 'New Vendor'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending} size="lg">
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
          <FormField label="Posting Group" type="select" value={form.posting_group_id || ''} onChange={v => set('posting_group_id', v)} options={postingGroupOptions} />
          <FormField label="Status" type="select" value={form.status} onChange={v => set('status', v)} options={[
            { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'blocked', label: 'Blocked' }
          ]} />
          <FormField label="Notes" type="textarea" value={form.notes} onChange={v => set('notes', v)} className="sm:col-span-2" />
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Vendor</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}