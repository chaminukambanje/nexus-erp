import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PiggyBank, Pencil, Trash2, Search, Plus, ChevronDown, ChevronRight } from 'lucide-react';

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const defaultBudget = { name: '', fiscal_year: new Date().getFullYear().toString(), status: 'draft', currency: 'USD', lines: [], total_budget: 0 };
const defaultLine = { account_name: '', account_type: 'expense', jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0, total: 0 };

export default function Budgets() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState(defaultBudget);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');

  const { data: budgets = [], isLoading } = useQuery({ queryKey: ['budgets'], queryFn: () => base44.entities.Budget.list('-created_date', 100) });
  const { data: accounts = [] } = useQuery({ queryKey: ['chartOfAccounts'], queryFn: () => base44.entities.ChartOfAccount.list() });

  const mutation = useMutation({
    mutationFn: (data) => {
      const totalBudget = (data.lines || []).reduce((s, l) => s + (l.total || 0), 0);
      return data.id ? base44.entities.Budget.update(data.id, { ...data, total_budget: totalBudget }) : base44.entities.Budget.create({ ...data, total_budget: totalBudget });
    },
    onSuccess: () => { qc.invalidateQueries(['budgets']); setDialog(false); setForm(defaultBudget); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Budget.delete(id),
    onSuccess: () => { qc.invalidateQueries(['budgets']); setDeleteTarget(null); }
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addLine = () => setForm(f => ({ ...f, lines: [...(f.lines || []), { ...defaultLine }] }));
  const updateLine = (i, k, v) => {
    setForm(f => {
      const lines = [...(f.lines || [])];
      lines[i] = { ...lines[i], [k]: v };
      lines[i].total = MONTHS.reduce((s, m) => s + (parseFloat(lines[i][m]) || 0), 0);
      return { ...f, lines };
    });
  };
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  const filtered = budgets.filter(b => `${b.name} ${b.fiscal_year} ${b.status}`.toLowerCase().includes(search.toLowerCase()));
  const detailBudget = budgets.find(b => b.id === detailId);

  const columns = [
    { header: 'Name', render: r => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">FY {r.fiscal_year}</p></div> },
    { header: 'Total Budget', render: r => <span className="font-semibold">${(r.total_budget || 0).toLocaleString()}</span> },
    { header: 'Currency', accessor: 'currency' },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setDetailId(r.id); }}>View</Button>
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setForm(r); setDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  if (detailBudget) {
    return (
      <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setDetailId(null)}>← Back</Button>
          <div>
            <h1 className="text-xl font-bold">{detailBudget.name}</h1>
            <p className="text-sm text-muted-foreground">FY {detailBudget.fiscal_year} · <StatusBadge status={detailBudget.status} /></p>
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold min-w-[180px]">Account</th>
                    {MONTH_LABELS.map(m => <th key={m} className="text-right px-3 py-3 font-semibold min-w-[80px]">{m}</th>)}
                    <th className="text-right px-4 py-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailBudget.lines || []).map((line, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2.5"><p className="font-medium">{line.account_name}</p><p className="text-xs text-muted-foreground capitalize">{line.account_type}</p></td>
                      {MONTHS.map(m => <td key={m} className="text-right px-3 py-2.5">{(line[m] || 0).toLocaleString()}</td>)}
                      <td className="text-right px-4 py-2.5 font-bold">{(line.total || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {(detailBudget.lines || []).length === 0 && (
                    <tr><td colSpan={14} className="text-center py-8 text-muted-foreground">No budget lines</td></tr>
                  )}
                  <tr className="border-t-2 bg-muted/50 font-bold">
                    <td className="px-4 py-2.5">TOTAL</td>
                    {MONTHS.map(m => (
                      <td key={m} className="text-right px-3 py-2.5">{(detailBudget.lines || []).reduce((s, l) => s + (l[m] || 0), 0).toLocaleString()}</td>
                    ))}
                    <td className="text-right px-4 py-2.5">{(detailBudget.total_budget || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <PageHeader title="Budgets" subtitle="Plan and manage financial budgets by fiscal year" actionLabel="New Budget" onAction={() => { setForm(defaultBudget); setDialog(true); }} />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search budgets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={PiggyBank} title="No budgets yet" description="Create annual budgets to track spending." actionLabel="New Budget" onAction={() => { setForm(defaultBudget); setDialog(true); }} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} />
      )}

      <FormDialog open={dialog} onOpenChange={setDialog} title={form.id ? 'Edit Budget' : 'New Budget'} onSubmit={() => mutation.mutate(form)} isSubmitting={mutation.isPending} size="xl">
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Budget Name" value={form.name} onChange={v => set('name', v)} required className="col-span-2" />
          <FormField label="Fiscal Year" value={form.fiscal_year} onChange={v => set('fiscal_year', v)} required />
          <FormField label="Status" type="select" value={form.status} onChange={v => set('status', v)} options={[{value:'draft',label:'Draft'},{value:'approved',label:'Approved'},{value:'closed',label:'Closed'}]} />
          <FormField label="Currency" value={form.currency} onChange={v => set('currency', v)} />
          <FormField label="Description" type="textarea" value={form.description} onChange={v => set('description', v)} className="col-span-3" />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Budget Lines</h4>
            <Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> Add Line</Button>
          </div>
          <div className="overflow-x-auto">
            {(form.lines || []).map((line, i) => (
              <div key={i} className="grid grid-cols-15 gap-1 mb-1.5 items-center min-w-[900px]">
                <div className="col-span-3">
                  <Input placeholder="Account Name" value={line.account_name || ''} onChange={e => updateLine(i, 'account_name', e.target.value)} className="text-xs" />
                </div>
                {MONTHS.slice(0, 6).map(m => (
                  <div key={m} className="col-span-1">
                    <Input type="number" placeholder={m} value={line[m] || ''} onChange={e => updateLine(i, m, parseFloat(e.target.value) || 0)} className="text-xs px-1" />
                  </div>
                ))}
                <div className="col-span-1 text-xs font-bold text-center">${(MONTHS.slice(0, 6).reduce((s, m) => s + (line[m] || 0), 0)).toLocaleString()}</div>
                <Button type="button" size="sm" variant="ghost" className="text-destructive col-span-1" onClick={() => removeLine(i)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Budget?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}