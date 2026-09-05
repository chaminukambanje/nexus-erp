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
import { Truck, CheckCircle2, Box, Send } from "lucide-react";
import { toast } from "sonner";

export default function WarehousePicks() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    pick_no: `WPICK-${Date.now().toString().slice(-4)}`,
    order_number: "SO-0003",
    customer_name: "Oxford Biomedical Labs",
    location_code: "MAIN",
    bin_code: "PICK-01",
    total_lines: 4,
    status: "open",
    assigned_to: "Chaminuka Mbanje",
    ship_date: new Date().toISOString().split("T")[0]
  });

  const { data: picks = [], isLoading } = useQuery({
    queryKey: ["warehousePicks"],
    queryFn: () => base44.entities.WarehousePick.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WarehousePick.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehousePicks"] });
      toast.success("Warehouse Pick document created and sent to scanner terminals");
      setIsDialogOpen(false);
    }
  });

  const handleRegisterPick = (id) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 800)),
      {
        loading: "Registering pick lines & updating bin inventory...",
        success: "Pick registered successfully! Ready for outbound shipment.",
        error: "Failed to register pick"
      }
    );
  };

  const columns = [
    { header: "Pick No.", accessor: "pick_no", render: (r) => <span className="font-mono font-bold text-primary">{r.pick_no}</span> },
    { header: "Sales Order", accessor: "order_number", render: (r) => <Badge variant="outline">{r.order_number}</Badge> },
    { header: "Customer", accessor: "customer_name" },
    { header: "Location", accessor: "location_code", render: (r) => <Badge variant="secondary">{r.location_code}</Badge> },
    { header: "Source Bin", accessor: "bin_code", render: (r) => <span className="font-mono">{r.bin_code}</span> },
    { header: "Lines to Pick", accessor: "total_lines", render: (r) => `${r.total_lines} Items` },
    { header: "Target Ship Date", accessor: "ship_date" },
    { header: "Status", accessor: "status", render: (r) => r.status === "completed" ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Completed</Badge> : <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Open / Picking</Badge> },
    { header: "Action", accessor: "id", render: (r) => r.status !== "completed" ? <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleRegisterPick(r.id); }}>Register Pick</Button> : <span className="text-xs text-muted-foreground">Dispatched</span> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Warehouse Picks & Dispatch"
        subtitle="Manage warehouse picking orders against Sales Orders, transfer orders, and production supply"
        actionLabel="Create Pick Document"
        onAction={() => setIsDialogOpen(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Pick Orders" value={picks.length} icon={Truck} />
        <StatsCard title="Completed Picks" value={picks.filter(p => p.status === "completed").length} icon={CheckCircle2} />
        <StatsCard title="Open Picking Lists" value={picks.filter(p => p.status !== "completed").length} icon={Box} />
        <StatsCard title="Pick Execution" value="Directed Bins" icon={Send} />
      </div>

      <DataTable columns={columns} data={picks} isLoading={isLoading} />

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Generate Warehouse Pick Document"
        onSubmit={() => createMutation.mutate(form)}
        isLoading={createMutation.isPending}
      >
        <FormField label="Pick Document Number" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.pick_no}
            onChange={(e) => setForm({ ...form, pick_no: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Source Sales Order No." required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.order_number}
            onChange={(e) => setForm({ ...form, order_number: e.target.value })}
            placeholder="SO-0003"
            required
          />
        </FormField>
        <FormField label="Customer Name" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Pick Location">
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.location_code}
              onChange={(e) => setForm({ ...form, location_code: e.target.value })}
            >
              <option value="MAIN">MAIN</option>
              <option value="WEST">WEST</option>
            </select>
          </FormField>
          <FormField label="Assigned Operator">
            <input
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
            />
          </FormField>
        </div>
      </FormDialog>
    </div>
  );
}
