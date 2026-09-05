import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, DollarSign, ShoppingCart, Truck, Factory, Warehouse,
  AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Play, FileText,
  Server, Database, DownloadCloud
} from "lucide-react";
import { getActiveCompany, importBCServerSampleData } from "@/api/erpDataEngine";
import { toast } from "sonner";

export default function RoleCenter() {
  const [selectedRole, setSelectedRole] = useState("business_manager");
  const activeCompany = getActiveCompany();

  const [syncing, setSyncing] = useState(false);

  const handleSyncBCData = () => {
    setSyncing(true);
    try {
      const res = importBCServerSampleData(activeCompany.id, true);
      toast.success(`Synced ${res.count} records from Dynamics 365 Business Central Server (BC_DemoDB / CRONUS UK Ltd_)`);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      toast.error("Failed to sync BC data: " + err.message);
      setSyncing(false);
    }
  };

  const ROLES = [
    { id: "business_manager", title: "Business Manager", icon: Briefcase, desc: "Executive overview of cash flow, sales pipeline, and company profitability" },
    { id: "financial_controller", title: "Financial Controller", icon: DollarSign, desc: "General Ledger, bank reconciliations, VAT reports, and period closing" },
    { id: "sales_processor", title: "Sales Order Processor", icon: ShoppingCart, desc: "Order fulfillment, quotes, shipments, and customer receivables" },
    { id: "purchasing_agent", title: "Purchasing Agent", icon: Truck, desc: "Vendor orders, requisitions, 3-way matching, and payables" },
    { id: "warehouse_manager", title: "Warehouse Manager", icon: Warehouse, desc: "Inbound receipts, bin picks, stock counting, and lot/serial tracking" },
    { id: "production_planner", title: "Manufacturing Planner", icon: Factory, desc: "BOM management, work centers, production orders, and MRP planning" }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight font-heading">Dynamics 365 Role Center</h1>
            <Badge className="bg-primary/20 text-primary border-primary/30">{activeCompany.name}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Personalized role-based workspace inspired by Microsoft Dynamics 365 Business Central & Finance & Operations
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          {ROLES.map(role => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <Button
                key={role.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRole(role.id)}
                className="gap-1.5"
              >
                <Icon className="w-3.5 h-3.5" />
                {role.title}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Business Central Live Connection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Dynamics 365 Business Central Server Live Link</span>
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] py-0">
                192.168.0.39: Online
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0 font-mono">
                BC_DemoDB / CRONUS UK Ltd_
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5">
              370+ Authentic records loaded: Customers, Vendors, Items, Chart of Accounts, Bank Accounts, Orders, Warehouses & Dimensions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncBCData}
            disabled={syncing}
            className="h-8 text-xs font-semibold gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
          >
            <DownloadCloud className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync BC Server Data'}</span>
          </Button>
          <Link to="/companies">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">
              Manage Entities →
            </Button>
          </Link>
        </div>
      </div>

      {/* Role Workspace Content */}
      {selectedRole === "business_manager" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">Cash Available</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">$388,920.00</div>
                <p className="text-xs text-muted-foreground mt-1">Across 3 Operating Bank Accounts</p>
                <Link to="/bank-accounts" className="text-xs text-primary font-semibold hover:underline mt-2 inline-block">View Bank Ledger →</Link>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">Overdue Sales Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-500">2 Invoices ($18,400)</div>
                <p className="text-xs text-muted-foreground mt-1">Average Days Overdue: 14 days</p>
                <Link to="/sales-invoices" className="text-xs text-primary font-semibold hover:underline mt-2 inline-block">Open Invoices →</Link>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">Pending Document Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">2 Requests</div>
                <p className="text-xs text-muted-foreground mt-1">1 Purchase Order, 1 Credit Limit</p>
                <Link to="/approvals" className="text-xs text-primary font-semibold hover:underline mt-2 inline-block">Review Approvals →</Link>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">MRP Action Proposals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-600">3 Proposals</div>
                <p className="text-xs text-muted-foreground mt-1">Supply shortages detected</p>
                <Link to="/mrp-planning" className="text-xs text-primary font-semibold hover:underline mt-2 inline-block">Open MRP Worksheet →</Link>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Operational Actions</CardTitle>
                <CardDescription>Direct navigation to primary Business Central workflows</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Link to="/sales-orders" className="p-3 border rounded-lg hover:bg-muted/50 transition-colors block">
                  <div className="font-semibold text-sm">New Sales Order</div>
                  <div className="text-xs text-muted-foreground">Create order & allocate stock</div>
                </Link>
                <Link to="/purchase-orders" className="p-3 border rounded-lg hover:bg-muted/50 transition-colors block">
                  <div className="font-semibold text-sm">New Purchase Order</div>
                  <div className="text-xs text-muted-foreground">Issue PO to supplier</div>
                </Link>
                <Link to="/production-orders" className="p-3 border rounded-lg hover:bg-muted/50 transition-colors block">
                  <div className="font-semibold text-sm">Shopfloor Production</div>
                  <div className="text-xs text-muted-foreground">Release manufacturing order</div>
                </Link>
                <Link to="/dimensions" className="p-3 border rounded-lg hover:bg-muted/50 transition-colors block">
                  <div className="font-semibold text-sm">Dimensions & Reporting</div>
                  <div className="text-xs text-muted-foreground">Department & segment analysis</div>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Overview (CRONUS UK Ltd)</CardTitle>
                <CardDescription>Key Balance Sheet & P&L metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm">Total Current Assets</span>
                  <span className="font-bold font-mono">$1,420,800.00</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm">Accounts Receivable (A/R)</span>
                  <span className="font-bold font-mono text-emerald-600">$184,500.00</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm">Accounts Payable (A/P)</span>
                  <span className="font-bold font-mono text-rose-500">$92,300.00</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm">Gross Profit Margin</span>
                  <span className="font-bold font-mono text-primary">34.8%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedRole === "production_planner" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">WIP Production Orders</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-sky-600">1 Released</div><Link to="/production-orders" className="text-xs text-primary font-semibold mt-2 inline-block">Manage Shopfloor →</Link></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Certified BOMs</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">2 Multi-Level BOMs</div><Link to="/manufacturing-bom" className="text-xs text-primary font-semibold mt-2 inline-block">Review BOM Structure →</Link></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Material Shortfalls (MRP)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-rose-500">3 Shortfall Alerts</div><Link to="/mrp-planning" className="text-xs text-primary font-semibold mt-2 inline-block">Run MRP Calculation →</Link></CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedRole === "warehouse_manager" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Pending Inbound Receipts</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-600">1 Awaiting Staging</div><Link to="/warehouse-receipts" className="text-xs text-primary font-semibold mt-2 inline-block">Receive Goods →</Link></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Open Picking Orders</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-amber-500">1 Pick in Progress</div><Link to="/warehouse-picks" className="text-xs text-primary font-semibold mt-2 inline-block">Dispatch Picks →</Link></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Storage Locations & Bins</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">4 Hubs (38 Bins)</div><Link to="/warehouses" className="text-xs text-primary font-semibold mt-2 inline-block">Manage Bins →</Link></CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedRole !== "business_manager" && selectedRole !== "production_planner" && selectedRole !== "warehouse_manager" && (
        <Card className="p-8 text-center space-y-3">
          <h3 className="text-lg font-bold">Role Center Active: {ROLES.find(r => r.id === selectedRole)?.title}</h3>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            {ROLES.find(r => r.id === selectedRole)?.desc}
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Link to="/dashboard"><Button>Open Executive Dashboard</Button></Link>
            <Link to="/financial-reports"><Button variant="outline">View Financial Statements</Button></Link>
          </div>
        </Card>
      )}
    </div>
  );
}
