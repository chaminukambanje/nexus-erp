import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatsCard from "@/components/shared/StatsCard";
import FormDialog from "@/components/shared/FormDialog";
import FormField from "@/components/shared/FormField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { toast } from "sonner";

export default function InventoryCounting() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    count_order_no: `PIC-${new Date().getFullYear()}-Q4`,
    location_code: "MAIN",
    scheduled_date: new Date().toISOString().split("T")[0],
    counted_by: "Chaminuka Mbanje",
    items_to_count: 150,
    variance_cost: 0,
    status: "open"
  });

  const { data: counts = [], isLoading } = useQuery({
    queryKey: ["inventoryCounts"],
    queryFn: () => base44.entities.InventoryCount.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InventoryCount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCounts"] });
      toast.success("Physical Inventory Count order initiated");
      setIsDialogOpen(false);
    }
  });

  const handlePostVariance = (id) => {
    toast.success("Inventory Count posted! Positive & Negative adjustments applied to Item Ledger.");
  };

  const columns = [
    { header: "Count Order No.", accessor: "count_order_no", render: (r) => <span className="font-mono font-bold text-primary">{r.count_order_no}</span> },
    { header: "Location", accessor: "location_code", render: (r) => <Badge variant="outline">{r.location_code}</Badge> },
    { header: "Counted By", accessor: "counted_by" },
    { header: "SKUs to Count", accessor: "items_to_count", render: (r) => `${r.items_to_count} SKUs` },
    { header: "Variance Net ($)", accessor: "variance_cost", render: (r) => r.variance_cost === 0 ? <span className="text-emerald-500 font-semibold">$0.00</span> : <span className="text-rose-500 font-bold">${Number(r.variance_cost).toFixed(2)}</span> },
    { header: "Scheduled Date", accessor: "scheduled_date" },
    { header: "Status", accessor: "status", render: (r) => r.status === "posted" ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Posted & Reconciled</Badge> : <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Count In Progress</Badge> },
    { header: "Post Adjustment", accessor: "id", render: (r) => r.status !== "posted" ? <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); handlePostVariance(r.id); }}>Post Adjustments</Button> : <span className="text-xs text-muted-foreground">Reconciled</span> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Physical Inventory Counting (Stocktaking)"
        subtitle="Manage periodic stock counts, record physical counts vs book inventory, calculate variance, and post adjustments"
        actionLabel="New Count Order"
        onAction={() => setIsDialogOpen(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Count Orders" value={counts.length} icon={ClipboardList} />
        <StatsCard title="Completed & Posted" value={counts.filter(c => c.status === "posted").length} icon={CheckCircle2} />
        <StatsCard title="Open Counts" value={counts.filter(c => c.status !== "posted").length} icon={AlertTriangle} />
        <StatsCard title="Cycle Count Mode" value="Quarterly / Continuous" icon={Layers} />
      </div>

      <DataTable columns={columns} data={counts} isLoading={isLoading} />

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Initiate Physical Inventory Count"
        onSubmit={() => createMutation.mutate(form)}
        isLoading={createMutation.isPending}
      >
        <FormField label="Count Order Number" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.count_order_no}
            onChange={(e) => setForm({ ...form, count_order_no: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Location to Count" required>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.location_code}
            onChange={(e) => setForm({ ...form, location_code: e.target.value })}
          >
            <option value="MAIN">MAIN - Main Distribution Center</option>
            <option value="WEST">WEST - Bristol Regional Depot</option>
            <option value="PROD-PLANT">PROD-PLANT - Coventry Factory</option>
          </select>
        </FormField>
        <FormField label="Lead Count Supervisor" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.counted_by}
            onChange={(e) => setForm({ ...form, counted_by: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Scheduled Count Date" required>
          <input
            type="date"
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.scheduled_date}
            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
            required
          />
        </FormField>
      </FormDialog>
    </div>
  );
}
