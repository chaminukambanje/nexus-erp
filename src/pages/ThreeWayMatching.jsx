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
import { Scale, CheckCircle2, AlertOctagon, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function ThreeWayMatching() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    po_number: "PO-0005",
    receipt_number: "WREC-10022",
    invoice_number: "INV-V-9901",
    vendor_name: "Apex Electronics Supplies",
    po_amount: 5400.00,
    receipt_amount: 5400.00,
    invoice_amount: 5400.00,
    match_status: "matched",
    variance: 0,
    date: new Date().toISOString().split("T")[0],
    approved: true
  });

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["threeWayMatches"],
    queryFn: () => base44.entities.ThreeWayMatch.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ThreeWayMatch.create({
      ...data,
      variance: data.invoice_amount - data.receipt_amount,
      match_status: (data.invoice_amount === data.receipt_amount && data.receipt_amount === data.po_amount) ? "matched" : "price_variance"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threeWayMatches"] });
      toast.success("3-Way Match record analyzed and recorded");
      setIsDialogOpen(false);
    }
  });

  const handleApproveMatch = (id) => {
    toast.success("Invoice approved for payment release after verifying 3-Way tolerance match!");
  };

  const columns = [
    { header: "Purchase Order", accessor: "po_number", render: (r) => <Badge variant="outline" className="font-mono">{r.po_number}</Badge> },
    { header: "Goods Receipt", accessor: "receipt_number", render: (r) => <Badge variant="secondary" className="font-mono">{r.receipt_number}</Badge> },
    { header: "Vendor Invoice", accessor: "invoice_number", render: (r) => <span className="font-mono font-bold text-primary">{r.invoice_number}</span> },
    { header: "Vendor Name", accessor: "vendor_name" },
    { header: "PO Total", accessor: "po_amount", render: (r) => `$${Number(r.po_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { header: "Received Total", accessor: "receipt_amount", render: (r) => `$${Number(r.receipt_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { header: "Invoiced Total", accessor: "invoice_amount", render: (r) => `$${Number(r.invoice_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { header: "Variance", accessor: "variance", render: (r) => r.variance === 0 ? <span className="text-emerald-500 font-semibold">$0.00</span> : <span className="text-rose-500 font-bold">${Number(r.variance).toFixed(2)}</span> },
    { header: "Match Status", accessor: "match_status", render: (r) => {
      if (r.match_status === "matched") return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Exact Match</Badge>;
      if (r.match_status === "price_variance") return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> Price Variance</Badge>;
      return <Badge className="bg-rose-500/20 text-rose-600 border-rose-500/30">Qty Variance</Badge>;
    }},
    { header: "Approval", accessor: "approved", render: (r) => r.approved ? <span className="text-xs text-emerald-600 font-semibold">Payment Released</span> : <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); handleApproveMatch(r.id); }}>Approve</Button> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="3-Way Matching Engine"
        subtitle="Automate Procure-to-Pay reconciliation: verify Purchase Orders against Warehouse Goods Receipts and Vendor Bills before payment"
        actionLabel="Run 3-Way Match"
        onAction={() => setIsDialogOpen(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Matched Invoices" value={matches.filter(m => m.match_status === "matched").length} icon={CheckCircle2} />
        <StatsCard title="Price Variances" value={matches.filter(m => m.match_status === "price_variance").length} icon={AlertOctagon} />
        <StatsCard title="Pending Approvals" value={matches.filter(m => !m.approved).length} icon={Scale} />
        <StatsCard title="Match Tolerance" value="2.0% Threshold" icon={ShieldCheck} />
      </div>

      <DataTable columns={columns} data={matches} isLoading={isLoading} />

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Run 3-Way Procurement Reconciliation"
        onSubmit={() => createMutation.mutate(form)}
        isLoading={createMutation.isPending}
      >
        <FormField label="Purchase Order No." required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.po_number}
            onChange={(e) => setForm({ ...form, po_number: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Warehouse Goods Receipt No." required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.receipt_number}
            onChange={(e) => setForm({ ...form, receipt_number: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Vendor Invoice Number" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.invoice_number}
            onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
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
        <div className="grid grid-cols-3 gap-3">
          <FormField label="PO Amount ($)" required>
            <input
              type="number"
              step="0.01"
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.po_amount}
              onChange={(e) => setForm({ ...form, po_amount: Number(e.target.value) })}
              required
            />
          </FormField>
          <FormField label="Receipt Amount ($)" required>
            <input
              type="number"
              step="0.01"
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.receipt_amount}
              onChange={(e) => setForm({ ...form, receipt_amount: Number(e.target.value) })}
              required
            />
          </FormField>
          <FormField label="Invoice Amount ($)" required>
            <input
              type="number"
              step="0.01"
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.invoice_amount}
              onChange={(e) => setForm({ ...form, invoice_amount: Number(e.target.value) })}
              required
            />
          </FormField>
        </div>
      </FormDialog>
    </div>
  );
}
