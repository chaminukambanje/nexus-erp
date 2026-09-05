import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatsCard from '@/components/shared/StatsCard';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  DollarSign, Receipt, ShoppingCart, Package, Users, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';

const PIE_COLORS = ['hsl(217,91%,50%)', 'hsl(160,60%,45%)', 'hsl(30,80%,55%)', 'hsl(280,65%,60%)', 'hsl(340,75%,55%)'];

export default function Dashboard() {
  const { data: invoices = [] } = useQuery({
    queryKey: ['salesInvoices'],
    queryFn: () => base44.entities.SalesInvoice.list('-created_date', 100),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: () => base44.entities.SalesOrder.list('-created_date', 100),
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['purchaseBills'],
    queryFn: () => base44.entities.PurchaseBill.list('-created_date', 100),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date', 50),
  });

  const totalReceivable = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + (i.balance_due || 0), 0);
  const totalPayable = bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled').reduce((s, b) => s + (b.balance_due || 0), 0);
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total_amount || 0), 0);
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

  // Chart data: invoice by status
  const invoiceByStatus = ['draft', 'sent', 'paid', 'overdue'].map(status => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: invoices.filter(i => i.status === status).length
  })).filter(d => d.value > 0);

  // Recent activity
  const recentInvoices = invoices.slice(0, 5);
  const recentOrders = orders.slice(0, 5);

  // Opportunity pipeline
  const pipelineData = ['prospect', 'qualification', 'proposal', 'negotiation'].map(stage => ({
    name: stage.charAt(0).toUpperCase() + stage.slice(1),
    value: opportunities.filter(o => o.stage === stage).reduce((s, o) => s + (o.estimated_value || 0), 0)
  }));

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Business overview and key metrics</p>
        </div>
        <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} />
        <StatsCard title="Accounts Receivable" value={`$${totalReceivable.toLocaleString()}`} icon={ArrowUpRight} />
        <StatsCard title="Accounts Payable" value={`$${totalPayable.toLocaleString()}`} icon={ArrowDownRight} />
        <StatsCard title="Overdue Invoices" value={overdueInvoices} icon={Clock} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(val) => `$${val.toLocaleString()}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {invoiceByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={invoiceByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                      {invoiceByStatus.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No invoice data yet</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {invoiceByStatus.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Recent Invoices</CardTitle>
            <Link to="/sales-invoices" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentInvoices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No invoices yet</p>
              )}
              {recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{inv.customer_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={inv.status} />
                    <span className="text-sm font-semibold">${(inv.total_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Recent Sales Orders</CardTitle>
            <Link to="/sales-orders" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentOrders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
              )}
              {recentOrders.map(ord => (
                <div key={ord.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium">{ord.order_number}</p>
                    <p className="text-xs text-muted-foreground">{ord.customer_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={ord.status} />
                    <span className="text-sm font-semibold">${(ord.total_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}