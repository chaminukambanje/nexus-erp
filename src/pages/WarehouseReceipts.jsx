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
import { PackageCheck, ArrowDownToLine, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function WarehouseReceipts() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    receipt_no: `WREC-${Date.now().toString().slice(-5)}`,
    po_number: "PO-0004",
    vendor_name: "Industrial Metals Corp",
    location_code: "MAIN",
    bin_code: "REC-01",
    total_qty: 100,
    posting_date: new Date().toISOString().split("T")[0],
    received_by: "Chaminuka Mbanje",
    status: "received"
  });

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["warehouseReceipts"],
    queryFn: () => base44.entities.WarehouseReceipt.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WarehouseReceipt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouseReceipts"] });
      toast.success("Warehouse Receipt posted and put-away lines generated");
      setIsDialogOpen(false);
    }
  });

  const columns = [
    { header: "Receipt No.", accessor: "receipt_no", render: (r) => <span className="font-mono font-bold text-primary">{r.receipt_no}</span> },
    { header: "Source PO", accessor: "po_number", render: (r) => <Badge variant="outline">{r.po_number}</Badge> },
    { header: "Vendor", accessor: "vendor_name" },
    { header: "Location", accessor: "location_code", render: (r) => <Badge variant="secondary">{r.location_code}</Badge> },
    { header: "Staging Bin", accessor: "bin_code", render: (r) => <span className="font-mono">{r.bin_code || "REC-01"}</span> },
    { header: "Quantity Received", accessor: "total_qty", render: (r) => <span className="font-bold">{r.total_qty} units</span> },
    { header: "Posting Date", accessor: "posting_date" },
    { header: "Status", accessor: "status", render: (r) => r.status === "received" ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Posted & Received</Badge> : <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">In Progress</Badge> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Warehouse Receipts"
        subtitle="Record inbound receipts against Purchase Orders, assign staging bins, and initiate directed put-aways"
        actionLabel="Post New Receipt"
        onAction={() => setIsDialogOpen(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Receipts" value={receipts.length} icon={PackageCheck} />
        <StatsCard title="Completed Receipts" value={receipts.filter(r => r.status === "received").length} icon={CheckCircle2} />
        <StatsCard title="Active Put-Aways" value="3 Open" icon={ArrowDownToLine} />
        <StatsCard title="Avg Turnaround" value="1.4 hrs" icon={Clock} />
      </div>

      <DataTable columns={columns} data={receipts} isLoading={isLoading} />

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Post Inbound Warehouse Receipt"
        onSubmit={() => createMutation.mutate(form)}
        isLoading={createMutation.isPending}
      >
        <FormField label="Warehouse Receipt No." required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.receipt_no}
            onChange={(e) => setForm({ ...form, receipt_no: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Source Purchase Order" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.po_number}
            onChange={(e) => setForm({ ...form, po_number: e.target.value })}
            placeholder="PO-0004"
            required
          />
        </FormField>
        <FormField label="Vendor Name" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.vendor_name}
            onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Warehouse Location" required>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.location_code}
              onChange={(e) => setForm({ ...form, location_code: e.target.value })}
            >
              <option value="MAIN">MAIN</option>
              <option value="WEST">WEST</option>
              <option value="PROD-PLANT">PROD-PLANT</option>
            </select>
          </FormField>
          <FormField label="Staging Bin" required>
            <input
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono uppercase"
              value={form.bin_code}
              onChange={(e) => setForm({ ...form, bin_code: e.target.value })}
              placeholder="REC-01"
              required
            />
          </FormField>
        </div>
        <FormField label="Quantity Received (Units)" required>
          <input
            type="number"
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.total_qty}
            onChange={(e) => setForm({ ...form, total_qty: Number(e.target.value) })}
            required
          />
        </FormField>
      </FormDialog>
    </div>
  );
}
