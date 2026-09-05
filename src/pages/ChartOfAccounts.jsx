import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Pencil, Trash2 } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const typeColors = {
  asset: 'bg-blue-50 text-blue-700 border-blue-200',
  liability: 'bg-red-50 text-red-700 border-red-200',
  equity: 'bg-purple-50 text-purple-700 border-purple-200',
  revenue: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expense: 'bg-amber-50 text-amber-700 border-amber-200',
};

const defaultAccount = {
  account_number: '', name: '', type: 'asset', sub_type: '', balance: 0, currency: 'USD', is_active: true, description: ''
};

export default function ChartOfAccounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chartOfAccounts'],
    queryFn: () => base44.entities.ChartOfAccount.list('account_number'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => data.id
      ? base44.entities.ChartOfAccount.update(data.id, data)
      : base44.entities.ChartOfAccount.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] }); setDialogOpen(false); setEditData(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChartOfAccount.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chartOfAccounts'] }); setDeleteId(null); }
  });

  const [form, setForm] = useState(defaultAccount);
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const openCreate = () => { setForm(defaultAccount); setEditData(null); setDialogOpen(true); };
  const openEdit = (a) => { setForm(a); setEditData(a); setDialogOpen(true); };

  const filtered = accounts.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.account_number?.includes(search)
  );

  const columns = [
    { header: 'Account No.', render: (r) => <span className="font-mono text-sm font-medium">{r.account_number}</span> },
    { header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { header: 'Type', render: (r) => <Badge variant="outline" className={`text-xs capitalize border ${typeColors[r.type] || ''}`}>{r.type}</Badge> },
    { header: 'Sub-Type', accessor: 'sub_type' },
    { header: 'Balance', render: (r) => {
      const bal = r.balance || 0;
      return <span className={`font-semibold ${bal < 0 ? 'text-red-600' : ''}`}>${bal.toLocaleString()}</span>;
    }},
    { header: 'Active', render: (r) => r.is_active ? <span className="text-emerald-600 text-xs font-medium">Yes</span> : <span className="text-muted-foreground text-xs">No</span> },
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
      <PageHeader title="Chart of Accounts" subtitle="Manage your general ledger accounts" actionLabel="New Account" onAction={openCreate}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
      </PageHeader>

      {!isLoading && accounts.length === 0 ? (
        <EmptyState icon={BookOpen} title="No accounts yet" description="Set up your chart of accounts to start financial tracking" actionLabel="Add Account" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Account' : 'New Account'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending}>
        <FormField label="Account Number" value={form.account_number} onChange={v => set('account_number', v)} required />
        <FormField label="Name" value={form.name} onChange={v => set('name', v)} required />
        <FormField label="Type" type="select" value={form.type} onChange={v => set('type', v)} options={[
          { value: 'asset', label: 'Asset' }, { value: 'liability', label: 'Liability' },
          { value: 'equity', label: 'Equity' }, { value: 'revenue', label: 'Revenue' }, { value: 'expense', label: 'Expense' }
        ]} />
        <FormField label="Sub-Type" value={form.sub_type} onChange={v => set('sub_type', v)} placeholder="e.g. Current Asset, Fixed Asset" />
        <FormField label="Opening Balance" type="number" value={form.balance} onChange={v => set('balance', v)} />
        <FormField label="Description" type="textarea" value={form.description} onChange={v => set('description', v)} />
      </FormDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Account</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}