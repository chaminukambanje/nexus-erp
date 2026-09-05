import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import { Building2, Pencil, Trash2 } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const defaultAccount = { name: '', account_number: '', bank_name: '', type: 'checking', currency: 'USD', balance: 0, is_active: true };

export default function BankAccounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({ queryKey: ['bankAccounts'], queryFn: () => base44.entities.BankAccount.list() });

  const saveMutation = useMutation({
    mutationFn: (data) => data.id ? base44.entities.BankAccount.update(data.id, data) : base44.entities.BankAccount.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bankAccounts'] }); setDialogOpen(false); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BankAccount.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bankAccounts'] }); setDeleteId(null); }
  });

  const [form, setForm] = useState(defaultAccount);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const openCreate = () => { setForm(defaultAccount); setEditData(null); setDialogOpen(true); };
  const openEdit = (a) => { setForm(a); setEditData(a); setDialogOpen(true); };

  const columns = [
    { header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { header: 'Bank', accessor: 'bank_name' },
    { header: 'Account #', render: (r) => <span className="font-mono text-xs">{r.account_number}</span> },
    { header: 'Type', render: (r) => <Badge variant="outline" className="capitalize text-xs">{r.type?.replace(/_/g, ' ')}</Badge> },
    { header: 'Balance', render: (r) => <span className={`font-semibold ${(r.balance || 0) < 0 ? 'text-red-600' : ''}`}>${(r.balance || 0).toLocaleString()}</span> },
    { header: 'Active', render: (r) => r.is_active ? <span className="text-emerald-600 text-xs font-medium">Yes</span> : <span className="text-muted-foreground text-xs">No</span> },
    { header: '', render: (r) => (
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
      </div>
    )},
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <PageHeader title="Bank Accounts" subtitle="Manage your bank and credit accounts" actionLabel="New Account" onAction={openCreate} />
      {!isLoading && accounts.length === 0 ? (
        <EmptyState icon={Building2} title="No bank accounts" description="Add your bank accounts" actionLabel="Add Account" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={accounts} isLoading={isLoading} onRowClick={openEdit} />
      )}
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Bank Account' : 'New Bank Account'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending}>
        <FormField label="Account Name" value={form.name} onChange={v => set('name', v)} required />
        <FormField label="Bank Name" value={form.bank_name} onChange={v => set('bank_name', v)} />
        <FormField label="Account Number" value={form.account_number} onChange={v => set('account_number', v)} />
        <FormField label="Type" type="select" value={form.type} onChange={v => set('type', v)} options={[
          { value: 'checking', label: 'Checking' }, { value: 'savings', label: 'Savings' }, { value: 'credit_card', label: 'Credit Card' }
        ]} />
        <FormField label="Currency" value={form.currency} onChange={v => set('currency', v)} />
        <FormField label="Balance" type="number" value={form.balance} onChange={v => set('balance', v)} />
      </FormDialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Account</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}