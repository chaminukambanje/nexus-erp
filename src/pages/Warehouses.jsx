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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Warehouse, Grid, Plus, CheckCircle2, Box } from "lucide-react";
import { toast } from "sonner";

export default function Warehouses() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("locations");
  const [isLocDialogOpen, setIsLocDialogOpen] = useState(false);
  const [isBinDialogOpen, setIsBinDialogOpen] = useState(false);

  const [locForm, setLocForm] = useState({ code: "", name: "", address: "", bins_active: true, phone: "" });
  const [binForm, setBinForm] = useState({ location_code: "MAIN", zone: "STORAGE", code: "", description: "", max_weight_kg: 2500 });

  const { data: locations = [], isLoading: isLoadingLocs } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => base44.entities.WarehouseLocation.list()
  });

  const { data: bins = [], isLoading: isLoadingBins } = useQuery({
    queryKey: ["warehouseBins"],
    queryFn: () => base44.entities.WarehouseBin.list()
  });

  const createLocMutation = useMutation({
    mutationFn: (data) => base44.entities.WarehouseLocation.create({ ...data, total_bins: 0, is_default: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Warehouse Location created successfully");
      setIsLocDialogOpen(false);
      setLocForm({ code: "", name: "", address: "", bins_active: true, phone: "" });
    }
  });

  const createBinMutation = useMutation({
    mutationFn: (data) => base44.entities.WarehouseBin.create({ ...data, current_items: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouseBins"] });
      toast.success("Storage Bin registered successfully");
      setIsBinDialogOpen(false);
      setBinForm({ location_code: "MAIN", zone: "STORAGE", code: "", description: "", max_weight_kg: 2500 });
    }
  });

  const locColumns = [
    { header: "Location Code", accessor: "code", render: (r) => <span className="font-mono font-bold">{r.code}</span> },
    { header: "Location Name", accessor: "name" },
    { header: "Address", accessor: "address" },
    { header: "Bin Mandatory", accessor: "bins_active", render: (r) => r.bins_active ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Directed Bins Active</Badge> : <Badge variant="secondary">Standard</Badge> },
    { header: "Configured Bins", accessor: "total_bins", render: (r) => <span className="font-semibold">{r.total_bins || bins.filter(b => b.location_code === r.code).length}</span> },
    { header: "Contact", accessor: "phone" }
  ];

  const binColumns = [
    { header: "Location", accessor: "location_code", render: (r) => <Badge variant="secondary">{r.location_code}</Badge> },
    { header: "Zone", accessor: "zone", render: (r) => <Badge variant="outline">{r.zone}</Badge> },
    { header: "Bin Code", accessor: "code", render: (r) => <span className="font-mono font-bold text-primary">{r.code}</span> },
    { header: "Description", accessor: "description" },
    { header: "Max Capacity (kg)", accessor: "max_weight_kg", render: (r) => `${r.max_weight_kg} kg` },
    { header: "Stocked SKUs", accessor: "current_items", render: (r) => <Badge variant="secondary">{r.current_items} SKUs</Badge> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Warehouses & Bin Management"
        subtitle="Manage multi-location inventory, warehouse zones, storage racks, and directed put-away/pick bins"
        actionLabel="New Location"
        onAction={() => setIsLocDialogOpen(true)}
      >
        <Button variant="outline" onClick={() => setIsBinDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Storage Bin
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Warehouse Locations" value={locations.length} icon={Warehouse} />
        <StatsCard title="Active Storage Bins" value={bins.length} icon={Grid} />
        <StatsCard title="Directed Pick Locations" value={locations.filter(l => l.bins_active).length} icon={CheckCircle2} />
        <StatsCard title="In-Transit Hubs" value="1 Virtual Hub" icon={Box} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="locations">Locations Master</TabsTrigger>
          <TabsTrigger value="bins">Warehouse Bins</TabsTrigger>
        </TabsList>

        <TabsContent value="locations">
          <DataTable columns={locColumns} data={locations} isLoading={isLoadingLocs} />
        </TabsContent>

        <TabsContent value="bins">
          <DataTable columns={binColumns} data={bins} isLoading={isLoadingBins} />
        </TabsContent>
      </Tabs>

      {/* New Location Dialog */}
      <FormDialog
        open={isLocDialogOpen}
        onOpenChange={setIsLocDialogOpen}
        title="Add Warehouse Location"
        onSubmit={() => createLocMutation.mutate(locForm)}
        isLoading={createLocMutation.isPending}
      >
        <FormField label="Location Code (e.g. MAIN, WEST)" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono uppercase"
            value={locForm.code}
            onChange={(e) => setLocForm({ ...locForm, code: e.target.value.toUpperCase() })}
            placeholder="NORTH"
            required
          />
        </FormField>
        <FormField label="Location Name" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={locForm.name}
            onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
            placeholder="Manchester Distribution Center"
            required
          />
        </FormField>
        <FormField label="Physical Address">
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={locForm.address}
            onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
            placeholder="Unit 4, Trafford Park, Manchester"
          />
        </FormField>
        <FormField label="Contact Phone">
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={locForm.phone}
            onChange={(e) => setLocForm({ ...locForm, phone: e.target.value })}
            placeholder="+44 161 555 0190"
          />
        </FormField>
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="loc_bins"
            checked={locForm.bins_active}
            onChange={(e) => setLocForm({ ...locForm, bins_active: e.target.checked })}
          />
          <label htmlFor="loc_bins" className="text-sm font-medium">Require Bins for Put-away and Picking</label>
        </div>
      </FormDialog>

      {/* New Bin Dialog */}
      <FormDialog
        open={isBinDialogOpen}
        onOpenChange={setIsBinDialogOpen}
        title="Add Storage Bin"
        onSubmit={() => createBinMutation.mutate(binForm)}
        isLoading={createBinMutation.isPending}
      >
        <FormField label="Warehouse Location" required>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={binForm.location_code}
            onChange={(e) => setBinForm({ ...binForm, location_code: e.target.value })}
          >
            {locations.map(l => (
              <option key={l.id} value={l.code}>{l.code} - {l.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Zone" required>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={binForm.zone}
            onChange={(e) => setBinForm({ ...binForm, zone: e.target.value })}
          >
            <option value="RECEIVING">RECEIVING (Staging Inbound)</option>
            <option value="STORAGE">STORAGE (Bulk / High-density)</option>
            <option value="PICKING">PICKING (Fast-pick Face)</option>
            <option value="SHIPPING">SHIPPING (Dispatch Bay)</option>
            <option value="SHOPFLOOR">SHOPFLOOR (Production WIP)</option>
          </select>
        </FormField>
        <FormField label="Bin Code (e.g. RACK-B-04)" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono uppercase"
            value={binForm.code}
            onChange={(e) => setBinForm({ ...binForm, code: e.target.value.toUpperCase() })}
            placeholder="RACK-B-01"
            required
          />
        </FormField>
        <FormField label="Description">
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={binForm.description}
            onChange={(e) => setBinForm({ ...binForm, description: e.target.value })}
            placeholder="Aisle B Lower Shelf Level 1"
          />
        </FormField>
        <FormField label="Maximum Weight Capacity (kg)">
          <input
            type="number"
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={binForm.max_weight_kg}
            onChange={(e) => setBinForm({ ...binForm, max_weight_kg: Number(e.target.value) })}
          />
        </FormField>
      </FormDialog>
    </div>
  );
}
