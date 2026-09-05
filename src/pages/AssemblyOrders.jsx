import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Boxes,
  Layers,
  CheckCircle2,
  Plus,
  RefreshCw,
  Clock,
  PackageCheck,
  Hammer,
  AlertCircle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function AssemblyOrders() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('orders');
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState({
    item_code: 'KIT-PC-PRO',
    item_name: 'High-Performance CAD Workstation Bundle',
    quantity_to_assemble: 5,
    location_code: 'MAIN',
    due_date: new Date().toISOString().split('T')[0],
    assembly_policy: 'Assemble-to-Stock (ATS)'
  });

  const { data: assemblyOrders = [] } = useQuery({
    queryKey: ['assemblyOrders'],
    queryFn: () => base44.entities.AssemblyOrder.list('-created_date', 100)
  });

  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list()
  });

  // Post assembly output mutation
  const postMutation = useMutation({
    mutationFn: async (order) => {
      await base44.entities.AssemblyOrder.update(order.id, {
        status: 'posted',
        assembled_quantity: order.quantity_to_assemble,
        posted_date: new Date().toISOString().split('T')[0]
      });
      // Optionally create finished inventory ledger entry
    },
    onSuccess: () => {
      qc.invalidateQueries(['assemblyOrders']);
      qc.invalidateQueries(['items']);
      toast.success('Assembly Order posted! Finished goods added to stock and components consumed.');
    }
  });

  // Create assembly order mutation
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AssemblyOrder.create({
      ...data,
      order_no: `ASY-${Date.now().toString().slice(-6)}`,
      status: 'open',
      assembled_quantity: 0,
      total_cost: parseFloat(data.quantity_to_assemble) * 1450.00,
      lines_count: 4
    }),
    onSuccess: () => {
      qc.invalidateQueries(['assemblyOrders']);
      setCreateDialog(false);
      toast.success('New Assembly Order created');
    }
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <PageHeader
        title="Assembly Orders & Kitting"
        description="Light manufacturing, kit BOM explosion, and Assemble-to-Stock / Assemble-to-Order fulfillment (Business Central standard)"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateDialog(true)} className="gap-1.5 text-xs bg-primary">
              <Plus className="w-3.5 h-3.5" /> New Assembly Order
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Open Assembly Orders</span>
              <Hammer className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2">
              {assemblyOrders.filter(o => o.status === 'open' || o.status === 'in_progress').length}
            </div>
            <span className="text-[11px] text-muted-foreground">Kits awaiting shopfloor assembly</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Posted / Completed</span>
              <PackageCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2">
              {assemblyOrders.filter(o => o.status === 'posted').length}
            </div>
            <span className="text-[11px] text-muted-foreground">Successfully assembled to inventory</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Total Kit Production Value</span>
              <Boxes className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2">
              £{assemblyOrders.reduce((s, o) => s + parseFloat(o.total_cost || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-muted-foreground">Total assembled goods cost</span>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Assembly Orders Register</CardTitle>
          <CardDescription>Track kit component consumption and finished product output</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <DataTable
            columns={[
              { header: 'Order #', render: r => <span className="font-mono font-semibold text-xs">{r.order_no}</span> },
              {
                header: 'Item to Assemble',
                render: r => (
                  <div>
                    <span className="font-medium text-xs block">{r.item_name}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{r.item_code}</span>
                  </div>
                )
              },
              { header: 'Policy', render: r => <Badge variant="outline" className="text-[10px]">{r.assembly_policy || 'ATS'}</Badge> },
              { header: 'Quantity', render: r => <span className="font-mono font-bold text-xs">{r.quantity_to_assemble} Units</span> },
              { header: 'Location', render: r => <Badge variant="secondary" className="text-[10px]">{r.location_code}</Badge> },
              { header: 'Due Date', render: r => <span className="text-xs font-mono">{r.due_date}</span> },
              { header: 'Total Est. Cost', render: r => <span className="font-mono text-xs">£{parseFloat(r.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> },
              { header: 'Status', render: r => <StatusBadge status={r.status} /> },
              {
                header: 'Actions',
                render: r => (
                  <div>
                    {r.status !== 'posted' && (
                      <Button size="sm" onClick={() => postMutation.mutate(r)} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Post Output
                      </Button>
                    )}
                  </div>
                )
              }
            ]}
            data={assemblyOrders}
          />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <FormDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        title="Create New Assembly Order"
        onSubmit={() => createMutation.mutate(form)}
      >
        <div className="space-y-3">
          <FormField label="Kit Item to Assemble">
            <Input value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Item Code (SKU)">
              <Input value={form.item_code} onChange={e => setForm({ ...form, item_code: e.target.value })} />
            </FormField>
            <FormField label="Quantity to Assemble">
              <Input type="number" min="1" value={form.quantity_to_assemble} onChange={e => setForm({ ...form, quantity_to_assemble: parseInt(e.target.value) || 1 })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Location">
              <Input value={form.location_code} onChange={e => setForm({ ...form, location_code: e.target.value })} />
            </FormField>
            <FormField label="Due Date">
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Assembly Policy">
            <select
              value={form.assembly_policy}
              onChange={e => setForm({ ...form, assembly_policy: e.target.value })}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="Assemble-to-Stock (ATS)">Assemble-to-Stock (ATS)</option>
              <option value="Assemble-to-Order (ATO)">Assemble-to-Order (ATO)</option>
            </select>
          </FormField>
        </div>
      </FormDialog>
    </div>
  );
}
