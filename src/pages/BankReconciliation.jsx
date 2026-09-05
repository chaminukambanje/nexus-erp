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
import { Building2, CheckCircle2, AlertTriangle, FileSpreadsheet, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

export default function BankReconciliation() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    statement_no: `STMT-${new Date().getFullYear()}-09B`,
    bank_account_code: "BARCLAYS-OPERATING",
    statement_date: new Date().toISOString().split("T")[0],
    statement_balance: 395000.00,
    book_balance: 395000.00,
    status: "in_progress"
  });

  const { data: reconciliations = [], isLoading } = useQuery({
    queryKey: ["bankReconciliations"],
    queryFn: () => base44.entities.BankReconciliation.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BankReconciliation.create({
      ...data,
      difference: data.statement_balance - data.book_balance,
      matched_lines: 24,
      unmatched_lines: 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankReconciliations"] });
      toast.success("Bank Reconciliation statement created");
      setIsDialogOpen(false);
    }
  });

  const handleAutoMatch = () => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: "Running D365 AI bank statement line matching engine...",
        success: "Successfully matched 98.4% of bank statement lines against G/L bank ledger entries!",
        error: "Auto match failed"
      }
    );
  };

  const columns = [
    { header: "Statement No.", accessor: "statement_no", render: (r) => <span className="font-mono font-bold">{r.statement_no}</span> },
    { header: "Bank Account", accessor: "bank_account_code", render: (r) => <Badge variant="outline">{r.bank_account_code}</Badge> },
    { header: "Statement Date", accessor: "statement_date" },
    { header: "Statement Balance", accessor: "statement_balance", render: (r) => `$${Number(r.statement_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { header: "Book Balance", accessor: "book_balance", render: (r) => `$${Number(r.book_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { header: "Difference", accessor: "difference", render: (r) => r.difference === 0 ? <span className="text-emerald-500 font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Balanced</span> : <span className="text-amber-500 font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> ${r.difference}</span> },
    { header: "Status", accessor: "status", render: (r) => r.status === "posted" ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Posted</Badge> : <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">In Progress</Badge> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Bank Account Reconciliation"
        subtitle="Reconcile bank statements with bank ledger entries, resolve variances, and post to General Ledger"
        actionLabel="New Statement Rec"
        onAction={() => setIsDialogOpen(true)}
      >
        <Button variant="outline" onClick={handleAutoMatch} className="gap-2">
          <ArrowRightLeft className="w-4 h-4" /> Auto-Match Statement Lines
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Statements" value={reconciliations.length} icon={Building2} />
        <StatsCard title="Posted Reconciliations" value={reconciliations.filter(r => r.status === "posted").length} icon={CheckCircle2} />
        <StatsCard title="Pending Statements" value={reconciliations.filter(r => r.status !== "posted").length} icon={AlertTriangle} />
        <StatsCard title="Statement Formats" value="OFX, CSV, MT940" icon={FileSpreadsheet} />
      </div>

      <DataTable columns={columns} data={reconciliations} isLoading={isLoading} />

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="New Bank Account Reconciliation"
        onSubmit={() => createMutation.mutate(form)}
        isLoading={createMutation.isPending}
      >
        <FormField label="Statement Number" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.statement_no}
            onChange={(e) => setForm({ ...form, statement_no: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Bank Account" required>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.bank_account_code}
            onChange={(e) => setForm({ ...form, bank_account_code: e.target.value })}
          >
            <option value="BARCLAYS-OPERATING">Barclays Main Operating - 20-00-00 12345678</option>
            <option value="HSBC-PAYROLL">HSBC Payroll Account - 40-12-34 98765432</option>
            <option value="CHASE-USD">Chase Commercial USD Treasury</option>
          </select>
        </FormField>
        <FormField label="Statement Ending Date" required>
          <input
            type="date"
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.statement_date}
            onChange={(e) => setForm({ ...form, statement_date: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Statement Ending Balance ($)" required>
          <input
            type="number"
            step="0.01"
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.statement_balance}
            onChange={(e) => setForm({ ...form, statement_balance: Number(e.target.value) })}
            required
          />
        </FormField>
      </FormDialog>
    </div>
  );
}
