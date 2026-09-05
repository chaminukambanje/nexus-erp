import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Package, Pencil, Trash2, Search, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

const defaultAsset = { name: '', category: 'equipment', status: 'active', acquisition_date: '', acquisition_cost: 0, salvage_value: 0, useful_life_years: 5, depreciation_method: 'straight_line', accumulated_depreciation: 0, book_value: 0, location: '', serial_number: '', notes: '' };

export default function FixedAssets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(defaultAsset);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: assets = [], isLoading } = useQuery({ queryKey: ['fixedAssets'], queryFn: () => base44.entities.FixedAsset.list('-created_date', 200) });

  const mutation = useMutation({
    mutationFn: (data) => {
      const num = data.asset_number || `FA-${String(Date.now()).slice(-5)}`;
      const bookVal = (data.acquisition_cost || 0) - (data.accumulated_depreciation || 0);
      const payload = { ...data, asset_number: num, book_value: bookVal };
      return data.id ? base44.entities.FixedAsset.update(data.id, payload) : base44.entities.FixedAsset.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(['fixedAssets']); setDialog(false); setForm(defaultAsset); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FixedAsset.delete(id),
    onSuccess: () => { qc.invalidateQueries(['fixedAssets']); setDeleteTarget(null); }
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = assets.filter(a => `${a.name} ${a.category} ${a.serial_number || ''} ${a.location || ''}`.toLowerCase().includes(search.toLowerCase()));

  const totalCost = assets.reduce((s, a) => s + (a.acquisition_cost || 0), 0);
  const totalDepreciation = assets.reduce((s, a) => s + (a.accumulated_depreciation || 0), 0);
  const totalBookValue = assets.reduce((s, a) => s + (a.book_value || 0), 0);

  const columns = [
    { header: 'Asset', render: r => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.asset_number} · {r.serial_number || '—'}</p></div> },
    { header: 'Category', render: r => <span className="capitalize text-sm">{r.category}</span> },
    { header: 'Acquisition', render: r => <div><p className="text-sm font-medium">${(r.acquisition_cost || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">{r.acquisition_date ? format(new Date(r.acquisition_date), 'MMM d, yyyy') : '—'}</p></div> },
    { header: 'Accum. Depr.', render: r => <span className="text-red-600 font-medium">${(r.accumulated_depreciation || 0).toLocaleString()}</span> },
    { header: 'Book Value', render: r => <span className="font-bold">${(r.book_value || 0).toLocaleString()}</span> },
    { header: 'Depreciation', render: r => {
      const pct = r.acquisition_cost > 0 ? Math.min(100, (r.accumulated_depreciation / r.acquisition_cost) * 100) : 0;
      return <div className="w-24"><Progress value={pct} className="h-2" /><p className="text-xs text-muted-foreground mt-0.5">{pct.toFixed(0)}%</p></div>;
    }},
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setForm(r); setDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <PageHeader title="Fixed Assets" subtitle="Track and depreciate your long-term assets" actionLabel="New Asset" onAction={() => { setForm(defaultAsset); setDialog(true); }} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Cost', value: `$${totalCost.toLocaleString()}` },
          { label: 'Accumulated Depreciation', value: `$${totalDepreciation.toLocaleString()}` },
          { label: 'Net Book Value', value: `$${totalBookValue.toLocaleString()}` },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold mt-1">{s.value}</p></CardContent></Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Package} title="No fixed assets" description="Add buildings, equipment, vehicles and more." actionLabel="New Asset" onAction={() => { setForm(defaultAsset); setDialog(true); }} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} />
      )}

      <FormDialog open={dialog} onOpenChange={setDialog} title={form.id ? 'Edit Fixed Asset' : 'New Fixed Asset'} onSubmit={() => mutation.mutate(form)} isSubmitting={mutation.isPending} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Asset Name" value={form.name} onChange={v => set('name', v)} required className="col-span-2" />
          <FormField label="Category" type="select" value={form.category} onChange={v => set('category', v)} options={['land','building','machinery','vehicle','equipment','furniture','computer','other'].map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
          <FormField label="Status" type="select" value={form.status} onChange={v => set('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'disposed', label: 'Disposed' }, { value: 'under_maintenance', label: 'Under Maintenance' }, { value: 'fully_depreciated', label: 'Fully Depreciated' }]} />
          <FormField label="Serial Number" value={form.serial_number} onChange={v => set('serial_number', v)} />
          <FormField label="Location" value={form.location} onChange={v => set('location', v)} />
          <FormField label="Acquisition Date" type="date" value={form.acquisition_date} onChange={v => set('acquisition_date', v)} />
          <FormField label="Acquisition Cost" type="number" value={form.acquisition_cost} onChange={v => set('acquisition_cost', v)} />
          <FormField label="Salvage Value" type="number" value={form.salvage_value} onChange={v => set('salvage_value', v)} />
          <FormField label="Useful Life (Years)" type="number" value={form.useful_life_years} onChange={v => set('useful_life_years', v)} />
          <FormField label="Depreciation Method" type="select" value={form.depreciation_method} onChange={v => set('depreciation_method', v)} options={[{ value: 'straight_line', label: 'Straight Line' }, { value: 'declining_balance', label: 'Declining Balance' }, { value: 'units_of_production', label: 'Units of Production' }]} />
          <FormField label="Accumulated Depreciation" type="number" value={form.accumulated_depreciation} onChange={v => set('accumulated_depreciation', v)} />
          <FormField label="Vendor Name" value={form.vendor_name} onChange={v => set('vendor_name', v)} />
          <FormField label="Notes" type="textarea" value={form.notes} onChange={v => set('notes', v)} className="col-span-2" />
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Asset?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}