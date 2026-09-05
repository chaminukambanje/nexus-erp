import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatsCard from "@/components/shared/StatsCard";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Clock, CheckCircle2, FileCheck } from "lucide-react";

export default function ServiceContracts() {
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["serviceContracts"],
    queryFn: () => base44.entities.ServiceContract.list()
  });

  const columns = [
    { header: "Contract No.", accessor: "contract_no", render: (r) => <span className="font-mono font-bold text-primary">{r.contract_no}</span> },
    { header: "Customer", accessor: "customer_name" },
    { header: "SLA Plan", accessor: "service_type" },
    { header: "Response Target", accessor: "response_time_hours", render: (r) => <Badge className="bg-primary/20 text-primary border-primary/30"><Clock className="w-3 h-3 mr-1" /> {r.response_time_hours} hrs SLA</Badge> },
    { header: "Annual Contract Value", accessor: "annual_value", render: (r) => `$${Number(r.annual_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { header: "Validity Period", accessor: "start_date", render: (r) => `${r.start_date} to ${r.end_date}` },
    { header: "Status", accessor: "status", render: (r) => <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Active</Badge> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Service Contracts & Customer SLAs"
        subtitle="Manage warranty agreements, maintenance contracts, prepaid service hours, and response time commitments"
        actionLabel="New Service Contract"
        onAction={() => {}}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Active Contracts" value={contracts.length} icon={FileCheck} />
        <StatsCard title="Total Annual Value" value={`$${contracts.reduce((s, c) => s + (c.annual_value || 0), 0).toLocaleString()}`} icon={CheckCircle2} />
        <StatsCard title="Fastest SLA" value="2.0 Hours" icon={Clock} />
        <StatsCard title="Compliance Rate" value="99.4%" icon={ShieldAlert} />
      </div>

      <DataTable columns={columns} data={contracts} isLoading={isLoading} />
    </div>
  );
}
