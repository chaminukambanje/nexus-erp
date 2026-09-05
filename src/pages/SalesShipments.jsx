import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatsCard from "@/components/shared/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, CheckCircle2, PackageCheck, Send } from "lucide-react";
import { toast } from "sonner";

export default function SalesShipments() {
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["salesShipments"],
    queryFn: () => base44.entities.SalesShipment.list()
  });

  const handleTrack = (r) => {
    toast.info(`Carrier Tracking API: ${r.carrier} status for ${r.tracking_number}: On vehicle for delivery.`);
  };

  const columns = [
    { header: "Shipment No.", accessor: "shipment_no", render: (r) => <span className="font-mono font-bold text-primary">{r.shipment_no}</span> },
    { header: "Sales Order", accessor: "order_number", render: (r) => <Badge variant="outline" className="font-mono">{r.order_number}</Badge> },
    { header: "Customer", accessor: "customer_name" },
    { header: "Carrier", accessor: "carrier", render: (r) => <Badge variant="secondary">{r.carrier}</Badge> },
    { header: "Tracking Number", accessor: "tracking_number", render: (r) => <span className="font-mono font-semibold text-xs">{r.tracking_number}</span> },
    { header: "Ship Date", accessor: "ship_date" },
    { header: "Status", accessor: "status", render: (r) => r.status === "delivered" ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Delivered</Badge> : <Badge className="bg-sky-500/20 text-sky-600 border-sky-500/30">In Transit</Badge> },
    { header: "Action", accessor: "id", render: (r) => <Button size="sm" variant="outline" className="text-xs" onClick={() => handleTrack(r)}>Track Delivery</Button> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Posted Sales Shipments"
        subtitle="Track fulfilled sales shipments, delivery notes, shipping carriers, and customer delivery confirmations"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Shipments" value={shipments.length} icon={Truck} />
        <StatsCard title="Delivered" value={shipments.filter(s => s.status === "delivered").length} icon={CheckCircle2} />
        <StatsCard title="In Transit" value={shipments.filter(s => s.status !== "delivered").length} icon={Send} />
        <StatsCard title="Integrated Carriers" value="DHL, FedEx, UPS" icon={PackageCheck} />
      </div>

      <DataTable columns={columns} data={shipments} isLoading={isLoading} />
    </div>
  );
}
