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
import { QrCode, Search, ShieldAlert, History, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ItemTracking() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    item_code: "ITEM-7001",
    item_name: "Industrial Servo Motor 400W",
    tracking_type: "serial",
    tracking_number: `SN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    lot_number: "LOT-M26-B",
    expiry_date: "2029-12-31",
    location_code: "MAIN",
    bin_code: "RACK-A-01",
    status: "available",
    quantity: 1
  });

  const { data: trackingRecords = [], isLoading } = useQuery({
    queryKey: ["itemTracking"],
    queryFn: () => base44.entities.ItemTracking.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ItemTracking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itemTracking"] });
      toast.success("Serial/Lot Tracking record registered");
      setIsDialogOpen(false);
    }
  });

  const filteredRecords = trackingRecords.filter(r =>
    r.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.lot_number && r.lot_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTrace = (record) => {
    toast.info(`Traceability Tree loaded for ${record.tracking_number !== "N/A" ? record.tracking_number : record.lot_number}: Received on PO-0004 -> Quality Inspected -> Stored in ${record.location_code}`);
  };

  const columns = [
    { header: "Item No.", accessor: "item_code", render: (r) => <span className="font-mono font-bold text-primary">{r.item_code}</span> },
    { header: "Description", accessor: "item_name" },
    { header: "Tracking Type", accessor: "tracking_type", render: (r) => r.tracking_type === "serial" ? <Badge className="bg-sky-500/20 text-sky-600 border-sky-500/30">Serial No.</Badge> : <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">Lot / Batch</Badge> },
    { header: "Serial Number", accessor: "tracking_number", render: (r) => <span className="font-mono font-semibold">{r.tracking_number}</span> },
    { header: "Lot Number", accessor: "lot_number", render: (r) => <span className="font-mono">{r.lot_number || "-"}</span> },
    { header: "Location / Bin", accessor: "location_code", render: (r) => <span>{r.location_code} ({r.bin_code})</span> },
    { header: "Expiration Date", accessor: "expiry_date", render: (r) => r.expiry_date || "N/A" },
    { header: "Status", accessor: "status", render: (r) => r.status === "available" ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Available</Badge> : <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">In Production</Badge> },
    { header: "Trace", accessor: "id", render: (r) => <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={(e) => { e.stopPropagation(); handleTrace(r); }}><History className="w-3 h-3" /> Trace</Button> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Item Tracking & Serial/Lot Traceability"
        subtitle="Forward and backward item tracking for warranty, quality control, lot recalls, and expiration date monitoring"
        actionLabel="Register Serial/Lot"
        onAction={() => setIsDialogOpen(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Tracked Units" value={trackingRecords.length} icon={QrCode} />
        <StatsCard title="Serial Numbers" value={trackingRecords.filter(t => t.tracking_type === "serial").length} icon={CheckCircle} />
        <StatsCard title="Active Lots" value={trackingRecords.filter(t => t.tracking_type === "lot").length} icon={History} />
        <StatsCard title="Expiring Soon" value="0 Units" icon={ShieldAlert} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm"
            placeholder="Search Serial, Lot, or Item SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <DataTable columns={columns} data={filteredRecords} isLoading={isLoading} />

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Register Serial or Lot Number"
        onSubmit={() => createMutation.mutate(form)}
        isLoading={createMutation.isPending}
      >
        <FormField label="Item SKU" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono uppercase"
            value={form.item_code}
            onChange={(e) => setForm({ ...form, item_code: e.target.value })}
            placeholder="ITEM-7001"
            required
          />
        </FormField>
        <FormField label="Item Name" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.item_name}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tracking Type" required>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.tracking_type}
              onChange={(e) => setForm({ ...form, tracking_type: e.target.value })}
            >
              <option value="serial">Serial Number (Unique)</option>
              <option value="lot">Lot / Batch Number</option>
            </select>
          </FormField>
          <FormField label="Serial Number" required={form.tracking_type === "serial"}>
            <input
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.tracking_number}
              onChange={(e) => setForm({ ...form, tracking_number: e.target.value })}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Lot / Batch Code">
            <input
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.lot_number}
              onChange={(e) => setForm({ ...form, lot_number: e.target.value })}
              placeholder="LOT-2026-X"
            />
          </FormField>
          <FormField label="Expiration Date">
            <input
              type="date"
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={form.expiry_date || ""}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
            />
          </FormField>
        </div>
      </FormDialog>
    </div>
  );
}
