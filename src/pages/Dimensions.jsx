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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Tags, Plus, CheckCircle2, ShieldCheck, PieChart } from "lucide-react";
import { toast } from "sonner";

export default function Dimensions() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dimensions");
  const [selectedDim, setSelectedDim] = useState(null);
  const [isDimDialogOpen, setIsDimDialogOpen] = useState(false);
  const [isValueDialogOpen, setIsValueDialogOpen] = useState(false);

  const [dimForm, setDimForm] = useState({ code: "", name: "", description: "", is_global: false, global_num: 3, mandatory: false });
  const [valForm, setValForm] = useState({ dimension_code: "DEPARTMENT", code: "", name: "", total_budget: 0, active: true });

  const { data: dimensions = [], isLoading: isLoadingDims } = useQuery({
    queryKey: ["dimensions"],
    queryFn: () => base44.entities.Dimension.list()
  });

  const { data: dimensionValues = [], isLoading: isLoadingVals } = useQuery({
    queryKey: ["dimensionValues"],
    queryFn: () => base44.entities.DimensionValue.list()
  });

  const createDimMutation = useMutation({
    mutationFn: (data) => base44.entities.Dimension.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dimensions"] });
      toast.success("Dimension created successfully");
      setIsDimDialogOpen(false);
      setDimForm({ code: "", name: "", description: "", is_global: false, global_num: 3, mandatory: false });
    }
  });

  const createValMutation = useMutation({
    mutationFn: (data) => base44.entities.DimensionValue.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dimensionValues"] });
      toast.success("Dimension Value added successfully");
      setIsValueDialogOpen(false);
      setValForm({ dimension_code: "DEPARTMENT", code: "", name: "", total_budget: 0, active: true });
    }
  });

  const globalDims = dimensions.filter(d => d.is_global);
  const shortcutDims = dimensions.filter(d => !d.is_global);

  const dimColumns = [
    { header: "Code", accessor: "code", render: (r) => <span className="font-mono font-bold">{r.code}</span> },
    { header: "Name", accessor: "name" },
    { header: "Type", accessor: "is_global", render: (r) => r.is_global ? <Badge className="bg-primary/20 text-primary border-primary/30">Global {r.global_num}</Badge> : <Badge variant="outline">Shortcut {r.global_num}</Badge> },
    { header: "Description", accessor: "description" },
    { header: "Mandatory on Ledger", accessor: "mandatory", render: (r) => r.mandatory ? <span className="text-emerald-500 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Mandatory</span> : <span className="text-muted-foreground">Optional</span> }
  ];

  const valColumns = [
    { header: "Dimension", accessor: "dimension_code", render: (r) => <Badge variant="secondary">{r.dimension_code}</Badge> },
    { header: "Code", accessor: "code", render: (r) => <span className="font-mono font-bold">{r.code}</span> },
    { header: "Name", accessor: "name" },
    { header: "Total Budget", accessor: "total_budget", render: (r) => r.total_budget ? `$${Number(r.total_budget).toLocaleString()}` : "-" },
    { header: "Status", accessor: "active", render: (r) => r.active ? <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Active</Badge> : <Badge variant="destructive">Blocked</Badge> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Dimensions & Financial Analytics"
        subtitle="Configure Global & Shortcut Dimensions for multi-dimensional G/L analysis exactly like Dynamics 365 Business Central"
        actionLabel="New Dimension"
        onAction={() => setIsDimDialogOpen(true)}
      >
        <Button variant="outline" onClick={() => setIsValueDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Dimension Value
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Dimensions" value={dimensions.length} icon={Layers} />
        <StatsCard title="Global Dimensions" value={globalDims.length} icon={ShieldCheck} />
        <StatsCard title="Dimension Values" value={dimensionValues.length} icon={Tags} />
        <StatsCard title="Shortcut Dimensions" value={shortcutDims.length} icon={PieChart} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dimensions">Dimensions Master</TabsTrigger>
          <TabsTrigger value="values">Dimension Values</TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions" className="space-y-4">
          <DataTable
            columns={dimColumns}
            data={dimensions}
            isLoading={isLoadingDims}
            onRowClick={(r) => setSelectedDim(r)}
          />
        </TabsContent>

        <TabsContent value="values" className="space-y-4">
          <DataTable
            columns={valColumns}
            data={dimensionValues}
            isLoading={isLoadingVals}
          />
        </TabsContent>
      </Tabs>

      {/* New Dimension Dialog */}
      <FormDialog
        open={isDimDialogOpen}
        onOpenChange={setIsDimDialogOpen}
        title="Create New Dimension"
        onSubmit={() => createDimMutation.mutate(dimForm)}
        isLoading={createDimMutation.isPending}
      >
        <FormField label="Dimension Code (e.g. DEPARTMENT)" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono uppercase"
            value={dimForm.code}
            onChange={(e) => setDimForm({ ...dimForm, code: e.target.value.toUpperCase() })}
            placeholder="DEPARTMENT"
            required
          />
        </FormField>
        <FormField label="Dimension Name" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={dimForm.name}
            onChange={(e) => setDimForm({ ...dimForm, name: e.target.value })}
            placeholder="Organizational Department"
            required
          />
        </FormField>
        <FormField label="Description">
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={dimForm.description}
            onChange={(e) => setDimForm({ ...dimForm, description: e.target.value })}
            placeholder="Used for cost accounting and ledger tagging"
          />
        </FormField>
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="dim_mandatory"
            checked={dimForm.mandatory}
            onChange={(e) => setDimForm({ ...dimForm, mandatory: e.target.checked })}
          />
          <label htmlFor="dim_mandatory" className="text-sm font-medium">Mandatory on General Ledger Postings</label>
        </div>
      </FormDialog>

      {/* New Dimension Value Dialog */}
      <FormDialog
        open={isValueDialogOpen}
        onOpenChange={setIsValueDialogOpen}
        title="Add Dimension Value"
        onSubmit={() => createValMutation.mutate(valForm)}
        isLoading={createValMutation.isPending}
      >
        <FormField label="Parent Dimension" required>
          <select
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={valForm.dimension_code}
            onChange={(e) => setValForm({ ...valForm, dimension_code: e.target.value })}
          >
            {dimensions.map(d => (
              <option key={d.id} value={d.code}>{d.code} - {d.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Value Code (e.g. SALES)" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono uppercase"
            value={valForm.code}
            onChange={(e) => setValForm({ ...valForm, code: e.target.value.toUpperCase() })}
            placeholder="SALES"
            required
          />
        </FormField>
        <FormField label="Value Name" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={valForm.name}
            onChange={(e) => setValForm({ ...valForm, name: e.target.value })}
            placeholder="Sales & Marketing Unit"
            required
          />
        </FormField>
        <FormField label="Annual Budget Allocation ($)">
          <input
            type="number"
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={valForm.total_budget}
            onChange={(e) => setValForm({ ...valForm, total_budget: Number(e.target.value) })}
          />
        </FormField>
      </FormDialog>
    </div>
  );
}
