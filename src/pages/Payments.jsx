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
import { Banknote, Search, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

const defaultPayment = {
  payment_number: '', type: 'incoming', party_type: 'customer', party_name: '',
  reference_number: '', date: format(new Date(), 'yyyy-MM-dd'), amount: 0,
  method: 'bank_transfer', status: 'pending', notes: '', currency: 'USD'
};

export default function Payments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list('-created_date') });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const num = data.payment_number || `PAY-${String(Date.now()).slice(-6)}`;
      return data.id ? base44.entities.Payment.update(data.id, { ...data, payment_number: num }) : base44.entities.Payment.create({ ...data, payment_number: num });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payments'] }); setDialogOpen(false); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Payment.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payments'] }); setDeleteId(null); }
  });

  const [form, setForm] = useState(defaultPayment);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const openCreate = () => { setForm({ ...defaultPayment, date: format(new Date(), 'yyyy-MM-dd') }); setEditData(null); setDialogOpen(true); };
  const openEdit = (p) => { setForm(p); setEditData(p); setDialogOpen(true); };
  const filtered = payments.filter(p => p.payment_number?.toLowerCase().includes(search.toLowerCase()) || p.party_name?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { header: 'Payment #', render: (r) => <span className="font-mono text-xs">{r.payment_number}</span> },
    { header: 'Type', render: (r) => <Badge variant="outline" className={`text-xs ${r.type === 'incoming' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{r.type === 'incoming' ? 'Received' : 'Paid'}</Badge> },
    { header: 'Party', render: (r) => <span className="font-medium">{r.party_name}</span> },
    { header: 'Date', render: (r) => r.date ? format(new Date(r.date), 'MMM d, yyyy') : '' },
    { header: 'Amount', render: (r) => <span className="font-semibold">${(r.amount || 0).toLocaleString()}</span> },
    { header: 'Method', render: (r) => <span className="text-xs capitalize">{r.method?.replace(/_/g, ' ')}</span> },
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
      <PageHeader title="Payments" subtitle="Track incoming and outgoing payments" actionLabel="New Payment" onAction={openCreate}>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" /></div>
      </PageHeader>
      {!isLoading && payments.length === 0 ? (
        <EmptyState icon={Banknote} title="No payments" description="Record your first payment" actionLabel="New Payment" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Payment' : 'New Payment'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Type" type="select" value={form.type} onChange={v => set('type', v)} options={[
            { value: 'incoming', label: 'Incoming (Received)' }, { value: 'outgoing', label: 'Outgoing (Paid)' }
          ]} />
          <FormField label="Party Type" type="select" value={form.party_type} onChange={v => set('party_type', v)} options={[
            { value: 'customer', label: 'Customer' }, { value: 'vendor', label: 'Vendor' }
          ]} />
          <FormField label="Party Name" value={form.party_name} onChange={v => set('party_name', v)} />
          <FormField label="Reference #" value={form.reference_number} onChange={v => set('reference_number', v)} placeholder="Invoice / Bill number" />
          <FormField label="Date" type="date" value={form.date} onChange={v => set('date', v)} />
          <FormField label="Amount" type="number" value={form.amount} onChange={v => set('amount', v)} />
          <FormField label="Method" type="select" value={form.method} onChange={v => set('method', v)} options={[
            { value: 'cash', label: 'Cash' }, { value: 'check', label: 'Check' },
            { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'credit_card', label: 'Credit Card' }, { value: 'other', label: 'Other' }
          ]} />
          <FormField label="Status" type="select" value={form.status} onChange={v => set('status', v)} options={[
            { value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' }, { value: 'cancelled', label: 'Cancelled' }
          ]} />
          <FormField label="Notes" type="textarea" value={form.notes} onChange={v => set('notes', v)} className="sm:col-span-2" />
        </div>
      </FormDialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Payment</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}