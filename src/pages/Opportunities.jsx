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
import { Target, Search, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';

const defaultOpp = {
  name: '', contact_name: '', customer_name: '', stage: 'prospect',
  estimated_value: 0, probability: 10, expected_close_date: '', source: '',
  assigned_to: '', notes: '', status: 'open'
};

export default function Opportunities() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: opps = [], isLoading } = useQuery({ queryKey: ['opportunities'], queryFn: () => base44.entities.Opportunity.list('-created_date') });

  const saveMutation = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Opportunity.update(data.id, data) : base44.entities.Opportunity.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['opportunities'] }); setDialogOpen(false); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Opportunity.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['opportunities'] }); setDeleteId(null); }
  });

  const [form, setForm] = useState(defaultOpp);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const openCreate = () => { setForm(defaultOpp); setEditData(null); setDialogOpen(true); };
  const openEdit = (o) => { setForm(o); setEditData(o); setDialogOpen(true); };
  const filtered = opps.filter(o => o.name?.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { header: 'Customer', accessor: 'customer_name' },
    { header: 'Stage', render: (r) => <StatusBadge status={r.stage} /> },
    { header: 'Value', render: (r) => <span className="font-semibold">${(r.estimated_value || 0).toLocaleString()}</span> },
    { header: 'Probability', render: (r) => (
      <div className="flex items-center gap-2 w-24">
        <Progress value={r.probability || 0} className="h-2" />
        <span className="text-xs text-muted-foreground">{r.probability}%</span>
      </div>
    )},
    { header: 'Close Date', render: (r) => r.expected_close_date ? format(new Date(r.expected_close_date), 'MMM d, yyyy') : '' },
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
      <PageHeader title="Opportunities" subtitle="Track your sales pipeline" actionLabel="New Opportunity" onAction={openCreate}>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" /></div>
      </PageHeader>
      {!isLoading && opps.length === 0 ? (
        <EmptyState icon={Target} title="No opportunities" description="Start tracking your sales pipeline" actionLabel="New Opportunity" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Opportunity' : 'New Opportunity'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Name" value={form.name} onChange={v => set('name', v)} required className="sm:col-span-2" />
          <FormField label="Customer" value={form.customer_name} onChange={v => set('customer_name', v)} />
          <FormField label="Contact" value={form.contact_name} onChange={v => set('contact_name', v)} />
          <FormField label="Stage" type="select" value={form.stage} onChange={v => set('stage', v)} options={[
            { value: 'prospect', label: 'Prospect' }, { value: 'qualification', label: 'Qualification' },
            { value: 'proposal', label: 'Proposal' }, { value: 'negotiation', label: 'Negotiation' },
            { value: 'closed_won', label: 'Closed Won' }, { value: 'closed_lost', label: 'Closed Lost' }
          ]} />
          <FormField label="Status" type="select" value={form.status} onChange={v => set('status', v)} options={[
            { value: 'open', label: 'Open' }, { value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' }
          ]} />
          <FormField label="Estimated Value" type="number" value={form.estimated_value} onChange={v => set('estimated_value', v)} />
          <FormField label="Probability (%)" type="number" value={form.probability} onChange={v => set('probability', v)} />
          <FormField label="Expected Close Date" type="date" value={form.expected_close_date} onChange={v => set('expected_close_date', v)} />
          <FormField label="Source" value={form.source} onChange={v => set('source', v)} />
          <FormField label="Assigned To" value={form.assigned_to} onChange={v => set('assigned_to', v)} />
          <FormField label="Notes" type="textarea" value={form.notes} onChange={v => set('notes', v)} className="sm:col-span-2" />
        </div>
      </FormDialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Opportunity</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}