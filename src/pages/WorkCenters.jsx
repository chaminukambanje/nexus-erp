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
import { Wrench, Clock, Activity, Gauge } from "lucide-react";
import { toast } from "sonner";

export default function WorkCenters() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    code: "WC-400",
    name: "Automated Robotic Welding Cell",
    work_center_group: "FABRICATION",
    capacity_hours_per_day: 20,
    efficiency_pct: 95,
    standard_unit_cost: 85.00,
    setup_time_min: 25
  });

  const { data: workCenters = [], isLoading } = useQuery({
    queryKey: ["workCenters"],
    queryFn: () => base44.entities.WorkCenter.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkCenter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workCenters"] });
      toast.success("Work Center & Routing Capacity registered");
      setIsDialogOpen(false);
    }
  });

  const columns = [
    { header: "Work Center Code", accessor: "code", render: (r) => <span className="font-mono font-bold text-primary">{r.code}</span> },
    { header: "Center Name", accessor: "name" },
    { header: "Group", accessor: "work_center_group", render: (r) => <Badge variant="outline">{r.work_center_group}</Badge> },
    { header: "Daily Capacity", accessor: "capacity_hours_per_day", render: (r) => `${r.capacity_hours_per_day} hrs / day` },
    { header: "Standard Rate", accessor: "standard_unit_cost", render: (r) => `$${Number(r.standard_unit_cost).toFixed(2)} / hr` },
    { header: "Efficiency %", accessor: "efficiency_pct", render: (r) => <span className="font-semibold text-emerald-600">{r.efficiency_pct}%</span> },
    { header: "Setup Time", accessor: "setup_time_min", render: (r) => `${r.setup_time_min} mins` }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Work Centers & Machine Routings"
        subtitle="Manage shopfloor production work centers, machine centers, setup & run times, standard labor costs, and capacity calendar"
        actionLabel="New Work Center"
        onAction={() => setIsDialogOpen(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Work Centers" value={workCenters.length} icon={Wrench} />
        <StatsCard title="Total Daily Capacity" value={`${workCenters.reduce((s, w) => s + (w.capacity_hours_per_day || 0), 0)} Hours`} icon={Clock} />
        <StatsCard title="Avg Shop Efficiency" value="93.8%" icon={Activity} />
        <StatsCard title="Routing Engine" value="Standard Dynamics" icon={Gauge} />
      </div>

      <DataTable columns={columns} data={workCenters} isLoading={isLoading} />

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Create Work Center / Machine Center"
        onSubmit={() => createMutation.mutate(form)}
        isLoading={createMutation.isPending}
      >
        <FormField label="Work Center Code" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono uppercase"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            required
          />
        </FormField>
        <FormField label="Work Center Description" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Work Center Group" required>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.work_center_group}
              onChange={(e) => setForm({ ...form, work_center_group: e.target.value })}
            >
              <option value="FABRICATION">FABRICATION</option>
              <option value="ASSEMBLY">ASSEMBLY</option>
              <option value="TESTING">TESTING & QA</option>
              <option value="PACKAGING">PACKAGING</option>
            </select>
          </FormField>
          <FormField label="Standard Hourly Rate ($)" required>
            <input
              type="number"
              step="0.5"
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.standard_unit_cost}
              onChange={(e) => setForm({ ...form, standard_unit_cost: Number(e.target.value) })}
              required
            />
          </FormField>
        </div>
      </FormDialog>
    </div>
  );
}
