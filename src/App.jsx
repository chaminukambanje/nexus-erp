import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProtectedRoute from "@/components/ProtectedRoute";

// Auth pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

// Layout
import AppLayout from "@/components/layout/AppLayout";

// Standard Pages
import Dashboard from "@/pages/Dashboard";
import ChartOfAccounts from "@/pages/ChartOfAccounts";
import JournalEntries from "@/pages/JournalEntries";
import BankAccounts from "@/pages/BankAccounts";
import Payments from "@/pages/Payments";
import Customers from "@/pages/Customers";
import SalesOrders from "@/pages/SalesOrders";
import SalesInvoices from "@/pages/SalesInvoices";
import Vendors from "@/pages/Vendors";
import PurchaseOrders from "@/pages/PurchaseOrders";
import PurchaseBills from "@/pages/PurchaseBills";
import Items from "@/pages/Items";
import Contacts from "@/pages/Contacts";
import Opportunities from "@/pages/Opportunities";
import Reports from "@/pages/Reports";
import PostingGroups from "@/pages/PostingGroups";
import Employees from "@/pages/Employees";
import FixedAssets from "@/pages/FixedAssets";
import Projects from "@/pages/Projects";
import ServiceOrders from "@/pages/ServiceOrders";
import SalesQuotes from "@/pages/SalesQuotes";
import CreditMemos from "@/pages/CreditMemos";
import Budgets from "@/pages/Budgets";
import FinancialReports from "@/pages/FinancialReports";

// Dynamics 365 Business Central & F&O Enterprise Modules
import RoleCenter from "@/pages/RoleCenter";
import Dimensions from "@/pages/Dimensions";
import Currencies from "@/pages/Currencies";
import BankReconciliation from "@/pages/BankReconciliation";
import Warehouses from "@/pages/Warehouses";
import WarehouseReceipts from "@/pages/WarehouseReceipts";
import WarehousePicks from "@/pages/WarehousePicks";
import ItemTracking from "@/pages/ItemTracking";
import InventoryCounting from "@/pages/InventoryCounting";
import ManufacturingBOM from "@/pages/ManufacturingBOM";
import WorkCenters from "@/pages/WorkCenters";
import ProductionOrders from "@/pages/ProductionOrders";
import MRPPlanning from "@/pages/MRPPlanning";
import PurchaseRequisitions from "@/pages/PurchaseRequisitions";
import ThreeWayMatching from "@/pages/ThreeWayMatching";
import SalesShipments from "@/pages/SalesShipments";
import CustomerPriceLists from "@/pages/CustomerPriceLists";
import ServiceContracts from "@/pages/ServiceContracts";
import ApprovalWorkflows from "@/pages/ApprovalWorkflows";
import Companies from "@/pages/Companies";
import CashFlowForecast from "@/pages/CashFlowForecast";
import VATReturns from "@/pages/VATReturns";
import Intercompany from "@/pages/Intercompany";
import AssemblyOrders from "@/pages/AssemblyOrders";

// University pages
import Admissions from "@/pages/university/Admissions";
import Programmes from "@/pages/university/Programmes";
import Students from "@/pages/university/Students";
import Gradebook from "@/pages/university/Gradebook";
import Progression from "@/pages/university/Progression";
import StudentLifecycle from "@/pages/university/StudentLifecycle";
import StudentPortal from "@/pages/StudentPortal";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading NexusERP 365...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          {/* Home */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/role-center" element={<RoleCenter />} />
          <Route path="/companies" element={<Companies />} />

          {/* Finance */}
          <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="/journal-entries" element={<JournalEntries />} />
          <Route path="/dimensions" element={<Dimensions />} />
          <Route path="/bank-accounts" element={<BankAccounts />} />
          <Route path="/bank-reconciliation" element={<BankReconciliation />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/currencies" element={<Currencies />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/cash-flow" element={<CashFlowForecast />} />
          <Route path="/vat-returns" element={<VATReturns />} />
          <Route path="/intercompany" element={<Intercompany />} />
          <Route path="/fixed-assets" element={<FixedAssets />} />
          <Route path="/credit-memos" element={<CreditMemos />} />
          <Route path="/posting-groups" element={<PostingGroups />} />

          {/* Sales */}
          <Route path="/customers" element={<Customers />} />
          <Route path="/sales-quotes" element={<SalesQuotes />} />
          <Route path="/sales-orders" element={<SalesOrders />} />
          <Route path="/sales-shipments" element={<SalesShipments />} />
          <Route path="/sales-invoices" element={<SalesInvoices />} />
          <Route path="/customer-price-lists" element={<CustomerPriceLists />} />

          {/* Purchasing */}
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/purchase-requisitions" element={<PurchaseRequisitions />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/three-way-matching" element={<ThreeWayMatching />} />
          <Route path="/purchase-bills" element={<PurchaseBills />} />

          {/* Supply Chain & WMS */}
          <Route path="/items" element={<Items />} />
          <Route path="/warehouses" element={<Warehouses />} />
          <Route path="/warehouse-receipts" element={<WarehouseReceipts />} />
          <Route path="/warehouse-picks" element={<WarehousePicks />} />
          <Route path="/item-tracking" element={<ItemTracking />} />
          <Route path="/inventory-counting" element={<InventoryCounting />} />

          {/* Manufacturing */}
          <Route path="/production-orders" element={<ProductionOrders />} />
          <Route path="/assembly-orders" element={<AssemblyOrders />} />
          <Route path="/manufacturing-bom" element={<ManufacturingBOM />} />
          <Route path="/work-centers" element={<WorkCenters />} />
          <Route path="/mrp-planning" element={<MRPPlanning />} />

          {/* Projects & Services */}
          <Route path="/projects" element={<Projects />} />
          <Route path="/service-orders" element={<ServiceOrders />} />
          <Route path="/service-contracts" element={<ServiceContracts />} />

          {/* Approvals */}
          <Route path="/approvals" element={<ApprovalWorkflows />} />

          {/* HR & CRM */}
          <Route path="/employees" element={<Employees />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/opportunities" element={<Opportunities />} />

          {/* Reports & Analytics */}
          <Route path="/financial-reports" element={<FinancialReports />} />
          <Route path="/reports" element={<Reports />} />

          {/* University Subsystem */}
          <Route path="/university/admissions" element={<Admissions />} />
          <Route path="/university/lifecycle" element={<StudentLifecycle />} />
          <Route path="/university/programmes" element={<Programmes />} />
          <Route path="/university/students" element={<Students />} />
          <Route path="/university/gradebook" element={<Gradebook />} />
          <Route path="/university/progression" element={<Progression />} />
          <Route path="/student-portal" element={<StudentPortal />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthProvider>
          <AuthenticatedApp />
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}
