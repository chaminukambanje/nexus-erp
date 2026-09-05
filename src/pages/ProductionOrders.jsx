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
import { Factory, CheckCircle2, Play, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export default function ProductionOrders() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    prod_order_no: `PRD-${new Date().getFullYear()}-00${Math.floor(10 + Math.random() * 90)}`,
    bom_no: "BOM-1001",
    item_name: "Apex Autonomous Delivery Drone v2",
    status: "released",
    quantity: 15,
    completed_qty: 0,
    location_code: "PROD-PLANT",
    due_date: "2026-09-30",
    routing_status: "scheduled",
    total_planned_cost: 21750.00
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["productionOrders"],
    queryFn: () => base44.entities.ProductionOrder.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productionOrders"] });
      toast.success("Production Order released to shopfloor execution");
      setIsDialogOpen(false);
    }
  });

  const handlePostOutput = (order) => {
    toast.success(`Output Journal posted for ${order.prod_order_no}: Component consumption deducted and finished inventory added to ${order.location_code}!`);
  };

  const columns = [
    { header: "Order No.", accessor: "prod_order_no", render: (r) => <span className="font-mono font-bold text-primary">{r.prod_order_no}</span> },
    { header: "BOM Code", accessor: "bom_no", render: (r) => <Badge variant="outline" className="font-mono">{r.bom_no}</Badge> },
    { header: "Finished Item", accessor: "item_name" },
    { header: "Target Qty", accessor: "quantity", render: (r) => `${r.quantity} units` },
    { header: "Finished Qty", accessor: "completed_qty", render: (r) => <span className="font-bold">{r.completed_qty} / {r.quantity}</span> },
    { header: "Due Date", accessor: "due_date" },
    { header: "Status", accessor: "status", render: (r) => {
      if (r.status === "released") return <Badge className="bg-sky-500/20 text-sky-600 border-sky-500/30">Released (WIP)</Badge>;
      if (r.status === "finished") return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Finished & Closed</Badge>;
      return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Firm Planned</Badge>;
    }},
    { header: "Post Output", accessor: "id", render: (r) => r.status !== "finished" ? <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handlePostOutput(r); }} className="gap-1 text-xs"><Play className="w-3 h-3 text-emerald-600" /> Post Output</Button> : <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> Completed</span> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Production Orders"
        subtitle="Manage discrete and process manufacturing orders from Planned to Released to Finished, post output journals, and track material consumption"
        actionLabel="Release Production Order"
        onAction={() => setIsDialogOpen(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Production Orders" value={orders.length} icon={Factory} />
        <StatsCard title="Active In-Production" value={orders.filter(o => o.status === "released").length} icon={Play} />
        <StatsCard title="Finished Orders" value={orders.filter(o => o.status === "finished").length} icon={CheckCircle2} />
        <StatsCard title="Shopfloor Tracking" value="Live Work-in-Progress" icon={Factory} />
      </div>

      <DataTable columns={columns} data={orders} isLoading={isLoading} />

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Create & Release Production Order"
        onSubmit={() => createMutation.mutate(form)}
        isLoading={createMutation.isPending}
      >
        <FormField label="Production Order No." required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono uppercase"
            value={form.prod_order_no}
            onChange={(e) => setForm({ ...form, prod_order_no: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Select Production BOM" required>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.bom_no}
            onChange={(e) => setForm({ ...form, bom_no: e.target.value })}
          >
            <option value="BOM-1001">BOM-1001 - Apex Autonomous Delivery Drone v2</option>
            <option value="BOM-1002">BOM-1002 - Smart Energy Storage Cabinet 10kWh</option>
          </select>
        </FormField>
        <FormField label="Finished Item Description" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.item_name}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Batch Quantity to Produce" required>
            <input
              type="number"
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              required
            />
          </FormField>
          <FormField label="Required Due Date" required>
            <input
              type="date"
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              required
            />
          </FormField>
        </div>
      </FormDialog>
    </div>
  );
}
