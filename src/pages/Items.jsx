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
import { Badge } from '@/components/ui/badge';
import { Package, Search, Pencil, Trash2, RefreshCw, GraduationCap, BookOpen } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const defaultItem = {
  name: '', description: '', category: '', type: 'inventory', unit_of_measure: 'PCS',
  unit_price: 0, unit_cost: 0, quantity_on_hand: 0, reorder_point: 0, reorder_quantity: 0,
  warehouse: '', is_active: true, barcode: ''
};

export default function Items() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const num = data.item_number || `ITEM-${String(Date.now()).slice(-6)}`;
      return data.id
        ? base44.entities.Item.update(data.id, { ...data, item_number: num })
        : base44.entities.Item.create({ ...data, item_number: num });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['items'] }); setDialogOpen(false); setEditData(null); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Item.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['items'] }); setDeleteId(null); }
  });

  const [form, setForm] = useState(defaultItem);
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const openCreate = () => { setForm(defaultItem); setEditData(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditData(item); setDialogOpen(true); };

  // Sync programmes and courses as sellable service items
  const syncUniversityItems = async () => {
    setSyncing(true);
    try {
      const [programmes, courses, existingItems] = await Promise.all([
        base44.entities.Programme.list(),
        base44.entities.Course.list(),
        base44.entities.Item.list(),
      ]);
      const existingSourceIds = new Set(existingItems.filter(i => i.source_id).map(i => i.source_id));

      const toCreate = [];

      programmes.filter(p => p.status === 'active' && !existingSourceIds.has(p.id)).forEach(p => {
        toCreate.push({
          item_number: `PROG-${p.code}`,
          name: p.name,
          description: `${p.degree_type?.replace(/_/g, ' ')} — ${p.faculty || p.department || ''} | Duration: ${p.duration_years} year(s)`,
          category: 'Programme',
          type: 'service',
          unit_of_measure: 'Year',
          unit_price: p.annual_fee || 0,
          unit_cost: 0,
          is_active: true,
          source_type: 'programme',
          source_id: p.id,
        });
      });

      courses.filter(c => c.status === 'active' && !existingSourceIds.has(c.id)).forEach(c => {
        toCreate.push({
          item_number: `CRS-${c.code}`,
          name: c.name,
          description: `Course ${c.code} — Year ${c.year_level}, ${c.semester?.replace(/_/g, ' ')} | ${c.credits} credits`,
          category: 'Course',
          type: 'service',
          unit_of_measure: 'Semester',
          unit_price: 0,
          unit_cost: 0,
          is_active: true,
          source_type: 'course',
          source_id: c.id,
        });
      });

      if (toCreate.length === 0) {
        toast({ title: 'Already up to date', description: 'All programmes and courses are already synced as items.' });
      } else {
        await base44.entities.Item.bulkCreate(toCreate);
        queryClient.invalidateQueries({ queryKey: ['items'] });
        toast({ title: `Synced ${toCreate.length} item(s)`, description: `${programmes.length} programmes and courses added as sellable items.` });
      }
    } catch (e) {
      toast({ title: 'Sync failed', description: e.message, variant: 'destructive' });
    }
    setSyncing(false);
  };

  const filtered = items.filter(i =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.item_number?.toLowerCase().includes(search.toLowerCase()) ||
    i.category?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: 'Number', render: (r) => <span className="text-xs font-mono text-muted-foreground">{r.item_number}</span> },
    { header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    {
      header: 'Type', render: (r) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className="text-xs capitalize">{r.type?.replace(/_/g, ' ')}</Badge>
          {r.source_type === 'programme' && <Badge className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200 border"><GraduationCap className="w-3 h-3 inline mr-1" />Programme</Badge>}
          {r.source_type === 'course' && <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 border"><BookOpen className="w-3 h-3 inline mr-1" />Course</Badge>}
        </div>
      )
    },
    { header: 'Category', accessor: 'category' },
    { header: 'Price', render: (r) => `$${(r.unit_price || 0).toFixed(2)}` },
    { header: 'Cost', render: (r) => `$${(r.unit_cost || 0).toFixed(2)}` },
    { header: 'On Hand', render: (r) => {
      const low = r.quantity_on_hand <= (r.reorder_point || 0) && r.type === 'inventory';
      return <span className={low ? 'text-red-600 font-semibold' : ''}>{r.quantity_on_hand || 0} {r.unit_of_measure}</span>;
    }},
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
      <PageHeader title="Items" subtitle="Manage your inventory and service items" actionLabel="New Item" onAction={openCreate}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
        <Button variant="outline" onClick={syncUniversityItems} disabled={syncing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Sync Programmes & Courses
        </Button>
      </PageHeader>

      {!isLoading && items.length === 0 ? (
        <EmptyState icon={Package} title="No items yet" description="Add items to manage inventory and pricing" actionLabel="Add Item" onAction={openCreate} />
      ) : (
        <DataTable columns={columns} data={filtered} isLoading={isLoading} onRowClick={openEdit} />
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editData ? 'Edit Item' : 'New Item'} onSubmit={() => saveMutation.mutate(form)} isSubmitting={saveMutation.isPending} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Name" value={form.name} onChange={v => set('name', v)} required className="sm:col-span-2" />
          <FormField label="Description" type="textarea" value={form.description} onChange={v => set('description', v)} className="sm:col-span-2" />
          <FormField label="Type" type="select" value={form.type} onChange={v => set('type', v)} options={[
            { value: 'inventory', label: 'Inventory' }, { value: 'service', label: 'Service' }, { value: 'non_inventory', label: 'Non-Inventory' }
          ]} />
          <FormField label="Category" value={form.category} onChange={v => set('category', v)} />
          <FormField label="Unit of Measure" value={form.unit_of_measure} onChange={v => set('unit_of_measure', v)} />
          <FormField label="Barcode" value={form.barcode} onChange={v => set('barcode', v)} />
          <FormField label="Unit Price" type="number" value={form.unit_price} onChange={v => set('unit_price', v)} />
          <FormField label="Unit Cost" type="number" value={form.unit_cost} onChange={v => set('unit_cost', v)} />
          <FormField label="Quantity on Hand" type="number" value={form.quantity_on_hand} onChange={v => set('quantity_on_hand', v)} />
          <FormField label="Warehouse" value={form.warehouse} onChange={v => set('warehouse', v)} />
          <FormField label="Reorder Point" type="number" value={form.reorder_point} onChange={v => set('reorder_point', v)} />
          <FormField label="Reorder Quantity" type="number" value={form.reorder_quantity} onChange={v => set('reorder_quantity', v)} />
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Item</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}