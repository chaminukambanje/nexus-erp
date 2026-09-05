import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, Pencil, Trash2 } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const defaultGroup = {
  code: '', description: '', type: 'customer',
  receivables_account: '', payables_account: '',
  payment_discount_debit_account: '', payment_discount_credit_account: '',
  invoice_rounding_account: '', is_active: true
};

const typeOptions = [
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'both', label: 'Both' },
];

const typeColors = {
  customer: 'bg-blue-50 text-blue-700 border-blue-200',
  vendor: 'bg-purple-50 text-purple-700 border-purple-200',
  both: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function PostingGroups() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [form, setForm] = useState(defaultGroup);
  const queryClient = useQueryClient();
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['posting-groups'],
    queryFn: () => base44.entities.PostingGroup.list('code'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => data.id
      ? base44.entities.PostingGroup.update(data.id, data)
      : base44.entities.PostingGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posting-groups'] });
      setDialogOpen(false);
      setEditData(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PostingGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posting-groups'] });
      setDeleteId(null);
    }
  });

  const openCreate = () => { setForm(defaultGroup); setEditData(null); setDialogOpen(true); };
  const openEdit = (g) => { setForm(g); setEditData(g); setDialogOpen(true); };

  const filtered = activeTab === 'all'
    ? groups
    : groups.filter(g => g.type === activeTab || g.type === 'both');

  const columns = [
    { header: 'Code', render: (r) => <span className="font-mono font-semibold text-sm">{r.code}</span> },
    { header: 'Description', render: (r) => <span className="text-sm">{r.description || '—'}</span> },
    {
      header: 'Type', render: (r) => (
        <Badge variant="outline" className={`text-xs capitalize border ${typeColors[r.type] || ''}`}>
          {r.type}
        </Badge>
      )
    },
    { header: 'Receivables Acct', render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.receivables_account || '—'}</span> },
    { header: 'Payables Acct', render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.payables_account || '—'}</span> },
    {
      header: 'Status', render: (r) => (
        <Badge variant="outline" className={r.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs' : 'bg-slate-100 text-slate-500 border-slate-200 text-xs'}>
          {r.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
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
      <PageHeader
        title="Posting Groups"
        subtitle="Define G/L account mappings for customers and vendors"
        actionLabel="New Posting Group"
        onAction={openCreate}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="vendor">Vendor</TabsTrigger>
        </TabsList>
      </Tabs>

      {!isLoading && groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No posting groups yet"
          description="Create posting groups to map customers and vendors to specific G/L accounts"
          actionLabel="New Posting Group"
          onAction={openCreate}
        />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editData ? 'Edit Posting Group' : 'New Posting Group'}
        onSubmit={() => saveMutation.mutate(form)}
        isSubmitting={saveMutation.isPending}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Code" value={form.code} onChange={v => set('code', v.toUpperCase())} required placeholder="e.g. DOMESTIC" />
          <FormField label="Type" type="select" value={form.type} onChange={v => set('type', v)} options={typeOptions} required />
          <FormField label="Description" value={form.description} onChange={v => set('description', v)} className="sm:col-span-2" placeholder="e.g. Domestic customers" />

          <div className="sm:col-span-2 border-t pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">G/L Account Mappings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Receivables Account" value={form.receivables_account} onChange={v => set('receivables_account', v)} placeholder="e.g. 1100" />
              <FormField label="Payables Account" value={form.payables_account} onChange={v => set('payables_account', v)} placeholder="e.g. 2000" />
              <FormField label="Payment Discount Debit Acct" value={form.payment_discount_debit_account} onChange={v => set('payment_discount_debit_account', v)} placeholder="e.g. 5400" />
              <FormField label="Payment Discount Credit Acct" value={form.payment_discount_credit_account} onChange={v => set('payment_discount_credit_account', v)} placeholder="e.g. 4200" />
              <FormField label="Invoice Rounding Account" value={form.invoice_rounding_account} onChange={v => set('invoice_rounding_account', v)} placeholder="e.g. 5500" />
            </div>
          </div>

          <FormField label="Status" type="select" value={form.is_active ? 'active' : 'inactive'} onChange={v => set('is_active', v === 'active')} options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]} />
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Posting Group</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this posting group. Customers or vendors assigned to it will lose their group assignment.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}