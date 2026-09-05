import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Receipt, ShoppingCart, Package,
  Users, UserCircle, TrendingUp, Building2, CreditCard,
  ChevronDown, ChevronRight, Menu, X, LogOut, Settings,
  FileText, Banknote, Truck, BarChart3, Target, Layers,
  UserCheck, Cpu, FolderKanban, Wrench, FileMinus, PiggyBank, BarChart2, ClipboardList,
  UserPlus, GraduationCap, BookOpenCheck, ClipboardCheck, Award,
  Workflow, Eye, Warehouse, QrCode, Factory, Calculator, Scale,
  Coins, ArrowRightLeft, ShieldCheck, Briefcase, FileCheck, Tags, Sparkles,
  Search, SlidersHorizontal, ArrowUpRight, Landmark, Boxes
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navSections = [
  {
    label: "Home",
    items: [
      {
        label: "Role Center",
        path: "/role-center",
        icon: Briefcase,
        keywords: ["role center", "homepage", "workspace", "kpis", "c-suite", "business manager", "financial controller", "executive", "overview"]
      },
      {
        label: "Executive Dashboard",
        path: "/",
        icon: LayoutDashboard,
        keywords: ["dashboard", "metrics", "analytics", "kpis", "summary", "revenue", "pipeline"]
      },
      {
        label: "Legal Entities & Companies",
        path: "/companies",
        icon: Building2,
        keywords: ["companies", "legal entities", "company", "subsidiaries", "intercompany", "business units", "multi company", "corporate structure", "new company", "add company", "create legal entity"]
      }
    ]
  },
  {
    label: "Finance",
    items: [
      {
        label: "Chart of Accounts",
        path: "/chart-of-accounts",
        icon: BookOpen,
        keywords: ["coa", "chart of accounts", "g/l", "general ledger", "trial balance", "balance sheet", "income statement", "assets", "liabilities", "equity", "debit", "credit"]
      },
      {
        label: "General Journals",
        path: "/journal-entries",
        icon: FileText,
        keywords: ["journal entries", "general journal", "gl entries", "adjustments", "accruals", "posting", "vouchers", "transactions"]
      },
      {
        label: "Dimensions & Tags",
        path: "/dimensions",
        icon: Layers,
        keywords: ["dimensions", "global dimensions", "shortcut dimensions", "cost center", "department", "project code", "segment", "financial tags", "analysis", "reporting dimension"]
      },
      {
        label: "Bank Accounts",
        path: "/bank-accounts",
        icon: Building2,
        keywords: ["cash", "checking", "savings", "iban", "bank ledger", "balances", "bank accounts", "liquidity"]
      },
      {
        label: "Bank Reconciliation",
        path: "/bank-reconciliation",
        icon: ArrowRightLeft,
        keywords: ["bank rec", "bank reconciliation", "bank statements", "auto match", "statement lines", "unreconciled", "cleared transactions", "balancing"]
      },
      {
        label: "Payments",
        path: "/payments",
        icon: Banknote,
        keywords: ["disbursements", "cash payments", "vendor payments", "wire transfers", "payment journal", "settlement"]
      },
      {
        label: "Currencies & Rates",
        path: "/currencies",
        icon: Coins,
        keywords: ["fx", "forex", "exchange rates", "foreign currency", "revaluation", "gbp", "usd", "eur", "triangulation"]
      },
      {
        label: "Budgets",
        path: "/budgets",
        icon: PiggyBank,
        keywords: ["financial budgets", "forecast", "gl budget", "variance", "budget vs actual", "cost center budget"]
      },
      {
        label: "Cash Flow Forecast",
        path: "/cash-flow",
        icon: TrendingUp,
        keywords: ["cash flow", "liquidity", "forecast", "runway", "inflows", "outflows", "cash planning", "working capital", "treasury", "business central cash flow"]
      },
      {
        label: "VAT Returns & Statements",
        path: "/vat-returns",
        icon: Landmark,
        keywords: ["vat", "tax", "vat return", "vat statement", "hmrc", "mtd", "making tax digital", "box 1", "box 5", "settlement", "tax return", "ecsl"]
      },
      {
        label: "Intercompany Postings",
        path: "/intercompany",
        icon: ArrowRightLeft,
        keywords: ["intercompany", "ic", "inbox", "outbox", "affiliates", "subsidiaries", "cross company", "recharges", "netting", "consolidation", "ic partner"]
      },
      {
        label: "Fixed Assets",
        path: "/fixed-assets",
        icon: Cpu,
        keywords: ["fixed assets", "equipment", "machinery", "vehicles", "depreciation", "acquisition", "disposal", "asset register", "book value"]
      },
      {
        label: "Credit Memos",
        path: "/credit-memos",
        icon: FileMinus,
        keywords: ["credit memos", "refunds", "returns", "sales returns", "credit note", "reversal", "adjustment"]
      },
      {
        label: "Posting Groups",
        path: "/posting-groups",
        icon: ShieldCheck,
        keywords: ["posting groups", "customer posting", "vendor posting", "inventory posting", "vat posting", "subledger mapping", "tax", "general posting setup"]
      }
    ]
  },
  {
    label: "Sales",
    items: [
      {
        label: "Customers",
        path: "/customers",
        icon: Users,
        keywords: ["customers", "clients", "debtors", "accounts receivable", "ar", "customer list", "credit limit", "payment terms"]
      },
      {
        label: "Sales Quotes",
        path: "/sales-quotes",
        icon: ClipboardList,
        keywords: ["sales quotes", "estimates", "proposals", "bids", "quotations", "sales pipeline"]
      },
      {
        label: "Sales Orders",
        path: "/sales-orders",
        icon: ShoppingCart,
        keywords: ["sales orders", "so", "order processing", "customer orders", "sales lines", "fulfillment", "order confirmation"]
      },
      {
        label: "Sales Shipments",
        path: "/sales-shipments",
        icon: Truck,
        keywords: ["sales shipments", "dispatch", "delivery notes", "packing slips", "carrier tracking", "outbound", "posted shipments"]
      },
      {
        label: "Sales Invoices",
        path: "/sales-invoices",
        icon: Receipt,
        keywords: ["sales invoices", "billing", "customer invoices", "posted sales invoices", "receivables", "revenue", "tax invoices"]
      },
      {
        label: "Customer Price Lists",
        path: "/customer-price-lists",
        icon: Tags,
        keywords: ["customer price lists", "special pricing", "discounts", "sales price", "volume tiers", "contract prices", "price groups"]
      }
    ]
  },
  {
    label: "Purchasing",
    items: [
      {
        label: "Vendors",
        path: "/vendors",
        icon: Truck,
        keywords: ["vendors", "suppliers", "creditors", "accounts payable", "ap", "vendor catalog", "procurement source"]
      },
      {
        label: "Purchase Requisitions",
        path: "/purchase-requisitions",
        icon: ClipboardCheck,
        keywords: ["purchase requisitions", "requisitions", "spend requests", "purchase requests", "approval limits", "internal requisition", "procurement"]
      },
      {
        label: "Purchase Orders",
        path: "/purchase-orders",
        icon: Package,
        keywords: ["purchase orders", "po", "procurement orders", "supplier orders", "vendor orders", "receiving orders"]
      },
      {
        label: "3-Way Matching",
        path: "/three-way-matching",
        icon: Scale,
        keywords: ["three way matching", "3-way matching", "po invoice matching", "receipt matching", "goods receipt note", "grn", "invoice variance", "tolerance"]
      },
      {
        label: "Purchase Bills",
        path: "/purchase-bills",
        icon: CreditCard,
        keywords: ["purchase bills", "vendor bills", "ap bills", "invoices payable", "supplier bills", "posted bills"]
      }
    ]
  },
  {
    label: "Supply Chain & WMS",
    items: [
      {
        label: "Items & Catalog",
        path: "/items",
        icon: Package,
        keywords: ["items", "products", "inventory", "stock", "sku", "raw materials", "finished goods", "catalog", "unit of measure", "costing"]
      },
      {
        label: "Warehouses & Bins",
        path: "/warehouses",
        icon: Warehouse,
        keywords: ["warehouses", "wms", "locations", "zones", "bins", "aisles", "racks", "storage", "facilities", "bin types"]
      },
      {
        label: "Warehouse Receipts",
        path: "/warehouse-receipts",
        icon: ArrowRightLeft,
        keywords: ["warehouse receipts", "inbound", "receiving", "put-away", "dock staging", "unloading", "staging bin"]
      },
      {
        label: "Warehouse Picks",
        path: "/warehouse-picks",
        icon: Truck,
        keywords: ["warehouse picks", "picking", "directed pick", "wave picking", "outbound staging", "order fulfillment", "pick lists"]
      },
      {
        label: "Serial & Lot Tracking",
        path: "/item-tracking",
        icon: QrCode,
        keywords: ["item tracking", "serial numbers", "lot numbers", "batch numbers", "expiration dates", "expiry", "traceability", "recall", "shelf life"]
      },
      {
        label: "Physical Inventory",
        path: "/inventory-counting",
        icon: ClipboardList,
        keywords: ["inventory counting", "physical inventory", "stock take", "cycle count", "stock count journal", "variance", "reconciliation"]
      }
    ]
  },
  {
    label: "Manufacturing",
    items: [
      {
        label: "Production Orders",
        path: "/production-orders",
        icon: Factory,
        keywords: ["production orders", "manufacturing orders", "work orders", "shopfloor", "wip", "routing", "operations", "released orders", "finished orders"]
      },
      {
        label: "Assembly Orders & Kitting",
        path: "/assembly-orders",
        icon: Boxes,
        keywords: ["assembly orders", "kitting", "kits", "assemble to order", "ato", "ats", "assemble to stock", "bundle", "light manufacturing", "bill of materials"]
      },
      {
        label: "Production BOMs",
        path: "/manufacturing-bom",
        icon: Cpu,
        keywords: ["bom", "bill of materials", "multi-level bom", "components", "recipe", "assembly", "scrap percentage", "sub-assembly"]
      },
      {
        label: "Work Centers & Routings",
        path: "/work-centers",
        icon: Wrench,
        keywords: ["work centers", "machine centers", "routings", "capacities", "run time", "setup time", "shop floor", "efficiency", "hourly cost"]
      },
      {
        label: "MRP Planning Worksheet",
        path: "/mrp-planning",
        icon: Calculator,
        keywords: ["mrp", "mps", "planning worksheet", "material requirements planning", "regenerative planning", "demand supply", "stockouts", "net requirements", "action messages"]
      }
    ]
  },
  {
    label: "Projects & Service",
    items: [
      {
        label: "Projects / Jobs",
        path: "/projects",
        icon: FolderKanban,
        keywords: ["projects", "jobs", "project accounting", "wbs", "tasks", "time and materials", "fixed price", "budget vs actual"]
      },
      {
        label: "Service Orders",
        path: "/service-orders",
        icon: Wrench,
        keywords: ["service orders", "repairs", "field service", "maintenance", "technicians", "work orders"]
      },
      {
        label: "Service Contracts & SLAs",
        path: "/service-contracts",
        icon: FileCheck,
        keywords: ["service contracts", "sla", "service level agreements", "warranties", "recurring billing", "coverage hours"]
      }
    ]
  },
  {
    label: "Approvals",
    items: [
      {
        label: "Approval Requests",
        path: "/approvals",
        icon: ShieldCheck,
        keywords: ["approvals", "workflows", "requests to approve", "delegation", "signing limits", "audit trail", "authorization", "pending approvals"]
      }
    ]
  },
  {
    label: "Human Resources",
    items: [
      {
        label: "Employees",
        path: "/employees",
        icon: UserCheck,
        keywords: ["employees", "staff", "payroll", "hr", "human resources", "personnel", "workers", "headcount"]
      }
    ]
  },
  {
    label: "CRM",
    items: [
      {
        label: "Contacts",
        path: "/contacts",
        icon: UserCircle,
        keywords: ["contacts", "crm contacts", "address book", "leads", "business relations", "phone", "email"]
      },
      {
        label: "Opportunities",
        path: "/opportunities",
        icon: Target,
        keywords: ["opportunities", "sales pipeline", "deals", "crm opportunities", "win rate", "sales stages", "probability"]
      }
    ]
  },
  {
    label: "Reports & Analytics",
    items: [
      {
        label: "Financial Reports",
        path: "/financial-reports",
        icon: BarChart3,
        keywords: ["financial reports", "financial statements", "balance sheet report", "income statement report", "trial balance report", "analytics"]
      },
      {
        label: "Legacy Reports",
        path: "/reports",
        icon: BarChart2,
        keywords: ["reports", "data export", "summary reports", "audit reports"]
      }
    ]
  },
  {
    label: "University Module",
    items: [
      {
        label: "Admissions",
        path: "/university/admissions",
        icon: UserPlus,
        keywords: ["university admissions", "applicant", "enrolment", "application", "prospects", "student intake"]
      },
      {
        label: "Lifecycle",
        path: "/university/lifecycle",
        icon: Workflow,
        keywords: ["student lifecycle", "stages", "alumni", "graduation", "retention"]
      },
      {
        label: "Programmes",
        path: "/university/programmes",
        icon: BookOpenCheck,
        keywords: ["university programmes", "courses", "degrees", "curriculum", "modules", "academics", "syllabus"]
      },
      {
        label: "Students",
        path: "/university/students",
        icon: GraduationCap,
        keywords: ["students", "student directory", "learners", "undergrad", "postgrad", "registration"]
      },
      {
        label: "Gradebook",
        path: "/university/gradebook",
        icon: ClipboardCheck,
        keywords: ["gradebook", "grades", "marks", "assessments", "transcripts", "exams", "gpa"]
      },
      {
        label: "Progression",
        path: "/university/progression",
        icon: Award,
        keywords: ["academic progression", "academic standing", "gpa", "credits", "prerequisites", "honors"]
      },
      {
        label: "Student Portal",
        path: "/student-portal",
        icon: Eye,
        keywords: ["student portal", "self service", "student dashboard", "portal", "grades view"]
      }
    ]
  }
];

const categoryFilters = ["All", "Finance", "Sales", "Purchasing", "WMS", "Manufacturing", "University"];

export default function Sidebar() {
  const location = useLocation();
  const searchInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");
  const [collapsedSections, setCollapsedSections] = useState({
    "University Module": true,
    "Reports & Analytics": true,
    "CRM": true
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Global keyboard shortcut to focus search: Cmd+K / Ctrl+K or '/'
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  // Search filtering logic
  const { filteredSections, totalMatches, isSearching } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const hasCategoryFilter = activeCategoryFilter !== "All";

    if (!query && !hasCategoryFilter) {
      return { filteredSections: navSections, totalMatches: 0, isSearching: false };
    }

    let count = 0;
    const filtered = navSections
      .map((section) => {
        // Check category filter
        if (hasCategoryFilter) {
          const cat = activeCategoryFilter.toLowerCase();
          const secName = section.label.toLowerCase();
          const matchesCategory =
            secName.includes(cat) ||
            (cat === "wms" && secName.includes("supply chain")) ||
            (cat === "university" && secName.includes("university"));
          if (!matchesCategory) return null;
        }

        const sectionMatchesQuery = query && section.label.toLowerCase().includes(query);

        // Filter items in section
        const matchingItems = section.items
          .map((item) => {
            if (!query) {
              return { item, matchReason: null };
            }

            const labelMatch = item.label.toLowerCase().includes(query);
            const pathMatch = item.path.toLowerCase().includes(query);
            const matchedKeyword = (item.keywords || []).find((kw) => kw.toLowerCase().includes(query));

            if (sectionMatchesQuery || labelMatch || pathMatch || matchedKeyword) {
              let matchReason = null;
              if (matchedKeyword && !labelMatch) {
                matchReason = matchedKeyword;
              } else if (sectionMatchesQuery && !labelMatch) {
                matchReason = section.label;
              }
              return { item, matchReason };
            }
            return null;
          })
          .filter(Boolean);

        if (matchingItems.length > 0) {
          count += matchingItems.length;
          return {
            label: section.label,
            items: matchingItems
          };
        }
        return null;
      })
      .filter(Boolean);

    return { filteredSections: filtered, totalMatches: count, isSearching: true };
  }, [searchQuery, activeCategoryFilter]);

  const clearSearch = () => {
    setSearchQuery("");
    setActiveCategoryFilter("All");
    searchInputRef.current?.focus();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border/60 shrink-0">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold font-heading text-sm shadow-sm">
            N
          </div>
          <div>
            <div className="font-bold text-sm leading-tight tracking-tight font-heading">NexusERP 365</div>
            <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <span>Business Central & F&O</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent text-muted-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Interactive Search Bar */}
      <div className="p-3 border-b border-sidebar-border/60 bg-sidebar-accent/10 space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search module, entity, menu..."
            className="w-full bg-background text-foreground placeholder:text-muted-foreground/70 text-xs pl-8 pr-14 py-1.5 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-2xs transition-all"
          />
          {searchQuery ? (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Clear search (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-muted/60 px-1 py-0.5 rounded border border-muted-foreground/20 pointer-events-none">
              ⌘K
            </span>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
          {categoryFilters.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={cn(
                "px-2 py-0.5 rounded-full shrink-0 transition-colors font-medium",
                activeCategoryFilter === cat
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-sidebar-accent/40 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search status summary if active */}
        {isSearching && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
            <span>
              Found <strong className="text-foreground">{totalMatches}</strong> {totalMatches === 1 ? "match" : "matches"}
            </span>
            <button
              onClick={clearSearch}
              className="text-[10px] text-primary hover:underline font-medium"
            >
              Reset view
            </button>
          </div>
        )}
      </div>

      {/* Nav Items Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {filteredSections.length === 0 ? (
          <div className="py-8 text-center px-4">
            <div className="w-8 h-8 rounded-full bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground mb-2">
              <Search className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-foreground">No navigation items found</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              No matching modules, menus, or entities for "{searchQuery}".
            </p>
            <button
              onClick={clearSearch}
              className="mt-3 text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Clear filters and show all
            </button>
          </div>
        ) : (
          filteredSections.map((section) => {
            const isCollapsed = !isSearching && collapsedSections[section.label];
            return (
              <div key={section.label} className="space-y-1">
                <button
                  onClick={() => !isSearching && toggleSection(section.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider transition-colors",
                    isSearching ? "cursor-default text-primary font-bold" : "hover:text-foreground cursor-pointer"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{section.label}</span>
                    {isSearching && (
                      <span className="text-[10px] lowercase font-normal text-muted-foreground">
                        ({section.items.length})
                      </span>
                    )}
                  </span>
                  {!isSearching && (
                    isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )
                  )}
                </button>

                {(!isCollapsed || isSearching) && (
                  <div className="space-y-0.5">
                    {section.items.map((entry) => {
                      const item = isSearching ? entry.item : entry;
                      const matchReason = isSearching ? entry.matchReason : null;
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {matchReason && (
                            <span className="text-[9px] text-muted-foreground bg-sidebar-accent/70 px-1.5 py-0.2 rounded shrink-0 ml-1.5 font-mono truncate max-w-[90px]">
                              {matchReason}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border/60 shrink-0">
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

