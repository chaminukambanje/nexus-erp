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
import { FileText, Search, Pencil, Trash2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const defaultEntry = {
  entry_number: '', date: format(new Date(), 'yyyy-MM-dd'), description: '', status: 'draft',
  lines: [], total_debit: 0, total_credit: 0
};
const defaultLine = { account_id: '', account_name: '', debit: 0, credit: 0, description: '' };

export default function JournalEntries() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({ queryKey: ['journalEntries'], queryFn: () => base44.entities.JournalEntry.list('-created_date') });
  const { data: accounts = [] } = useQuery({ queryKey: ['chartOfAccounts'], queryFn: () => base44.entities.ChartOfAccount.list('account_number') });

  const [form, setForm] = useState(defaultEntry);

  const recalc = (lines) => ({
    lines,
    total_debit: lines.reduce((s, l) => s + (l.debit || 0), 0),
    total_credit: lines.reduce((s, l) => s + (l.credit || 0), 0)
  });

  const setLine = (idx, key, val) => {
    const newLines = [...form.lines];
    newLines[idx] = { ...newLines[idx], [key]: val };
    if (key === 'account_id') {
      const acc = accounts.find(a => a.id === val);
      if (acc) newLines[idx].account_name = `${acc.account_number} - ${acc.name}`;
    }
    setForm(prev => ({ ...prev, ...recalc(newLines) }));
  };
  const addLine = () => setForm(prev => ({ ...prev, lines: [...prev.lines, { ...defaultLine }] }));
  const removeLine = (idx) => setForm(prev => ({ ...prev, ...recalc(prev.lines.filter((_, i) => i !== idx)) }));

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const num = data.entry_number || `JE-${String(Date.now()).slice(-6)}`;
      return data.id ? base44.entities.JournalEntry.update(data.id, { ...data, entry_number: num }) : base44.entities.JournalEntry.create({ ...data, entry_number: num });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['journalEntries'] }); setDialogOpen(false); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JournalEntry.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['journalEntries'] }); setDeleteId(null); }
  });

  const openCreate = () => { setForm({ ...defaultEntry, date: format(new Date(), 'yyyy-MM-dd') }); setEditData(null); setDialogOpen(true); };
  const openEdit = (e) => { setForm(e); setEditData(e); setDialogOpen(true); };
  const filtered = entries.filter(e => e.entry_number?.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase()));
  const isBalanced = Math.abs((form.total_debit || 0) - (form.total_credit || 0)) < 0.01;

  const columns = [
    { header: 'Entry #', render: (r) => <span className="font-mono text-xs">{r.entry_number}</span> },
    { header: 'Date', render: (r) => r.date ? format(new Date(r.date), 'MMM d, yyyy') : '' },
    { header: 'Description', render: (r) => <span className="font-medium">{r.description}</span> },
    { header: 'Debit', render: (r) => `$${(r.total_debit || 0).toLocaleString()}` },
    { header: 'Credit', render: (r) => `$${(r.total_credit || 0).toLocaleString()}` },
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
      <PageHeader title="Journal Entries" subtitle="Record and manage general ledger entries" actionLabel="New Entry" onAction={openCreate}>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" /></div>
      </PageHeader>

      {!isLoading && entries.length === 0 ? (
        <EmptyState icon={FileText} title="No journal entries" description="Create your first journal entry" actionLabel="New Entry" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Journal Entry' : 'New Journal Entry'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending} size="xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Date" type="date" value={form.date} onChange={v => setForm(prev => ({ ...prev, date: v }))} />
          <FormField label="Status" type="select" value={form.status} onChange={v => setForm(prev => ({ ...prev, status: v }))} options={[
            { value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'reversed', label: 'Reversed' }
          ]} />
          <FormField label="Description" value={form.description} onChange={v => setForm(prev => ({ ...prev, description: v }))} className="sm:col-span-2" />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2"><Label className="text-xs font-medium">Lines</Label><Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1 text-xs"><Plus className="w-3 h-3" />Add Line</Button></div>
          {form.lines?.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/50 border mb-2">
              <div className="col-span-4">
                <Label className="text-[10px]">Account</Label>
                <Select value={line.account_id || ''} onValueChange={(v) => setLine(idx, 'account_id', v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_number} - {a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-3"><Label className="text-[10px]">Debit</Label><Input type="number" value={line.debit} onChange={e => setLine(idx, 'debit', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" /></div>
              <div className="col-span-3"><Label className="text-[10px]">Credit</Label><Input type="number" value={line.credit} onChange={e => setLine(idx, 'credit', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" /></div>
              <div className="col-span-2 flex justify-end"><Button type="button" size="icon" variant="ghost" onClick={() => removeLine(idx)} className="h-8 w-8"><X className="w-3 h-3" /></Button></div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Debit</span><span>${(form.total_debit || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Credit</span><span>${(form.total_credit || 0).toFixed(2)}</span></div>
            <div className={`flex justify-between font-bold border-t pt-1 ${isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
              <span>Difference</span><span>${Math.abs((form.total_debit || 0) - (form.total_credit || 0)).toFixed(2)}</span>
            </div>
            {!isBalanced && <p className="text-xs text-red-500">Entry must be balanced (debit = credit)</p>}
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Entry</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}