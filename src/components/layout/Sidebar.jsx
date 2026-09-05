import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Receipt, ShoppingCart, Package,
  Users, UserCircle, TrendingUp, Building2, CreditCard,
  ChevronDown, ChevronRight, Menu, X, LogOut, Settings,
  FileText, Banknote, Truck, BarChart3, Target, Layers,
  UserCheck, Cpu, FolderKanban, Wrench, FileMinus, PiggyBank, BarChart2, ClipboardList,
  UserPlus, GraduationCap, BookOpenCheck, ClipboardCheck, Award,
  Workflow, Eye, Warehouse, QrCode, Factory, Calculator, Scale,
  Coins, ArrowRightLeft, ShieldCheck, Briefcase, FileCheck, Tags, Sparkles
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Home",
    items: [
      { label: "Role Center", path: "/role-center", icon: Briefcase },
      { label: "Executive Dashboard", path: "/", icon: LayoutDashboard }
    ]
  },
  {
    label: "Finance",
    items: [
      { label: "Chart of Accounts", path: "/chart-of-accounts", icon: BookOpen },
      { label: "General Journals", path: "/journal-entries", icon: FileText },
      { label: "Dimensions & Tags", path: "/dimensions", icon: Layers },
      { label: "Bank Accounts", path: "/bank-accounts", icon: Building2 },
      { label: "Bank Reconciliation", path: "/bank-reconciliation", icon: ArrowRightLeft },
      { label: "Payments", path: "/payments", icon: Banknote },
      { label: "Currencies & Rates", path: "/currencies", icon: Coins },
      { label: "Budgets", path: "/budgets", icon: PiggyBank },
      { label: "Fixed Assets", path: "/fixed-assets", icon: Cpu },
      { label: "Credit Memos", path: "/credit-memos", icon: FileMinus },
      { label: "Posting Groups", path: "/posting-groups", icon: ShieldCheck }
    ]
  },
  {
    label: "Sales",
    items: [
      { label: "Customers", path: "/customers", icon: Users },
      { label: "Sales Quotes", path: "/sales-quotes", icon: ClipboardList },
      { label: "Sales Orders", path: "/sales-orders", icon: ShoppingCart },
      { label: "Sales Shipments", path: "/sales-shipments", icon: Truck },
      { label: "Sales Invoices", path: "/sales-invoices", icon: Receipt },
      { label: "Customer Price Lists", path: "/customer-price-lists", icon: Tags }
    ]
  },
  {
    label: "Purchasing",
    items: [
      { label: "Vendors", path: "/vendors", icon: Truck },
      { label: "Purchase Requisitions", path: "/purchase-requisitions", icon: ClipboardCheck },
      { label: "Purchase Orders", path: "/purchase-orders", icon: Package },
      { label: "3-Way Matching", path: "/three-way-matching", icon: Scale },
      { label: "Purchase Bills", path: "/purchase-bills", icon: CreditCard }
    ]
  },
  {
    label: "Supply Chain & WMS",
    items: [
      { label: "Items & Catalog", path: "/items", icon: Package },
      { label: "Warehouses & Bins", path: "/warehouses", icon: Warehouse },
      { label: "Warehouse Receipts", path: "/warehouse-receipts", icon: ArrowRightLeft },
      { label: "Warehouse Picks", path: "/warehouse-picks", icon: Truck },
      { label: "Serial & Lot Tracking", path: "/item-tracking", icon: QrCode },
      { label: "Physical Inventory", path: "/inventory-counting", icon: ClipboardList }
    ]
  },
  {
    label: "Manufacturing",
    items: [
      { label: "Production Orders", path: "/production-orders", icon: Factory },
      { label: "Production BOMs", path: "/manufacturing-bom", icon: Cpu },
      { label: "Work Centers & Routings", path: "/work-centers", icon: Wrench },
      { label: "MRP Planning Worksheet", path: "/mrp-planning", icon: Calculator }
    ]
  },
  {
    label: "Projects & Service",
    items: [
      { label: "Projects / Jobs", path: "/projects", icon: FolderKanban },
      { label: "Service Orders", path: "/service-orders", icon: Wrench },
      { label: "Service Contracts & SLAs", path: "/service-contracts", icon: FileCheck }
    ]
  },
  {
    label: "Approvals",
    items: [
      { label: "Approval Requests", path: "/approvals", icon: ShieldCheck }
    ]
  },
  {
    label: "Human Resources",
    items: [
      { label: "Employees", path: "/employees", icon: UserCheck }
    ]
  },
  {
    label: "CRM",
    items: [
      { label: "Contacts", path: "/contacts", icon: UserCircle },
      { label: "Opportunities", path: "/opportunities", icon: Target }
    ]
  },
  {
    label: "Reports & Analytics",
    items: [
      { label: "Financial Reports", path: "/financial-reports", icon: BarChart3 },
      { label: "Legacy Reports", path: "/reports", icon: BarChart2 }
    ]
  },
  {
    label: "University Module",
    items: [
      { label: "Admissions", path: "/university/admissions", icon: UserPlus },
      { label: "Lifecycle", path: "/university/lifecycle", icon: Workflow },
      { label: "Programmes", path: "/university/programmes", icon: BookOpenCheck },
      { label: "Students", path: "/university/students", icon: GraduationCap },
      { label: "Gradebook", path: "/university/gradebook", icon: ClipboardCheck },
      { label: "Progression", path: "/university/progression", icon: Award },
      { label: "Student Portal", path: "/student-portal", icon: Eye }
    ]
  }
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsedSections, setCollapsedSections] = useState({
    "University Module": true,
    "Reports & Analytics": true,
    "CRM": true
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSection = (label) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border/60">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold font-heading text-sm shadow-sm">
            N
          </div>
          <div>
            <div className="font-bold text-sm leading-tight tracking-tight font-heading">NexusERP 365</div>
            <div className="text-[10px] text-muted-foreground font-medium">Business Central Enterprise</div>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent text-muted-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {navSections.map((section) => {
          const isCollapsed = collapsedSections[section.label];
          return (
            <div key={section.label}>
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <span>{section.label}</span>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {!isCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border/60">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-4 z-40 p-2 rounded-lg bg-card border shadow-md text-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
