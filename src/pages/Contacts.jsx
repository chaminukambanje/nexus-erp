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
import { UserCircle, Search, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const defaultContact = {
  first_name: '', last_name: '', company: '', email: '', phone: '', mobile: '',
  job_title: '', type: 'prospect', address: '', city: '', state: '', country: '', notes: '', status: 'active'
};

export default function Contacts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({ queryKey: ['contacts'], queryFn: () => base44.entities.Contact.list('-created_date') });

  const saveMutation = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Contact.update(data.id, data) : base44.entities.Contact.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); setDialogOpen(false); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); setDeleteId(null); }
  });

  const [form, setForm] = useState(defaultContact);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const openCreate = () => { setForm(defaultContact); setEditData(null); setDialogOpen(true); };
  const openEdit = (c) => { setForm(c); setEditData(c); setDialogOpen(true); };
  const filtered = contacts.filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  const typeColors = { customer: 'bg-emerald-50 text-emerald-700 border-emerald-200', vendor: 'bg-blue-50 text-blue-700 border-blue-200', prospect: 'bg-amber-50 text-amber-700 border-amber-200', other: 'bg-slate-100 text-slate-600 border-slate-200' };

  const columns = [
    { header: 'Name', render: (r) => <span className="font-medium">{r.first_name} {r.last_name}</span> },
    { header: 'Company', accessor: 'company' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Type', render: (r) => <Badge variant="outline" className={`text-xs capitalize border ${typeColors[r.type] || ''}`}>{r.type}</Badge> },
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
      <PageHeader title="Contacts" subtitle="Manage your business contacts" actionLabel="New Contact" onAction={openCreate}>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" /></div>
      </PageHeader>
      {!isLoading && contacts.length === 0 ? (
        <EmptyState icon={UserCircle} title="No contacts" description="Add contacts for your CRM" actionLabel="Add Contact" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Contact' : 'New Contact'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="First Name" value={form.first_name} onChange={v => set('first_name', v)} required />
          <FormField label="Last Name" value={form.last_name} onChange={v => set('last_name', v)} required />
          <FormField label="Company" value={form.company} onChange={v => set('company', v)} />
          <FormField label="Job Title" value={form.job_title} onChange={v => set('job_title', v)} />
          <FormField label="Email" type="email" value={form.email} onChange={v => set('email', v)} />
          <FormField label="Phone" value={form.phone} onChange={v => set('phone', v)} />
          <FormField label="Mobile" value={form.mobile} onChange={v => set('mobile', v)} />
          <FormField label="Type" type="select" value={form.type} onChange={v => set('type', v)} options={[
            { value: 'customer', label: 'Customer' }, { value: 'vendor', label: 'Vendor' },
            { value: 'prospect', label: 'Prospect' }, { value: 'other', label: 'Other' }
          ]} />
          <FormField label="Address" value={form.address} onChange={v => set('address', v)} className="sm:col-span-2" />
          <FormField label="City" value={form.city} onChange={v => set('city', v)} />
          <FormField label="State" value={form.state} onChange={v => set('state', v)} />
          <FormField label="Country" value={form.country} onChange={v => set('country', v)} />
          <FormField label="Status" type="select" value={form.status} onChange={v => set('status', v)} options={[
            { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }
          ]} />
          <FormField label="Notes" type="textarea" value={form.notes} onChange={v => set('notes', v)} className="sm:col-span-2" />
        </div>
      </FormDialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Contact</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}