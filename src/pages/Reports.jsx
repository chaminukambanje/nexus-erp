import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import StatsCard from '@/components/shared/StatsCard';

const COLORS = ['hsl(217,91%,50%)', 'hsl(160,60%,45%)', 'hsl(30,80%,55%)', 'hsl(280,65%,60%)', 'hsl(340,75%,55%)'];

export default function Reports() {
  const { data: accounts = [] } = useQuery({ queryKey: ['chartOfAccounts'], queryFn: () => base44.entities.ChartOfAccount.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['salesInvoices'], queryFn: () => base44.entities.SalesInvoice.list() });
  const { data: bills = [] } = useQuery({ queryKey: ['purchaseBills'], queryFn: () => base44.entities.PurchaseBill.list() });
  const { data: payments = [] } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list() });

  // Balance Sheet Data
  const totalAssets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + (a.balance || 0), 0);
  const totalLiabilities = accounts.filter(a => a.type === 'liability').reduce((s, a) => s + (a.balance || 0), 0);
  const totalEquity = accounts.filter(a => a.type === 'equity').reduce((s, a) => s + (a.balance || 0), 0);

  // P&L Data
  const totalRevenue = accounts.filter(a => a.type === 'revenue').reduce((s, a) => s + Math.abs(a.balance || 0), 0);
  const totalExpenses = accounts.filter(a => a.type === 'expense').reduce((s, a) => s + (a.balance || 0), 0);
  const netIncome = totalRevenue - totalExpenses;

  // Cash flow from payments
  const totalIncoming = payments.filter(p => p.type === 'incoming' && p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
  const totalOutgoing = payments.filter(p => p.type === 'outgoing' && p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
  const netCashFlow = totalIncoming - totalOutgoing;

  // Account type breakdown for pie chart
  const accountTypeData = ['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: Math.abs(accounts.filter(a => a.type === type).reduce((s, a) => s + (a.balance || 0), 0))
  })).filter(d => d.value > 0);

  // AR Aging
  const arTotal = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + (i.balance_due || 0), 0);
  const apTotal = bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled').reduce((s, b) => s + (b.balance_due || 0), 0);

  const balanceSheetData = [
    { name: 'Assets', value: totalAssets },
    { name: 'Liabilities', value: totalLiabilities },
    { name: 'Equity', value: totalEquity },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading tracking-tight">Financial Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your financial position and performance</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Assets" value={`$${totalAssets.toLocaleString()}`} icon={DollarSign} />
            <StatsCard title="Net Income" value={`$${netIncome.toLocaleString()}`} icon={netIncome >= 0 ? TrendingUp : TrendingDown} />
            <StatsCard title="Receivables" value={`$${arTotal.toLocaleString()}`} icon={ArrowUpRight} />
            <StatsCard title="Payables" value={`$${apTotal.toLocaleString()}`} icon={ArrowDownRight} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Balance Sheet Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={balanceSheetData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={v => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Account Types</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  {accountTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={accountTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                          {accountTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">Set up chart of accounts to see data</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {accountTypeData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="balance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['asset', 'liability', 'equity'].map(type => (
              <Card key={type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold capitalize">{type}s</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {accounts.filter(a => a.type === type).map(a => (
                      <div key={a.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{a.account_number} - {a.name}</span>
                        <span className="font-medium">${(a.balance || 0).toLocaleString()}</span>
                      </div>
                    ))}
                    {accounts.filter(a => a.type === type).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No {type} accounts</p>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                      <span>Total</span>
                      <span>${accounts.filter(a => a.type === type).reduce((s, a) => s + (a.balance || 0), 0).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pl" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={TrendingUp} />
            <StatsCard title="Total Expenses" value={`$${totalExpenses.toLocaleString()}`} icon={TrendingDown} />
            <StatsCard title="Net Income" value={`$${netIncome.toLocaleString()}`} icon={DollarSign} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue Accounts</CardTitle></CardHeader>
              <CardContent>
                {accounts.filter(a => a.type === 'revenue').map(a => (
                  <div key={a.id} className="flex justify-between text-sm py-1.5">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="font-medium text-emerald-600">${Math.abs(a.balance || 0).toLocaleString()}</span>
                  </div>
                ))}
                {accounts.filter(a => a.type === 'revenue').length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No revenue accounts</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Expense Accounts</CardTitle></CardHeader>
              <CardContent>
                {accounts.filter(a => a.type === 'expense').map(a => (
                  <div key={a.id} className="flex justify-between text-sm py-1.5">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="font-medium text-red-600">${(a.balance || 0).toLocaleString()}</span>
                  </div>
                ))}
                {accounts.filter(a => a.type === 'expense').length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No expense accounts</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title="Cash Inflow" value={`$${totalIncoming.toLocaleString()}`} icon={ArrowUpRight} />
            <StatsCard title="Cash Outflow" value={`$${totalOutgoing.toLocaleString()}`} icon={ArrowDownRight} />
            <StatsCard title="Net Cash Flow" value={`$${netCashFlow.toLocaleString()}`} icon={DollarSign} />
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Payment Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {payments.filter(p => p.status === 'completed').slice(0, 15).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div>
                      <span className="font-medium">{p.party_name || 'N/A'}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{p.payment_number}</span>
                    </div>
                    <span className={`font-semibold ${p.type === 'incoming' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {p.type === 'incoming' ? '+' : '-'}${(p.amount || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
                {payments.filter(p => p.status === 'completed').length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No completed payments yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}