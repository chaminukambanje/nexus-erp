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
import { Cpu, Layers, DollarSign, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function ManufacturingBOM() {
  const queryClient = useQueryClient();
  const [selectedBOM, setSelectedBOM] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    bom_no: `BOM-${Math.floor(1000 + Math.random() * 9000)}`,
    description: "",
    unit_of_measure: "PCS",
    version: "1.0",
    status: "certified",
    total_cost: 0,
    lines: []
  });

  const { data: boms = [], isLoading } = useQuery({
    queryKey: ["manufacturingBOMs"],
    queryFn: () => base44.entities.ManufacturingBOM.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ManufacturingBOM.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturingBOMs"] });
      toast.success("Production BOM certified and registered");
      setIsDialogOpen(false);
    }
  });

  const columns = [
    { header: "BOM No.", accessor: "bom_no", render: (r) => <span className="font-mono font-bold text-primary">{r.bom_no}</span> },
    { header: "Finished Item Description", accessor: "description" },
    { header: "UoM", accessor: "unit_of_measure", render: (r) => <Badge variant="outline">{r.unit_of_measure}</Badge> },
    { header: "Version", accessor: "version", render: (r) => <Badge variant="secondary">v{r.version}</Badge> },
    { header: "Component Lines", accessor: "lines", render: (r) => `${r.lines?.length || 0} Components` },
    { header: "Standard Unit Cost", accessor: "total_cost", render: (r) => `$${Number(r.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { header: "Status", accessor: "status", render: (r) => <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Certified</Badge> }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Production Bills of Materials (BOM)"
        subtitle="Define multi-level component trees, sub-assemblies, scrap percentages, and component costs for discrete & process manufacturing"
        actionLabel="New Production BOM"
        onAction={() => setIsDialogOpen(true)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Production BOMs" value={boms.length} icon={Cpu} />
        <StatsCard title="Certified BOMs" value={boms.filter(b => b.status === "certified").length} icon={CheckCircle2} />
        <StatsCard title="Active Versions" value="Multi-Level" icon={Layers} />
        <StatsCard title="Cost Rollup" value="Standard / FIFO" icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DataTable
            columns={columns}
            data={boms}
            isLoading={isLoading}
            onRowClick={(row) => setSelectedBOM(row)}
          />
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>BOM Component Breakdown</span>
                {selectedBOM && <Badge variant="outline">{selectedBOM.bom_no}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedBOM ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm">{selectedBOM.description}</h4>
                    <p className="text-xs text-muted-foreground">Rolled-up Cost: ${Number(selectedBOM.total_cost).toFixed(2)}</p>
                  </div>
                  <div className="border rounded-md divide-y text-xs">
                    {selectedBOM.lines?.map((line, idx) => (
                      <div key={idx} className="p-2.5 flex justify-between items-center">
                        <div>
                          <div className="font-mono font-bold">{line.item_code}</div>
                          <div className="text-muted-foreground">{line.description}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">{line.quantity} {line.unit}</span>
                          <div className="text-muted-foreground">${(line.unit_cost * line.quantity).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Select a Production BOM to inspect its component lines and cost rollup
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Create Production Bill of Materials"
        onSubmit={() => createMutation.mutate(form)}
        isLoading={createMutation.isPending}
      >
        <FormField label="BOM Number" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono uppercase"
            value={form.bom_no}
            onChange={(e) => setForm({ ...form, bom_no: e.target.value.toUpperCase() })}
            required
          />
        </FormField>
        <FormField label="Manufactured Item Name" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Commercial Hybrid Power Generator 15kW"
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Unit of Measure" required>
            <input
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.unit_of_measure}
              onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Calculated Standard Cost ($)" required>
            <input
              type="number"
              className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
              value={form.total_cost}
              onChange={(e) => setForm({ ...form, total_cost: Number(e.target.value) })}
              required
            />
          </FormField>
        </div>
      </FormDialog>
    </div>
  );
}
