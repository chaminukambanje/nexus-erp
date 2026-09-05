import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatsCard from "@/components/shared/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Tags, Percent, ShieldCheck, DollarSign } from "lucide-react";

export default function CustomerPriceLists() {
  const { data: priceLists = [], isLoading } = useQuery({
    queryKey: ["customerPriceLists"],
    queryFn: () => base44.entities.CustomerPriceList.list()
  });

  const columns = [
    { header: "Price List Code", accessor: "code", render: (r) => <span className="font-mono font-bold text-primary">{r.code}</span> },
    { header: "Name", accessor: "name" },
    { header: "Currency", accessor: "currency", render: (r) => <Badge variant="outline">{r.currency}</Badge> },
    { header: "Valid Starting", accessor: "valid_from" },
    { header: "Configured Rules", accessor: "tier_rules", render: (r) => `${r.tier_rules} Volume Tiers` },
    { header: "Status", accessor: "status", render: (r) => <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Active</Badge> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Customer Sales Price Lists & Discounts"
        subtitle="Manage customer-specific contract pricing, volume tier breaks, promotional campaigns, and line discount matrices"
        actionLabel="New Price List"
        onAction={() => {}}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Active Price Lists" value={priceLists.length} icon={Tags} />
        <StatsCard title="Special Contract Prices" value="12 Active" icon={DollarSign} />
        <StatsCard title="Volume Tiers" value="Multi-Break" icon={Percent} />
        <StatsCard title="Price Hierarchy" value="D365 Priority Rules" icon={ShieldCheck} />
      </div>

      <DataTable columns={columns} data={priceLists} isLoading={isLoading} />
    </div>
  );
}
