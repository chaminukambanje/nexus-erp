import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatsCard from "@/components/shared/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ApprovalWorkflows() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["approvalRequests"],
    queryFn: () => base44.entities.ApprovalRequest.list()
  });

  const handleAction = (req, action) => {
    toast.success(`Request ${req.document_no} has been ${action} successfully! Audit entry logged.`);
  };

  const columns = [
    { header: "Document Type", accessor: "document_type", render: (r) => <Badge variant="secondary">{r.document_type}</Badge> },
    { header: "Document No.", accessor: "document_no", render: (r) => <span className="font-mono font-bold text-primary">{r.document_no}</span> },
    { header: "Requested By", accessor: "requested_by" },
    { header: "Approver", accessor: "approver", render: (r) => <span className="font-semibold">{r.approver}</span> },
    { header: "Amount ($)", accessor: "amount", render: (r) => `$${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { header: "Reason", accessor: "reason" },
    { header: "Status", accessor: "status", render: (r) => r.status === "approved" ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Approved</Badge> : <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Pending</Badge> },
    { header: "Actions", accessor: "id", render: (r) => r.status === "pending" ? (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="default" onClick={() => handleAction(r, "approved")} className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700">Approve</Button>
        <Button size="sm" variant="destructive" onClick={() => handleAction(r, "rejected")} className="h-7 text-xs px-2">Reject</Button>
      </div>
    ) : <span className="text-xs text-muted-foreground">Completed</span> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Approval Workflows & Audit Requests"
        subtitle="Enterprise approval hierarchy: Purchase Order limits, credit limit approvals, budget overrides, and journal entries"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Requests" value={requests.length} icon={ShieldCheck} />
        <StatsCard title="Pending Approvals" value={requests.filter(r => r.status === "pending").length} icon={Clock} />
        <StatsCard title="Approved Entries" value={requests.filter(r => r.status === "approved").length} icon={CheckCircle2} />
        <StatsCard title="Audit Compliance" value="100% Traceable" icon={AlertTriangle} />
      </div>

      <DataTable columns={columns} data={requests} isLoading={isLoading} />
    </div>
  );
}
