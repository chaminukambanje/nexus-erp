import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Receipt, ShoppingCart, Package,
  Users, UserCircle, TrendingUp, Building2, CreditCard,
  ChevronDown, ChevronRight, Menu, X, LogOut, Settings,
  FileText, Banknote, Truck, BarChart3, Target, Layers,
  UserCheck, Cpu, FolderKanban, Wrench, FileMinus, PiggyBank, BarChart2, ClipboardList,
  UserPlus, GraduationCap, BookOpenCheck, ClipboardCheck, Award,
  Workflow, Eye
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const navSections = [
  {
    label: 'Home',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard }
    ]
  },
  {
    label: 'Finance',
    items: [
      { label: 'Chart of Accounts', path: '/chart-of-accounts', icon: BookOpen },
      { label: 'Journal Entries', path: '/journal-entries', icon: FileText },
      { label: 'Bank Accounts', path: '/bank-accounts', icon: Building2 },
      { label: 'Payments', path: '/payments', icon: Banknote },
      { label: 'Budgets', path: '/budgets', icon: PiggyBank },
      { label: 'Fixed Assets', path: '/fixed-assets', icon: Cpu },
      { label: 'Credit Memos', path: '/credit-memos', icon: FileMinus },
    ]
  },
  {
    label: 'Sales',
    items: [
      { label: 'Customers', path: '/customers', icon: Users },
      { label: 'Sales Quotes', path: '/sales-quotes', icon: ClipboardList },
      { label: 'Sales Orders', path: '/sales-orders', icon: ShoppingCart },
      { label: 'Sales Invoices', path: '/sales-invoices', icon: Receipt },
    ]
  },
  {
    label: 'Purchasing',
    items: [
      { label: 'Vendors', path: '/vendors', icon: Truck },
      { label: 'Purchase Orders', path: '/purchase-orders', icon: Package },
      { label: 'Purchase Bills', path: '/purchase-bills', icon: CreditCard },
    ]
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Items', path: '/items', icon: Package },
    ]
  },
  {
    label: 'CRM',
    items: [
      { label: 'Contacts', path: '/contacts', icon: UserCircle },
      { label: 'Opportunities', path: '/opportunities', icon: Target },
    ]
  },
  {
    label: 'Projects',
    items: [
      { label: 'Projects', path: '/projects', icon: FolderKanban },
      { label: 'Service Orders', path: '/service-orders', icon: Wrench },
    ]
  },
  {
    label: 'HR',
    items: [
      { label: 'Employees', path: '/employees', icon: UserCheck },
    ]
  },
  {
    label: 'Reports',
    items: [
      { label: 'Financial Reports', path: '/financial-reports', icon: BarChart3 },
      { label: 'Legacy Reports', path: '/reports', icon: BarChart2 },
    ]
  },
  {
    label: 'University',
    items: [
      { label: 'Admissions', path: '/university/admissions', icon: UserPlus },
      { label: 'Lifecycle', path: '/university/lifecycle', icon: Workflow },
      { label: 'Programmes', path: '/university/programmes', icon: BookOpenCheck },
      { label: 'Students', path: '/university/students', icon: GraduationCap },
      { label: 'Gradebook', path: '/university/gradebook', icon: ClipboardCheck },
      { label: 'Progression', path: '/university/progression', icon: Award },
      { label: 'Student Portal', path: '/student-portal', icon: Eye },
    ]
  },
  {
    label: 'Setup',
    items: [
      { label: 'Posting Groups', path: '/posting-groups', icon: Layers },
    ]
  }
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState(
    navSections.reduce((acc, s) => ({ ...acc, [s.label]: true }), {})
  );

  const toggleSection = (label) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold text-sidebar-foreground tracking-tight">OpenERP</h1>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Business Central</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            {section.items.length > 1 ? (
              <>
                <button
                  onClick={() => toggleSection(section.label)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
                >
                  {!collapsed && <span>{section.label}</span>}
                  {!collapsed && (
                    openSections[section.label] 
                      ? <ChevronDown className="w-3 h-3" /> 
                      : <ChevronRight className="w-3 h-3" />
                  )}
                </button>
                {(openSections[section.label] || collapsed) && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <button
          onClick={() => base44.auth.logout()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-md border"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full bg-sidebar" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-sidebar-foreground/70"
            >
              <X className="w-5 h-5" />
            </button>
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border shrink-0 transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}>
        <NavContent />
      </aside>
    </>
  );
}