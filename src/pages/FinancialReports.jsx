import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StatsCard from '@/components/shared/StatsCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, AlertCircle, Download } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

const COLORS = ['hsl(217,91%,50%)', 'hsl(160,60%,45%)', 'hsl(30,80%,55%)', 'hsl(280,65%,60%)', 'hsl(340,75%,55%)'];

function AgingBucket(amount, label, color) {
  return (
    <div className={`p-4 rounded-lg border-l-4 ${color}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-1">${amount.toLocaleString()}</p>
    </div>
  );
}

export default function FinancialReports() {
  const { data: accounts = [] } = useQuery({ queryKey: ['chartOfAccounts'], queryFn: () => base44.entities.ChartOfAccount.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['salesInvoices'], queryFn: () => base44.entities.SalesInvoice.list('-invoice_date', 500) });
  const { data: bills = [] } = useQuery({ queryKey: ['purchaseBills'], queryFn: () => base44.entities.PurchaseBill.list('-bill_date', 500) });
  const { data: payments = [] } = useQuery({ queryKey: ['payments'], queryFn: () => base44.entities.Payment.list() });
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: () => base44.entities.Budget.list() });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => base44.entities.Vendor.list() });

  // ── Financial Position ──
  const totalAssets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + (a.balance || 0), 0);
  const totalLiabilities = accounts.filter(a => a.type === 'liability').reduce((s, a) => s + (a.balance || 0), 0);
  const totalEquity = accounts.filter(a => a.type === 'equity').reduce((s, a) => s + (a.balance || 0), 0);
  const totalRevenue = accounts.filter(a => a.type === 'revenue').reduce((s, a) => s + Math.abs(a.balance || 0), 0);
  const totalExpenses = accounts.filter(a => a.type === 'expense').reduce((s, a) => s + (a.balance || 0), 0);
  const netIncome = totalRevenue - totalExpenses;
  const totalIncoming = payments.filter(p => p.type === 'incoming' && p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
  const totalOutgoing = payments.filter(p => p.type === 'outgoing' && p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);

  // ── AR Aging ──
  const today = new Date();
  const unpaidInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.balance_due > 0);
  const arAging = {
    current: unpaidInvoices.filter(i => differenceInDays(today, parseISO(i.due_date || i.invoice_date)) <= 0).reduce((s, i) => s + (i.balance_due || 0), 0),
    d1_30: unpaidInvoices.filter(i => { const d = differenceInDays(today, parseISO(i.due_date || i.invoice_date)); return d >= 1 && d <= 30; }).reduce((s, i) => s + (i.balance_due || 0), 0),
    d31_60: unpaidInvoices.filter(i => { const d = differenceInDays(today, parseISO(i.due_date || i.invoice_date)); return d >= 31 && d <= 60; }).reduce((s, i) => s + (i.balance_due || 0), 0),
    d61_90: unpaidInvoices.filter(i => { const d = differenceInDays(today, parseISO(i.due_date || i.invoice_date)); return d >= 61 && d <= 90; }).reduce((s, i) => s + (i.balance_due || 0), 0),
    over90: unpaidInvoices.filter(i => differenceInDays(today, parseISO(i.due_date || i.invoice_date)) > 90).reduce((s, i) => s + (i.balance_due || 0), 0),
  };

  // ── AP Aging ──
  const unpaidBills = bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled' && b.balance_due > 0);
  const apAging = {
    current: unpaidBills.filter(b => differenceInDays(today, parseISO(b.due_date || b.bill_date)) <= 0).reduce((s, b) => s + (b.balance_due || 0), 0),
    d1_30: unpaidBills.filter(b => { const d = differenceInDays(today, parseISO(b.due_date || b.bill_date)); return d >= 1 && d <= 30; }).reduce((s, b) => s + (b.balance_due || 0), 0),
    d31_60: unpaidBills.filter(b => { const d = differenceInDays(today, parseISO(b.due_date || b.bill_date)); return d >= 31 && d <= 60; }).reduce((s, b) => s + (b.balance_due || 0), 0),
    d61_90: unpaidBills.filter(b => { const d = differenceInDays(today, parseISO(b.due_date || b.bill_date)); return d >= 61 && d <= 90; }).reduce((s, b) => s + (b.balance_due || 0), 0),
    over90: unpaidBills.filter(b => differenceInDays(today, parseISO(b.due_date || b.bill_date)) > 90).reduce((s, b) => s + (b.balance_due || 0), 0),
  };

  // ── Trial Balance ──
  const trialBalance = accounts.map(a => ({
    ...a,
    debit: a.type === 'asset' || a.type === 'expense' ? Math.max(0, a.balance || 0) : 0,
    credit: a.type === 'liability' || a.type === 'equity' || a.type === 'revenue' ? Math.abs(a.balance || 0) : 0,
  }));
  const totalDebit = trialBalance.reduce((s, a) => s + a.debit, 0);
  const totalCredit = trialBalance.reduce((s, a) => s + a.credit, 0);

  // ── Customer Balance ──
  const customerBalances = customers.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);
  const vendorBalances = vendors.filter(v => v.balance > 0).sort((a, b) => b.balance - a.balance);

  // ── Budget vs Actual ──
  const approvedBudget = budgets.find(b => b.status === 'approved' && b.fiscal_year === new Date().getFullYear().toString());

  // ── Revenue/Expense chart data ──
  const revExpData = [
    { name: 'Revenue', value: totalRevenue, fill: 'hsl(160,60%,45%)' },
    { name: 'Expenses', value: totalExpenses, fill: 'hsl(340,75%,55%)' },
    { name: 'Net Income', value: Math.max(0, netIncome), fill: 'hsl(217,91%,50%)' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive financial analytics and statements</p>
        </div>
        <p className="text-xs text-muted-foreground">{format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="pl">P&amp;L</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
          <TabsTrigger value="ar_aging">AR Aging</TabsTrigger>
          <TabsTrigger value="ap_aging">AP Aging</TabsTrigger>
          <TabsTrigger value="customer_balances">Customer Balances</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatsCard title="Total Assets" value={`$${totalAssets.toLocaleString()}`} icon={DollarSign} />
            <StatsCard title="Net Income" value={`$${netIncome.toLocaleString()}`} icon={netIncome >= 0 ? TrendingUp : TrendingDown} />
            <StatsCard title="Receivables" value={`$${unpaidInvoices.reduce((s,i) => s+(i.balance_due||0), 0).toLocaleString()}`} icon={ArrowUpRight} />
            <StatsCard title="Payables" value={`$${unpaidBills.reduce((s,b) => s+(b.balance_due||0), 0).toLocaleString()}`} icon={ArrowDownRight} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue vs Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revExpData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={v => `$${v.toLocaleString()}`} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {revExpData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Account Types Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={['asset','liability','equity','revenue','expense'].map(t => ({ name: t, value: Math.abs(accounts.filter(a => a.type === t).reduce((s, a) => s + (a.balance || 0), 0)) })).filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                        {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BALANCE SHEET */}
        <TabsContent value="balance" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title="Total Assets" value={`$${totalAssets.toLocaleString()}`} icon={TrendingUp} />
            <StatsCard title="Total Liabilities" value={`$${totalLiabilities.toLocaleString()}`} icon={TrendingDown} />
            <StatsCard title="Total Equity" value={`$${totalEquity.toLocaleString()}`} icon={DollarSign} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['asset', 'liability', 'equity'].map(type => (
              <Card key={type}>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold capitalize">{type === 'asset' ? 'Assets' : type === 'liability' ? 'Liabilities' : 'Equity'}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {accounts.filter(a => a.type === type).map(a => (
                      <div key={a.id} className="flex justify-between text-sm py-1">
                        <span className="text-muted-foreground truncate max-w-[160px]">{a.account_number} — {a.name}</span>
                        <span className="font-medium ml-2">${(a.balance || 0).toLocaleString()}</span>
                      </div>
                    ))}
                    {accounts.filter(a => a.type === type).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No accounts</p>}
                    <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                      <span>Total</span>
                      <span>${accounts.filter(a => a.type === type).reduce((s, a) => s + (a.balance || 0), 0).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-4">
              <div className={`flex items-center gap-2 text-sm font-semibold ${Math.abs(totalAssets - totalLiabilities - totalEquity) < 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                <AlertCircle className="w-4 h-4" />
                {Math.abs(totalAssets - totalLiabilities - totalEquity) < 1 ? 'Balance Sheet is balanced ✓' : `Balance Sheet is NOT balanced. Difference: $${Math.abs(totalAssets - totalLiabilities - totalEquity).toLocaleString()}`}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* P&L */}
        <TabsContent value="pl" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={TrendingUp} />
            <StatsCard title="Total Expenses" value={`$${totalExpenses.toLocaleString()}`} icon={TrendingDown} />
            <StatsCard title="Net Income" value={`$${netIncome.toLocaleString()}`} icon={DollarSign} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue</CardTitle></CardHeader>
              <CardContent>
                {accounts.filter(a => a.type === 'revenue').map(a => (
                  <div key={a.id} className="flex justify-between text-sm py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{a.account_number} — {a.name}</span>
                    <span className="font-medium text-emerald-600">${Math.abs(a.balance || 0).toLocaleString()}</span>
                  </div>
                ))}
                {accounts.filter(a => a.type === 'revenue').length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No revenue accounts</p>}
                <div className="flex justify-between text-sm font-bold pt-3 mt-1 border-t-2">
                  <span>Total Revenue</span><span className="text-emerald-600">${totalRevenue.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Expenses</CardTitle></CardHeader>
              <CardContent>
                {accounts.filter(a => a.type === 'expense').map(a => (
                  <div key={a.id} className="flex justify-between text-sm py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{a.account_number} — {a.name}</span>
                    <span className="font-medium text-red-600">${(a.balance || 0).toLocaleString()}</span>
                  </div>
                ))}
                {accounts.filter(a => a.type === 'expense').length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No expense accounts</p>}
                <div className="flex justify-between text-sm font-bold pt-3 mt-1 border-t-2">
                  <span>Total Expenses</span><span className="text-red-600">${totalExpenses.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Net Income (Loss)</span>
                <span className={netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}>${netIncome.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CASH FLOW */}
        <TabsContent value="cashflow" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title="Cash Inflow" value={`$${totalIncoming.toLocaleString()}`} icon={ArrowUpRight} />
            <StatsCard title="Cash Outflow" value={`$${totalOutgoing.toLocaleString()}`} icon={ArrowDownRight} />
            <StatsCard title="Net Cash Flow" value={`$${(totalIncoming - totalOutgoing).toLocaleString()}`} icon={DollarSign} />
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Payment Activity</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {payments.filter(p => p.status === 'completed').slice(0, 20).map(p => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">{p.party_name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{p.payment_number} · {p.date ? format(new Date(p.date), 'MMM d, yyyy') : '—'}</p>
                    </div>
                    <span className={`font-semibold ${p.type === 'incoming' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {p.type === 'incoming' ? '+' : '-'}${(p.amount || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
                {payments.filter(p => p.status === 'completed').length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No completed payments</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRIAL BALANCE */}
        <TabsContent value="trial" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Trial Balance — {format(new Date(), 'MMMM d, yyyy')}</CardTitle>
                <Badge variant={Math.abs(totalDebit - totalCredit) < 1 ? 'default' : 'destructive'}>
                  {Math.abs(totalDebit - totalCredit) < 1 ? 'Balanced' : 'Unbalanced'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-3 font-semibold">Account #</th>
                    <th className="text-left px-4 py-3 font-semibold">Account Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Type</th>
                    <th className="text-right px-4 py-3 font-semibold">Debit</th>
                    <th className="text-right px-4 py-3 font-semibold">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.map((a, i) => (
                    <tr key={a.id} className={`border-b hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-4 py-2.5 font-mono text-xs">{a.account_number}</td>
                      <td className="px-4 py-2.5">{a.name}</td>
                      <td className="px-4 py-2.5 capitalize text-muted-foreground">{a.type}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{a.debit > 0 ? `$${a.debit.toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{a.credit > 0 ? `$${a.credit.toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                  {trialBalance.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No accounts in chart of accounts</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="bg-muted border-t-2 font-bold">
                    <td className="px-4 py-3" colSpan={3}>TOTALS</td>
                    <td className="px-4 py-3 text-right">${totalDebit.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">${totalCredit.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AR AGING */}
        <TabsContent value="ar_aging" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="p-4 rounded-lg border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
              <p className="text-xs text-muted-foreground uppercase">Current</p><p className="text-xl font-bold mt-1">${arAging.current.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg border-l-4 border-l-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
              <p className="text-xs text-muted-foreground uppercase">1–30 Days</p><p className="text-xl font-bold mt-1">${arAging.d1_30.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <p className="text-xs text-muted-foreground uppercase">31–60 Days</p><p className="text-xl font-bold mt-1">${arAging.d31_60.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20">
              <p className="text-xs text-muted-foreground uppercase">61–90 Days</p><p className="text-xl font-bold mt-1">${arAging.d61_90.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg border-l-4 border-l-red-800 bg-red-100 dark:bg-red-950/30">
              <p className="text-xs text-muted-foreground uppercase">Over 90</p><p className="text-xl font-bold mt-1">${arAging.over90.toLocaleString()}</p>
            </div>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Outstanding Invoices</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50 border-b"><th className="text-left px-4 py-3">Invoice #</th><th className="text-left px-4 py-3">Customer</th><th className="text-right px-4 py-3">Invoice Date</th><th className="text-right px-4 py-3">Due Date</th><th className="text-right px-4 py-3">Balance Due</th><th className="text-right px-4 py-3">Days Overdue</th></tr></thead>
                <tbody>
                  {unpaidInvoices.map(inv => {
                    const days = differenceInDays(today, parseISO(inv.due_date || inv.invoice_date));
                    return (
                      <tr key={inv.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-medium">{inv.invoice_number}</td>
                        <td className="px-4 py-2.5">{inv.customer_name}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{inv.invoice_date ? format(new Date(inv.invoice_date), 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">${(inv.balance_due || 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right"><Badge variant={days <= 0 ? 'default' : days <= 30 ? 'secondary' : 'destructive'}>{days <= 0 ? 'Current' : `${days}d`}</Badge></td>
                      </tr>
                    );
                  })}
                  {unpaidInvoices.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No outstanding invoices</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AP AGING */}
        <TabsContent value="ap_aging" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="p-4 rounded-lg border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
              <p className="text-xs text-muted-foreground uppercase">Current</p><p className="text-xl font-bold mt-1">${apAging.current.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg border-l-4 border-l-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
              <p className="text-xs text-muted-foreground uppercase">1–30 Days</p><p className="text-xl font-bold mt-1">${apAging.d1_30.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <p className="text-xs text-muted-foreground uppercase">31–60 Days</p><p className="text-xl font-bold mt-1">${apAging.d31_60.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20">
              <p className="text-xs text-muted-foreground uppercase">61–90 Days</p><p className="text-xl font-bold mt-1">${apAging.d61_90.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-lg border-l-4 border-l-red-800 bg-red-100 dark:bg-red-950/30">
              <p className="text-xs text-muted-foreground uppercase">Over 90</p><p className="text-xl font-bold mt-1">${apAging.over90.toLocaleString()}</p>
            </div>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Outstanding Bills</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50 border-b"><th className="text-left px-4 py-3">Bill #</th><th className="text-left px-4 py-3">Vendor</th><th className="text-right px-4 py-3">Bill Date</th><th className="text-right px-4 py-3">Due Date</th><th className="text-right px-4 py-3">Balance Due</th><th className="text-right px-4 py-3">Days Overdue</th></tr></thead>
                <tbody>
                  {unpaidBills.map(bill => {
                    const days = differenceInDays(today, parseISO(bill.due_date || bill.bill_date));
                    return (
                      <tr key={bill.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-medium">{bill.bill_number}</td>
                        <td className="px-4 py-2.5">{bill.vendor_name}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{bill.bill_date ? format(new Date(bill.bill_date), 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{bill.due_date ? format(new Date(bill.due_date), 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">${(bill.balance_due || 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right"><Badge variant={days <= 0 ? 'default' : days <= 30 ? 'secondary' : 'destructive'}>{days <= 0 ? 'Current' : `${days}d`}</Badge></td>
                      </tr>
                    );
                  })}
                  {unpaidBills.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No outstanding bills</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUSTOMER BALANCES */}
        <TabsContent value="customer_balances" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Customer Balances (Receivable)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 border-b"><th className="text-left px-4 py-3">Customer</th><th className="text-right px-4 py-3">Balance</th></tr></thead>
                  <tbody>
                    {customerBalances.map(c => (
                      <tr key={c.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2.5">{c.name}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">${(c.balance || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {customerBalances.length === 0 && <tr><td colSpan={2} className="text-center py-8 text-muted-foreground">No customer balances</td></tr>}
                    {customerBalances.length > 0 && (
                      <tr className="font-bold bg-muted/30 border-t-2">
                        <td className="px-4 py-2.5">Total</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600">${customerBalances.reduce((s, c) => s + (c.balance || 0), 0).toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Vendor Balances (Payable)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 border-b"><th className="text-left px-4 py-3">Vendor</th><th className="text-right px-4 py-3">Balance</th></tr></thead>
                  <tbody>
                    {vendorBalances.map(v => (
                      <tr key={v.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2.5">{v.name}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-600">${(v.balance || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {vendorBalances.length === 0 && <tr><td colSpan={2} className="text-center py-8 text-muted-foreground">No vendor balances</td></tr>}
                    {vendorBalances.length > 0 && (
                      <tr className="font-bold bg-muted/30 border-t-2">
                        <td className="px-4 py-2.5">Total</td>
                        <td className="px-4 py-2.5 text-right text-red-600">${vendorBalances.reduce((s, v) => s + (v.balance || 0), 0).toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}