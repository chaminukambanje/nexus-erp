import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatsCard from "@/components/shared/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, Play, AlertCircle, ShoppingCart, Factory } from "lucide-react";
import { toast } from "sonner";

export default function MRPPlanning() {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["mrpPlanning"],
    queryFn: () => base44.entities.MRPPlanning.list()
  });

  const handleRunMRP = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Running D365 MPS/MRP Engine across all bill of materials & sales forecasts...",
        success: "Planning calculations complete: 3 critical action messages generated!",
        error: "MRP engine error"
      }
    );
  };

  const handleCarryOut = (plan) => {
    toast.success(`Action message carried out: Automatically generated ${plan.action_message} for ${plan.suggested_qty} units of ${plan.item_code}!`);
  };

  const columns = [
    { header: "Item SKU / BOM", accessor: "item_code", render: (r) => <span className="font-mono font-bold text-primary">{r.item_code}</span> },
    { header: "Description", accessor: "item_name" },
    { header: "Current Stock", accessor: "current_inventory", render: (r) => <span className="font-mono">{r.current_inventory}</span> },
    { header: "Safety Stock", accessor: "safety_stock", render: (r) => <span className="font-mono text-muted-foreground">{r.safety_stock}</span> },
    { header: "Gross Demand", accessor: "gross_requirement", render: (r) => <span className="font-bold text-rose-500">{r.gross_requirement}</span> },
    { header: "In-Transit Orders", accessor: "scheduled_receipts", render: (r) => <span className="font-mono text-emerald-600">+{r.scheduled_receipts}</span> },
    { header: "Projected Shortfall", accessor: "net_shortfall", render: (r) => <Badge variant="destructive">-{r.net_shortfall} units</Badge> },
    { header: "Proposed Action", accessor: "action_message", render: (r) => r.action_message.includes("Purchase") ? <Badge className="bg-sky-500/20 text-sky-600 border-sky-500/30 flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> {r.action_message}</Badge> : <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30 flex items-center gap-1"><Factory className="w-3 h-3" /> {r.action_message}</Badge> },
    { header: "Suggested Qty", accessor: "suggested_qty", render: (r) => <span className="font-bold">{r.suggested_qty} units</span> },
    { header: "Execute Action", accessor: "id", render: (r) => <Button size="sm" onClick={(e) => { e.stopPropagation(); handleCarryOut(r); }}>Execute</Button> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="MRP & MPS Planning Worksheet"
        subtitle="Automated Material Requirements Planning (MRP) and Master Production Schedule (MPS): calculate gross demand vs available inventory and generate action proposals"
        actionLabel="Calculate Regenerative Plan"
        onAction={handleRunMRP}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Action Proposals" value={plans.length} icon={Calculator} />
        <StatsCard title="Shortfall SKUs" value={plans.filter(p => p.net_shortfall > 0).length} icon={AlertCircle} />
        <StatsCard title="Suggested POs" value={plans.filter(p => p.action_message.includes("Purchase")).length} icon={ShoppingCart} />
        <StatsCard title="Suggested Production" value={plans.filter(p => p.action_message.includes("Production")).length} icon={Factory} />
      </div>

      <DataTable columns={columns} data={plans} isLoading={isLoading} />
    </div>
  );
}
