# NexusERP 365 — Open Enterprise ERP Suite

[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg?logo=docker)](docker-compose.yml)
[![License](https://img.shields.io/badge/Edition-Unrestricted%20Enterprise-success.svg)](#)
[![D365 Compatible](https://img.shields.io/badge/Compatibility-Dynamics%20365%20BC%20%26%20F%26O-0078D4.svg?logo=microsoft)](https://learn.microsoft.com/en-gb/dynamics365/business-central/)

**NexusERP 365** is a full-featured, open enterprise resource planning suite designed to mirror the capabilities of **Microsoft Dynamics 365 Business Central** and **Dynamics 365 Finance & Operations** — without commercial seat licenses, per-user limits, or proprietary tier gates.

---

## 🚀 Key Modules & Capabilities

### 1. Financial Management (D365 BC / F&O General Ledger)
* **General Ledger & Chart of Accounts**: Account hierarchies, category rollups, debit/credit tracking, and live trial balances.
* **Global & Shortcut Dimensions**: Multi-dimensional financial segmentation (Department, CustomerGroup, Project, Area).
* **Multi-Currency & Exchange Rates**: Automated foreign exchange revaluation and currency conversion (GBP, USD, EUR).
* **Bank Reconciliation**: Automated statement matching, reconciliation journals, and difference balancing.
* **Posting Groups & Fixed Assets**: Automated subledger-to-GL posting and asset depreciation schedules.
* **Budgets & Financial Reporting**: Real-time balance sheets, income statements, and segment variance analysis.

### 2. Supply Chain & Advanced Warehouse Management (WMS)
* **Locations, Zones & Bins**: Staging, bulk storage, pick faces, and cross-docking zones.
* **Warehouse Receipts & Put-aways**: Inbound staging with bin allocation and status control.
* **Directed Picking & Shipments**: Wave picking, staged dispatch, and order fulfillment.
* **Item Tracking (Serial & Lot/Batch Numbers)**: Full traceability, batch expiration dates, warranty management, and audit inspection.
* **Inventory Counting & Physical Journals**: Cyclical stock audits, automated variance calculation, and GL adjustments.

### 3. Manufacturing & Material Requirements Planning (MRP)
* **Multi-Level Bills of Materials (BOM)**: Version-controlled component structures with scrap percentages.
* **Work & Machine Centers**: Production lines with run/setup capacities, hourly costing, and efficiency metrics.
* **Production Orders**: Full lifecycle management across Simulated, Planned, Firm Planned, Released, and Finished states.
* **MRP / MPS Regenerative Engine**: Automated demand net-off calculating purchase requisitions and production orders to prevent stockouts.

### 4. Order-to-Cash & Procure-to-Pay
* **Sales Quotes, Orders, Shipments & Invoices**: Multi-stage order fulfillment with automated posting.
* **Customer Price Lists**: Customer-tier specific pricing and volume discount matrix.
* **Purchase Requisitions & Approvals**: Requisition limit governance with hierarchy approval workflows.
* **3-Way Matching**: Automated reconciliation of Purchase Order vs. Goods Receipt vs. Vendor Invoice.
* **Credit Memos & Returns**: Automated inventory replenishment and credit memo postings.

### 5. Governance, Services & Projects
* **Approval Workflows**: Matrix approval limits with auditable delegation.
* **Service Contracts & SLAs**: Response-time management and recurring service billing.
* **Job & Project Accounting**: Time, material, and fixed-price cost accounting.

### 6. Role Centers & Copilot AI Assistant
* **Personalized Role Centers**: Workspaces customized for *Business Manager*, *Financial Controller*, *Sales Order Processor*, *Purchasing Agent*, *Warehouse Manager*, and *Manufacturing Planner*.
* **Embedded D365 Copilot**: Natural language AI assistant to query ledger metrics, check inventory availability, and run MRP actions.
* **Multi-Company Architecture**: Switch instantly between legal entities:
  * 🇬🇧 **CRONUS UK Ltd.** (GBP)
  * 🇺🇸 **Contoso US Inc.** (USD)
  * 🇪🇺 **Fabrikam Europe BV** (EUR)

### 7. Higher Education & University Lifecycle (MIT Model)
* **Full Student Lifecycle**: End-to-end management spanning *Prospect → Applicant → Enrolled → In Good Standing / Probation → Degree Conferred → Active Alumni*.
* **Academic Programmes & Degree Audits**: Undergraduate, Master's, and Doctoral degrees with credit requirements, core courses, electives, and GPA calculation.
* **Course Catalog & Registration**: Prerequisite checks, term-based enrollment, waitlists, and schedule conflicts.
* **Student Records & Transcripts**: Automated GPA calculation, academic standing evaluation, probation triggers, and official transcript generation.
* **Student Financial Services**: Tuition billing, scholarship allocation, fee adjustments, and student ledger integration with General Ledger.
* **Graduation & Alumni Registry**: Degree certification, graduation clearance, honours designation, and alumni career tracking.

### 8. IT Administration & Security Matrix (CRUDX)
* **Granular Permission Matrix**: Role-based and user-level permissions control across all ERP entities with full **CRUDX** rights (Create, Read, Update, Delete, Execute).
* **Role Provisioning**: Pre-configured system roles (*System Administrator*, *Financial Controller*, *Sales Agent*, *Warehouse Lead*, *Auditor*, *Registrar*) with custom role builder.
* **User Management**: Direct user onboarding, multi-factor authentication policies, legal entity access scoping, and session termination.
* **Security Audit Logs**: Comprehensive immutable trail of access, role modifications, and privilege escalations.

### 9. Enhanced Navigation & Enterprise Usability
* **Real-Time Global Search**: Searchable left navigation filtering by module, sub-menu, or specific business entity.
* **Dynamic Legal Entity Provisioning**: Create new legal entities on-the-fly with template data cloning and distinct base currencies.
* **Microsoft Dynamics 365 BC Sample Data**: Fully pre-seeded with Microsoft BC_DemoDB sample datasets (customers, vendors, items, and chart of accounts).
* **Cloudflare Zero Trust Integration**: Fully accessible securely over public Cloudflare Tunnel at [https://nexus.npcsolutions.co.uk](https://nexus.npcsolutions.co.uk).

---

## 🐳 Quick Start with Docker

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1. Clone the Repository
```bash
git clone https://github.com/chaminukambanje/nexus-erp.git
cd nexus-erp
```

### 2. Run with Docker Compose
```bash
docker compose up -d --build
```

### 3. Access the Application
The ERP container is pre-configured and exposed on two convenient ports:
* **Role Center**: [http://localhost:8080/role-center](http://localhost:8080/role-center) or [http://localhost:3000/role-center](http://localhost:3000/role-center)
* **Main Dashboard**: [http://localhost:8080](http://localhost:8080) or [http://localhost:3000](http://localhost:3000)

---

## 🛠 Local Development (Vite + React)

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev
```

App will be available at `http://localhost:5173`.

---

## 📁 Repository Structure

```
nexus-erp/
├── Dockerfile                  # Multi-stage production container build
├── docker-compose.yml          # Container orchestration (ports 8080 & 3000, healthchecks)
├── nginx.conf                  # Nginx configuration with IPv6 support, SPA routing & reverse proxy
├── package.json
├── src/
│   ├── api/
│   │   ├── base44Client.js     # Base44 SDK Proxy client with failover
│   │   └── erpDataEngine.js    # Multi-company store & D365 business logic engine
│   ├── components/
│   │   ├── layout/             # Sidebar, Header, AppLayout, CopilotAssistant
│   │   └── ui/                 # Radix / Tailwind UI components
│   ├── pages/                  # D365 BC & F&O Modules:
│   │   ├── RoleCenter.jsx      # Role-based executive workspace
│   │   ├── Dimensions.jsx      # Global & shortcut financial dimensions
│   │   ├── Currencies.jsx      # FX exchange rates & revaluations
│   │   ├── BankReconciliation.jsx
│   │   ├── Warehouses.jsx      # Locations & bin zones
│   │   ├── WarehouseReceipts.jsx
│   │   ├── WarehousePicks.jsx
│   │   ├── ItemTracking.jsx    # Serial / Lot tracking
│   │   ├── InventoryCounting.jsx
│   │   ├── ManufacturingBOM.jsx
│   │   ├── WorkCenters.jsx
│   │   ├── ProductionOrders.jsx
│   │   ├── MRPPlanning.jsx     # MRP regenerative engine
│   │   ├── PurchaseRequisitions.jsx
│   │   ├── ThreeWayMatching.jsx
│   │   ├── SalesShipments.jsx
│   │   ├── CustomerPriceLists.jsx
│   │   ├── ServiceContracts.jsx
│   │   └── ApprovalWorkflows.jsx
│   └── App.jsx                 # Route registrations & auth provider
└── README.md
```

---

## 📄 License & Restrictions

* **License**: Unrestricted Enterprise Edition.
* **User Limits**: Unlimited users, no commercial seat licenses required.

