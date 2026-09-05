import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  RefreshCw,
  Plus,
  Calendar,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';

export default function CashFlowForecast() {
  const qc = useQueryClient();
  const [horizon, setHorizon] = useState('90'); // 30, 60, 90, 180
  const [tab, setTab] = useState('timeline');
  const [manualDialog, setManualDialog] = useState(false);
  const [manualForm, setManualForm] = useState({
    description: '',
    entry_type: 'expense', // 'revenue' | 'expense'
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    category: 'Operational',
    recurrence: 'once'
  });

  // Fetch subledger data
  const { data: bankAccounts = [] } = useQuery({ queryKey: ['bankAccounts'], queryFn: () => base44.entities.BankAccount.list() });
  const { data: salesInvoices = [] } = useQuery({ queryKey: ['salesInvoices'], queryFn: () => base44.entities.SalesInvoice.list() });
  const { data: purchaseBills = [] } = useQuery({ queryKey: ['purchaseBills'], queryFn: () => base44.entities.PurchaseBill.list() });
  const { data: manualEntries = [] } = useQuery({ queryKey: ['cashFlowManuals'], queryFn: () => base44.entities.CashFlowManualEntry.list() });

  // Calculate Liquid funds
  const totalLiquidFunds = useMemo(() => {
    return bankAccounts.reduce((sum, b) => sum + (parseFloat(b.current_balance || b.balance || 0)), 0);
  }, [bankAccounts]);

  // Projected Inflows from unpaid/partially paid sales invoices
  const projectedInflows = useMemo(() => {
    return salesInvoices
      .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
      .map(inv => ({
        id: inv.id,
        source: `Invoice #${inv.invoice_number || inv.id.slice(0, 8)}`,
        entity: inv.customer_name || 'Customer',
        amount: parseFloat(inv.total_amount || inv.amount || 0) - parseFloat(inv.paid_amount || 0),
        due_date: inv.due_date || inv.posting_date || '2026-09-30',
        type: 'Customer Receivable',
        probability: 0.95
      }));
  }, [salesInvoices]);

  // Projected Outflows from unpaid purchase bills
  const projectedOutflows = useMemo(() => {
    return purchaseBills
      .filter(b => b.status !== 'paid' && b.status !== 'cancelled')
      .map(bill => ({
        id: bill.id,
        source: `Bill #${bill.bill_number || bill.id.slice(0, 8)}`,
        entity: bill.vendor_name || 'Vendor',
        amount: parseFloat(bill.total_amount || bill.amount || 0) - parseFloat(bill.paid_amount || 0),
        due_date: bill.due_date || bill.posting_date || '2026-09-30',
        type: 'Vendor Payable',
        priority: 'high'
      }));
  }, [purchaseBills]);

  // Manual entries
  const manualRevenues = manualEntries.filter(m => m.entry_type === 'revenue');
  const manualExpenses = manualEntries.filter(m => m.entry_type === 'expense');

  const totalInflow = projectedInflows.reduce((s, i) => s + i.amount, 0) + manualRevenues.reduce((s, m) => s + parseFloat(m.amount || 0), 0);
  const totalOutflow = projectedOutflows.reduce((s, o) => s + o.amount, 0) + manualExpenses.reduce((s, m) => s + parseFloat(m.amount || 0), 0);
  const netCashFlow = totalInflow - totalOutflow;
  const closingLiquidFunds = totalLiquidFunds + netCashFlow;
  const runwayMonths = totalOutflow > 0 ? ((totalLiquidFunds / (totalOutflow / 3)).toFixed(1)) : '12+';

  // Create manual entry mutation
  const manualMutation = useMutation({
    mutationFn: (data) => base44.entities.CashFlowManualEntry.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['cashFlowManuals']);
      setManualDialog(false);
      toast.success('Manual Cash Flow Entry created successfully');
    }
  });

  const handleCreateManual = () => {
    if (!manualForm.description || !manualForm.amount) {
      toast.error('Please enter description and amount');
      return;
    }
    manualMutation.mutate({
      ...manualForm,
      amount: parseFloat(manualForm.amount)
    });
  };

  // Timeline breakdown (next 4 months)
  const timelineData = [
    { period: 'Sep 2026', opening: totalLiquidFunds, inflows: totalInflow * 0.45, outflows: totalOutflow * 0.4, net: (totalInflow * 0.45) - (totalOutflow * 0.4) },
    { period: 'Oct 2026', opening: totalLiquidFunds + (totalInflow * 0.45) - (totalOutflow * 0.4), inflows: totalInflow * 0.35, outflows: totalOutflow * 0.35, net: (totalInflow * 0.35) - (totalOutflow * 0.35) },
    { period: 'Nov 2026', opening: totalLiquidFunds + (totalInflow * 0.8) - (totalOutflow * 0.75), inflows: totalInflow * 0.2, outflows: totalOutflow * 0.25, net: (totalInflow * 0.2) - (totalOutflow * 0.25) }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1500px]">
      <PageHeader
        title="Cash Flow Forecast"
        description="Microsoft Dynamics 365 Business Central style liquidity forecasting and cash planning"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { qc.invalidateQueries(); toast.success('Recalculated forecast from G/L and subledgers'); }} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Recalculate
            </Button>
            <Button size="sm" onClick={() => setManualDialog(true)} className="gap-1.5 text-xs bg-primary">
              <Plus className="w-3.5 h-3.5" /> Add Manual Cash Entry
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Opening Liquid Funds</span>
              <Wallet className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold font-mono mt-2">£{totalLiquidFunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <span className="text-[11px] text-muted-foreground">{bankAccounts.length} Connected Bank Accounts</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Projected Inflows ({horizon}d)</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold font-mono mt-2 text-emerald-600">£{totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <span className="text-[11px] text-muted-foreground">{projectedInflows.length} Receivables + Manual</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Projected Outflows ({horizon}d)</span>
              <ArrowDownRight className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold font-mono mt-2 text-rose-600">£{totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <span className="text-[11px] text-muted-foreground">{projectedOutflows.length} Payables + Operating</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Net Cash Position</span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div className={`text-xl font-bold font-mono mt-2 ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              £{netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-muted-foreground">Expected Net Change</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Cash Runway</span>
              <PiggyBank className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold font-mono mt-2 text-amber-600">{runwayMonths} Months</div>
            <span className="text-[11px] text-muted-foreground">Based on burn rate</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <TabsList>
            <TabsTrigger value="timeline" className="text-xs gap-1.5"><Calendar className="w-3.5 h-3.5" /> Forecast Timeline</TabsTrigger>
            <TabsTrigger value="inflows" className="text-xs gap-1.5"><ArrowUpRight className="w-3.5 h-3.5" /> Cash Inflows</TabsTrigger>
            <TabsTrigger value="outflows" className="text-xs gap-1.5"><ArrowDownRight className="w-3.5 h-3.5" /> Cash Outflows</TabsTrigger>
            <TabsTrigger value="manual" className="text-xs gap-1.5"><Plus className="w-3.5 h-3.5" /> Manual Adjustments</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Horizon:</span>
            {['30', '60', '90', '180'].map(h => (
              <Button
                key={h}
                size="sm"
                variant={horizon === h ? 'default' : 'outline'}
                onClick={() => setHorizon(h)}
                className="h-7 text-xs px-2.5"
              >
                {h} Days
              </Button>
            ))}
          </div>
        </div>

        {/* Tab 1: Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Projected Cash Balance Trajectory</CardTitle>
              <CardDescription>Monthly opening vs. closing liquid funds forecast</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Period</th>
                      <th className="p-3 text-right">Opening Cash</th>
                      <th className="p-3 text-right text-emerald-600">Expected Inflows</th>
                      <th className="p-3 text-right text-rose-600">Expected Outflows</th>
                      <th className="p-3 text-right">Net Change</th>
                      <th className="p-3 text-right font-bold">Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    {timelineData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-sans font-medium">{row.period}</td>
                        <td className="p-3 text-right">£{row.opening.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right text-emerald-600">+£{row.inflows.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right text-rose-600">-£{row.outflows.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className={`p-3 text-right ${row.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          £{row.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-bold text-foreground">
                          £{(row.opening + row.net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Inflows */}
        <TabsContent value="inflows" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Expected Cash Inflows</CardTitle>
              <CardDescription>Open customer receivables and scheduled incoming payments</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <DataTable
                columns={[
                  { header: 'Source Document', render: r => <span className="font-semibold text-xs">{r.source}</span> },
                  { header: 'Customer / Entity', render: r => <span className="text-xs">{r.entity}</span> },
                  { header: 'Category', render: r => <Badge variant="outline" className="text-[10px]">{r.type}</Badge> },
                  { header: 'Expected Due Date', render: r => <span className="text-xs font-mono">{r.due_date}</span> },
                  { header: 'Probability', render: r => <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">{(r.probability * 100).toFixed(0)}%</Badge> },
                  { header: 'Amount', render: r => <span className="font-mono font-bold text-xs text-emerald-600">£{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> }
                ]}
                data={projectedInflows}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Outflows */}
        <TabsContent value="outflows" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Expected Cash Outflows</CardTitle>
              <CardDescription>Accounts payable, purchase bills, and vendor commitments</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <DataTable
                columns={[
                  { header: 'Source Document', render: r => <span className="font-semibold text-xs">{r.source}</span> },
                  { header: 'Vendor / Beneficiary', render: r => <span className="text-xs">{r.entity}</span> },
                  { header: 'Category', render: r => <Badge variant="outline" className="text-[10px]">{r.type}</Badge> },
                  { header: 'Due Date', render: r => <span className="text-xs font-mono">{r.due_date}</span> },
                  { header: 'Priority', render: r => <Badge variant={r.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] uppercase">{r.priority}</Badge> },
                  { header: 'Amount', render: r => <span className="font-mono font-bold text-xs text-rose-600">£{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> }
                ]}
                data={projectedOutflows}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Manual Entries */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Manual Cash Flow Revenues & Expenses</CardTitle>
                <CardDescription>Custom periodic items not yet posted to purchase or sales subledgers</CardDescription>
              </div>
              <Button size="sm" onClick={() => setManualDialog(true)} className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Manual Item
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <DataTable
                columns={[
                  { header: 'Description', render: r => <span className="font-medium text-xs">{r.description}</span> },
                  { header: 'Type', render: r => <Badge className={r.entry_type === 'revenue' ? 'bg-emerald-600 text-white text-[10px]' : 'bg-rose-600 text-white text-[10px]'}>{r.entry_type.toUpperCase()}</Badge> },
                  { header: 'Category', render: r => <span className="text-xs text-muted-foreground">{r.category}</span> },
                  { header: 'Due Date', render: r => <span className="text-xs font-mono">{r.due_date}</span> },
                  { header: 'Amount', render: r => <span className="font-mono font-bold text-xs">£{parseFloat(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> }
                ]}
                data={manualEntries}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual Entry Dialog */}
      <FormDialog
        open={manualDialog}
        onOpenChange={setManualDialog}
        title="Add Manual Cash Flow Entry"
        onSubmit={handleCreateManual}
      >
        <div className="space-y-3">
          <FormField label="Description">
            <Input value={manualForm.description} onChange={e => setManualForm({ ...manualForm, description: e.target.value })} placeholder="e.g., Q3 VAT Settlement, Executive Payroll, Office Lease" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Entry Type">
              <select
                value={manualForm.entry_type}
                onChange={e => setManualForm({ ...manualForm, entry_type: e.target.value })}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="expense">Cash Outflow / Expense</option>
                <option value="revenue">Cash Inflow / Revenue</option>
              </select>
            </FormField>
            <FormField label="Amount (£)">
              <Input type="number" step="0.01" value={manualForm.amount} onChange={e => setManualForm({ ...manualForm, amount: e.target.value })} placeholder="15000.00" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Due Date">
              <Input type="date" value={manualForm.due_date} onChange={e => setManualForm({ ...manualForm, due_date: e.target.value })} />
            </FormField>
            <FormField label="Category">
              <Input value={manualForm.category} onChange={e => setManualForm({ ...manualForm, category: e.target.value })} placeholder="Operational, Tax, Financing" />
            </FormField>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
