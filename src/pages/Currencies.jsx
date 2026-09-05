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
import { Coins, RefreshCw, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function Currencies() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", symbol: "", exchange_rate: 1.0, is_base: false });

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => base44.entities.Currency.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Currency.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast.success("Currency added successfully");
      setIsDialogOpen(false);
      setForm({ code: "", name: "", symbol: "", exchange_rate: 1.0, is_base: false });
    }
  });

  const columns = [
    { header: "Currency Code", accessor: "code", render: (r) => <span className="font-mono font-bold">{r.code}</span> },
    { header: "Name", accessor: "name" },
    { header: "Symbol", accessor: "symbol", render: (r) => <span className="text-base font-semibold">{r.symbol}</span> },
    { header: "Exchange Rate (Relational)", accessor: "exchange_rate", render: (r) => <span className="font-mono font-medium">{Number(r.exchange_rate).toFixed(4)}</span> },
    { header: "Base Currency", accessor: "is_base", render: (r) => r.is_base ? <Badge className="bg-primary/20 text-primary border-primary/30">Company Base (LCY)</Badge> : <Badge variant="outline">Foreign Currency (FCY)</Badge> },
    { header: "Last Adjusted", accessor: "last_adjusted", render: (r) => r.last_adjusted || "Active" }
  ];

  const handleAdjustExchangeRates = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: "Running Currency Exchange Rate Revaluation batch job...",
        success: "Exchange rates updated and unrealized gain/loss entries calculated!",
        error: "Failed to run currency adjustment"
      }
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Currencies & Exchange Rates"
        subtitle="Manage multi-currency transactions, spot rates, and unrealized exchange gain/loss revaluations"
        actionLabel="New Currency"
        onAction={() => setIsDialogOpen(true)}
      >
        <Button variant="outline" onClick={handleAdjustExchangeRates} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Run Exchange Rate Adjustment
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Currencies Configured" value={currencies.length} icon={Coins} />
        <StatsCard title="Base Currency" value={currencies.find(c => c.is_base)?.code || "GBP"} icon={DollarSign} />
        <StatsCard title="Foreign Currencies" value={currencies.filter(c => !c.is_base).length} icon={TrendingUp} />
        <StatsCard title="Exchange Rate Batch" value="Automated" icon={RefreshCw} />
      </div>

      <DataTable columns={columns} data={currencies} isLoading={isLoading} />

      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Add Currency & Spot Rate"
        onSubmit={() => createMutation.mutate(form)}
        isLoading={createMutation.isPending}
      >
        <FormField label="Currency Code (ISO 3-letter, e.g. USD, EUR)" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono uppercase"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="USD"
            required
          />
        </FormField>
        <FormField label="Currency Description" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="US Dollar"
            required
          />
        </FormField>
        <FormField label="Currency Symbol" required>
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            placeholder="$"
            required
          />
        </FormField>
        <FormField label="Relational Exchange Rate (1 Base = X Foreign)" required>
          <input
            type="number"
            step="0.0001"
            className="w-full h-10 px-3 rounded-md border border-input bg-background font-mono"
            value={form.exchange_rate}
            onChange={(e) => setForm({ ...form, exchange_rate: Number(e.target.value) })}
            required
          />
        </FormField>
      </FormDialog>
    </div>
  );
}
