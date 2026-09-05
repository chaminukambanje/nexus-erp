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
import { ClipboardCheck, ShoppingBag, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function PurchaseRequisitions() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    req_number: `REQ-${new Date().getFullYear()}-0${Math.floor(10 + Math.random() * 90)}`,
    requested_by: "Chaminuka Mbanje",
    department: "ENG",
    item_name: "Industrial Power Converters 24V",
    quantity: 10,
    estimated_unit_cost: 110.00,
    justification: "Critical spares for production line 2",
    date: new Date().toISOString().split("T")[0],
    status: "pending_approval"
  });

  const { data: requisitions = [], isLoading } = useQuery({
    queryKey: ["purchaseRequisitions"],
    queryFn: () => base44.entities.PurchaseRequisition.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseRequisition.create({
      ...data,
      total_cost: data.quantity * data.estimated_unit_cost
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseRequisitions"] });
      toast.success("Purchase Requisition submitted into approval workflow");
      setIsDialogOpen(false);
    }
  });

  const handleApprove = (id) => {
    toast.success("Requisition approved and converted into RFQ / Purchase Order!");
  };

  const columns = [
    { header: "Requisition No.", accessor: "req_number", render: (r) => <span className="font-mono font-bold text-primary">{r.req_number}</span> },
    { header: "Requested By", accessor: "requested_by" },
    { header: "Department", accessor: "department", render: (r) => <Badge variant="outline">{r.department}</Badge> },
    { header: "Item Requested", accessor: "item_name" },
    { header: "Quantity", accessor: "quantity", render: (r) => `${r.quantity} units` },
    { header: "Est. Total Cost", accessor: "total_cost", render: (r) => `$${Number(r.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { header: "Date", accessor: "date" },
    { header: "Status", accessor: "status", render: (r) => r.status === "approved" ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Approved</Badge> : <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Pending Approval</Badge> },
    { header: "Action", accessor: "id", render: (r) => r.status !== "approved" ? <Button size="sm" onClick={(e) => { e.stopPropagation(); handleApprove(r.id); }}>Approve & Order</Button> : <span className="text-xs text-muted-foreground">PO Issued</span> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Purchase Requisitions"
        subtitle="Departmental procurement requests, budget approval workflows, and automated conversion to Purchase Orders"
        actionLabel="New Requisition"
        onAction={() => setIsDialogOpen(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Requisitions" value={requisitions.length} icon={ClipboardCheck} />
        <StatsCard title="Pending Approval" value={requisitions.filter(r => r.status !== "approved").length} icon={Clock} />
        <StatsCard title="Approved to PO" value={requisitions.filter(r => r.status === "approved").length} icon={CheckCircle2} />
        <StatsCard title="Workflow Rules" value="Active" icon={ShoppingBag} />
      </div>

      <DataTable columns={columns} data={requisitions} isLoading={isLoading} />

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Submit Purchase Requisition"
        onSubmit={() => createMutation.mutate(form)}
        isLoading={createMutation.isPending}
      >
        <FormField label="Requested By" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.requested_by}
            onChange={(e) => setForm({ ...form, requested_by: e.target.value })}
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Department" required>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              <option value="ENG">ENG (Engineering)</option>
              <option value="PROD">PROD (Production)</option>
              <option value="SALES">SALES (Sales)</option>
              <option value="LOG">LOG (Logistics)</option>
              <option value="ADMIN">ADMIN (Administration)</option>
            </select>
          </FormField>
          <FormField label="Item / Description" required>
            <input
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
              required
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Quantity Needed" required>
            <input
              type="number"
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              required
            />
          </FormField>
          <FormField label="Estimated Unit Cost ($)" required>
            <input
              type="number"
              step="0.01"
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.estimated_unit_cost}
              onChange={(e) => setForm({ ...form, estimated_unit_cost: Number(e.target.value) })}
              required
            />
          </FormField>
        </div>
        <FormField label="Business Justification">
          <textarea
            className="w-full h-20 p-3 rounded-md border border-input bg-background text-sm"
            value={form.justification}
            onChange={(e) => setForm({ ...form, justification: e.target.value })}
          />
        </FormField>
      </FormDialog>
    </div>
  );
}
