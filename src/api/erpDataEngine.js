// Universal Enterprise Data Engine for NexusERP (Dynamics 365 Business Central & F&O Equivalent)
// Provides complete offline-capable, unrestricted persistence with full seed data matching CRONUS International Ltd.
import { BC_SAMPLE_DATA } from "./bcSampleData";
import { MIT_SAMPLE_DATA } from "./mitSampleData";

export { BC_SAMPLE_DATA, MIT_SAMPLE_DATA };

const STORAGE_PREFIX = "nexuserp_data_";
const ACTIVE_COMPANY_KEY = "nexuserp_active_company";
const COMPANIES_STORAGE_KEY = "nexuserp_companies_list";

export const DEFAULT_COMPANIES = [
  { id: "cronus-uk", name: "CRONUS UK Ltd.", code: "GB", currency: "GBP", country: "United Kingdom", logo: "🇬🇧", created_at: "2026-01-01" },
  { id: "contoso-us", name: "Contoso Enterprise Solutions Inc.", code: "US", currency: "USD", country: "United States", logo: "🇺🇸", created_at: "2026-01-01" },
  { id: "fabrikam-eu", name: "Fabrikam Manufacturing GmbH", code: "DE", currency: "EUR", country: "Germany", logo: "🇩🇪", created_at: "2026-01-01" }
];

export function getCompanies() {
  if (typeof window === "undefined") return DEFAULT_COMPANIES;
  const stored = localStorage.getItem(COMPANIES_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(DEFAULT_COMPANIES));
    return DEFAULT_COMPANIES;
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_COMPANIES;
  } catch {
    return DEFAULT_COMPANIES;
  }
}

// Dynamic Proxy for backward compatibility with existing imports of COMPANIES
export const COMPANIES = new Proxy(DEFAULT_COMPANIES, {
  get(target, prop, receiver) {
    const list = getCompanies();
    if (prop === "length") return list.length;
    if (typeof prop === "string" && !isNaN(prop)) return list[Number(prop)];
    if (typeof list[prop] === "function") return list[prop].bind(list);
    return Reflect.get(list, prop, receiver);
  }
});

export function getActiveCompany() {
  if (typeof window === "undefined") return DEFAULT_COMPANIES[0];
  const saved = localStorage.getItem(ACTIVE_COMPANY_KEY);
  const companies = getCompanies();
  return companies.find(c => c.id === saved) || companies[0];
}

export function setActiveCompany(companyId) {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
    window.dispatchEvent(new CustomEvent("company_changed", { detail: companyId }));
  }
}

export function createLegalEntity({ name, code, currency, country, logo, copySetupFrom = "cronus-uk" }) {
  if (!name || !name.trim()) throw new Error("Company name is required");
  const cleanCode = (code || name.slice(0, 4)).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const id = `comp-${cleanCode.toLowerCase()}-${Date.now().toString(36)}`;

  const newCompany = {
    id,
    name: name.trim(),
    code: cleanCode,
    currency: (currency || "GBP").toUpperCase(),
    country: country || "United Kingdom",
    logo: logo || "🏢",
    created_at: new Date().toISOString()
  };

  const list = getCompanies();
  list.push(newCompany);
  localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(list));

  // If template is specified, copy baseline configuration and master entities into new company's data namespace
  if (copySetupFrom && copySetupFrom !== "none" && typeof window !== "undefined") {
    const configEntities = Object.keys(INITIAL_DATA);
    configEntities.forEach(entity => {
      const sourceKey = `${STORAGE_PREFIX}${copySetupFrom}_${entity}`;
      const targetKey = `${STORAGE_PREFIX}${id}_${entity}`;
      const sourceData = localStorage.getItem(sourceKey);
      if (sourceData) {
        localStorage.setItem(targetKey, sourceData);
      } else if (INITIAL_DATA[entity]) {
        localStorage.setItem(targetKey, JSON.stringify(INITIAL_DATA[entity]));
      }
    });
  }

  window.dispatchEvent(new CustomEvent("companies_updated", { detail: list }));
  return newCompany;
}

export function updateLegalEntity(companyId, data) {
  const list = getCompanies();
  const index = list.findIndex(c => c.id === companyId);
  if (index === -1) throw new Error("Company not found");
  list[index] = { ...list[index], ...data };
  localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("companies_updated", { detail: list }));
  return list[index];
}

export function deleteLegalEntity(companyId) {
  const list = getCompanies();
  if (list.length <= 1) throw new Error("Cannot delete the only remaining legal entity");
  const filtered = list.filter(c => c.id !== companyId);
  localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(filtered));

  // If the deleted company was active, switch to the first remaining one
  if (getActiveCompany().id === companyId) {
    setActiveCompany(filtered[0].id);
  }

  window.dispatchEvent(new CustomEvent("companies_updated", { detail: filtered }));
  return filtered;
}

// Interactive utility to import / re-sync sample data from Microsoft Dynamics 365 Business Central Server (BC_DemoDB / CRONUS UK Ltd_)
export function importBCServerSampleData(targetCompanyId = null, force = true) {
  const companyId = targetCompanyId || getActiveCompany().id;
  let totalCount = 0;
  if (typeof window !== "undefined") {
    for (const [entityName, records] of Object.entries(INITIAL_DATA)) {
      const storageKey = `${STORAGE_PREFIX}${companyId}_${entityName}`;
      if (force || !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify(records));
        totalCount += records.length;
        window.dispatchEvent(new CustomEvent(`datastore_${entityName}_updated`, { detail: records }));
      }
    }
    window.dispatchEvent(new CustomEvent("bc_sample_data_imported", { detail: { companyId, totalCount } }));
  }
  return { success: true, count: totalCount, companyId };
}

// Utility to load MIT Academic Student Life Cycle master data (Course Departments, GIRs, Students, UROPs, Advising)
export function importMITAcademicLifeCycleData(targetCompanyId = null, force = true) {
  const companyId = targetCompanyId || getActiveCompany().id;
  let totalCount = 0;
  if (typeof window !== "undefined") {
    for (const [entityName, records] of Object.entries(MIT_SAMPLE_DATA)) {
      const storageKey = `${STORAGE_PREFIX}${companyId}_${entityName}`;
      if (force || !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify(records));
        totalCount += records.length;
        window.dispatchEvent(new CustomEvent(`datastore_${entityName}_updated`, { detail: records }));
      }
    }
    window.dispatchEvent(new CustomEvent("mit_lifecycle_data_imported", { detail: { companyId, totalCount } }));
  }
  return { success: true, count: totalCount, companyId };
}

// Initial seed data matching Dynamics 365 Business Central standards, seeded directly from SQL Server BC_DemoDB & MIT Academic Model
export const INITIAL_DATA = {
  ...BC_SAMPLE_DATA,
  ...MIT_SAMPLE_DATA,

  // Warehouses Bins & Advanced Routing
  WarehouseBin: [
    { id: "bin-1", location_code: "MAIN", zone: "RECEIVING", code: "REC-01", description: "Inbound Staging Bay 1", max_weight_kg: 5000, current_items: 4 },
    { id: "bin-2", location_code: "MAIN", zone: "STORAGE", code: "RACK-A-01", description: "Aisle A Tier 1 High Velocity", max_weight_kg: 2000, current_items: 12 },
    { id: "bin-3", location_code: "MAIN", zone: "STORAGE", code: "RACK-A-02", description: "Aisle A Tier 2 Standard", max_weight_kg: 2000, current_items: 8 },
    { id: "bin-4", location_code: "MAIN", zone: "PICKING", code: "PICK-01", description: "Active Pick Face 1", max_weight_kg: 1000, current_items: 15 },
    { id: "bin-5", location_code: "MAIN", zone: "SHIPPING", code: "SHIP-01", description: "Outbound Dispatch Bay", max_weight_kg: 8000, current_items: 2 },
    { id: "bin-6", location_code: "PROD-PLANT", zone: "SHOPFLOOR", code: "PROD-IN", description: "WIP Raw Materials Feed", max_weight_kg: 4000, current_items: 6 },
    { id: "bin-7", location_code: "PROD-PLANT", zone: "SHOPFLOOR", code: "PROD-OUT", description: "Finished Goods Staging", max_weight_kg: 4000, current_items: 3 }
  ],

  // Warehouse Receipts & Picks
  WarehouseReceipt: [
    { id: "wr-1", receipt_no: "WREC-10021", po_number: "PO-0004", vendor_name: "Industrial Metals Corp", location_code: "MAIN", status: "received", posting_date: "2026-09-04", total_qty: 150, received_by: "Chaminuka Mbanje", bin_code: "REC-01" },
    { id: "wr-2", receipt_no: "WREC-10022", po_number: "PO-0005", vendor_name: "Apex Electronics Supplies", location_code: "MAIN", status: "in_progress", posting_date: "2026-09-05", total_qty: 40, received_by: "Warehouse Clerk", bin_code: "REC-01" }
  ],
  WarehousePick: [
    { id: "wp-1", pick_no: "WPICK-5001", order_number: "SO-0001", customer_name: "Trafalgar Logistics Ltd", location_code: "MAIN", status: "completed", assigned_to: "Chaminuka Mbanje", bin_code: "PICK-01", total_lines: 3, ship_date: "2026-09-05" },
    { id: "wp-2", pick_no: "WPICK-5002", order_number: "SO-0002", customer_name: "Oxford Biomedical Labs", location_code: "MAIN", status: "open", assigned_to: "Logistics Team", bin_code: "PICK-01", total_lines: 2, ship_date: "2026-09-06" }
  ],

  // Item Tracking
  ItemTracking: [
    { id: "it-1", item_code: "ITEM-7001", item_name: "Industrial Servo Motor 400W", tracking_type: "serial", tracking_number: "SN-2026-88910", lot_number: "LOT-M26-A", expiry_date: "2029-06-30", location_code: "MAIN", bin_code: "RACK-A-01", status: "available" },
    { id: "it-2", item_code: "ITEM-7001", item_name: "Industrial Servo Motor 400W", tracking_type: "serial", tracking_number: "SN-2026-88911", lot_number: "LOT-M26-A", expiry_date: "2029-06-30", location_code: "MAIN", bin_code: "RACK-A-01", status: "available" },
    { id: "it-3", item_code: "ITEM-8002", item_name: "Lithium Polymer Battery Pack 48V", tracking_type: "lot", tracking_number: "N/A", lot_number: "LOT-BAT-202608", expiry_date: "2027-08-15", location_code: "MAIN", bin_code: "RACK-A-02", status: "available", quantity: 45 },
    { id: "it-4", item_code: "ITEM-9003", item_name: "Precision CNC Aluminum Chassis", tracking_type: "lot", tracking_number: "N/A", lot_number: "LOT-ALUM-99", expiry_date: null, location_code: "PROD-PLANT", bin_code: "PROD-IN", status: "in_production", quantity: 80 }
  ],

  // Manufacturing & BOM
  ManufacturingBOM: [
    { id: "bom-1", bom_no: "BOM-1001", description: "Apex Autonomous Delivery Drone v2", unit_of_measure: "PCS", status: "certified", version: "2.1", total_cost: 1450.00, lines: [
      { item_code: "ITEM-7001", description: "Industrial Servo Motor 400W", quantity: 4, unit: "PCS", unit_cost: 120.00, scrap_pct: 0 },
      { item_code: "ITEM-8002", description: "Lithium Polymer Battery Pack 48V", quantity: 2, unit: "PCS", unit_cost: 320.00, scrap_pct: 2 },
      { item_code: "ITEM-9003", description: "Precision CNC Aluminum Chassis", quantity: 1, unit: "PCS", unit_cost: 210.00, scrap_pct: 1 },
      { item_code: "ITEM-6004", description: "Flight Controller Avionics Board", quantity: 1, unit: "PCS", unit_cost: 120.00, scrap_pct: 0 }
    ]},
    { id: "bom-2", bom_no: "BOM-1002", description: "Smart Energy Storage Cabinet 10kWh", unit_of_measure: "PCS", status: "certified", version: "1.0", total_cost: 3200.00, lines: [
      { item_code: "ITEM-8002", description: "Lithium Polymer Battery Pack 48V", quantity: 8, unit: "PCS", unit_cost: 320.00, scrap_pct: 0 },
      { item_code: "ITEM-9003", description: "Precision CNC Aluminum Chassis", quantity: 2, unit: "PCS", unit_cost: 210.00, scrap_pct: 0 },
      { item_code: "ITEM-5005", description: "Bidirectional Power Inverter 5kW", quantity: 1, unit: "PCS", unit_cost: 450.00, scrap_pct: 1 }
    ]}
  ],
  WorkCenter: [
    { id: "wc-1", code: "WC-100", name: "CNC Machining Center", work_center_group: "FABRICATION", capacity_hours_per_day: 16, efficiency_pct: 92, standard_unit_cost: 75.00, setup_time_min: 45 },
    { id: "wc-2", code: "WC-200", name: "Precision Electronics SMT Assembly", work_center_group: "ASSEMBLY", capacity_hours_per_day: 16, efficiency_pct: 96, standard_unit_cost: 65.00, setup_time_min: 30 },
    { id: "wc-3", code: "WC-300", name: "Final Mechanical Integration & Testing", work_center_group: "TESTING", capacity_hours_per_day: 8, efficiency_pct: 90, standard_unit_cost: 55.00, setup_time_min: 15 }
  ],
  ProductionOrder: [
    { id: "po-1", prod_order_no: "PRD-2026-001", bom_no: "BOM-1001", item_name: "Apex Autonomous Delivery Drone v2", status: "released", quantity: 25, completed_qty: 15, location_code: "PROD-PLANT", due_date: "2026-09-18", routing_status: "in_progress", total_planned_cost: 36250.00 },
    { id: "po-2", prod_order_no: "PRD-2026-002", bom_no: "BOM-1002", item_name: "Smart Energy Storage Cabinet 10kWh", status: "firm_planned", quantity: 10, completed_qty: 0, location_code: "PROD-PLANT", due_date: "2026-09-25", routing_status: "scheduled", total_planned_cost: 32000.00 },
    { id: "po-3", prod_order_no: "PRD-2026-003", bom_no: "BOM-1001", item_name: "Apex Autonomous Delivery Drone v2", status: "finished", quantity: 10, completed_qty: 10, location_code: "PROD-PLANT", due_date: "2026-08-30", routing_status: "completed", total_planned_cost: 14500.00 }
  ],
  MRPPlanning: [
    { id: "mrp-1", item_code: "ITEM-7001", item_name: "Industrial Servo Motor 400W", current_inventory: 8, safety_stock: 20, gross_requirement: 100, scheduled_receipts: 20, net_shortfall: 92, action_message: "New Purchase Order", suggested_qty: 100, suggested_date: "2026-09-10", supplier: "Apex Electronics Supplies" },
    { id: "mrp-2", item_code: "ITEM-8002", item_name: "Lithium Polymer Battery Pack 48V", current_inventory: 45, safety_stock: 30, gross_requirement: 130, scheduled_receipts: 50, net_shortfall: 65, action_message: "New Purchase Order", suggested_qty: 80, suggested_date: "2026-09-12", supplier: "Global Powertech Corp" },
    { id: "mrp-3", item_code: "BOM-1001", item_name: "Apex Autonomous Delivery Drone v2", current_inventory: 2, safety_stock: 5, gross_requirement: 25, scheduled_receipts: 15, net_shortfall: 13, action_message: "New Production Order", suggested_qty: 20, suggested_date: "2026-09-15", supplier: "Internal Shopfloor" }
  ],

  // 3-Way Matching
  ThreeWayMatch: [
    { id: "twm-1", po_number: "PO-0001", receipt_number: "WREC-10018", invoice_number: "INV-V-8821", vendor_name: "Precision Metals Ltd", po_amount: 14500.00, receipt_amount: 14500.00, invoice_amount: 14500.00, match_status: "matched", variance: 0, date: "2026-09-02", approved: true },
    { id: "twm-2", po_number: "PO-0002", receipt_number: "WREC-10019", invoice_number: "INV-V-8822", vendor_name: "Apex Electronics Supplies", po_amount: 8200.00, receipt_amount: 8200.00, invoice_amount: 8450.00, match_status: "price_variance", variance: 250.00, date: "2026-09-03", approved: false },
    { id: "twm-3", po_number: "PO-0003", receipt_number: "WREC-10020", invoice_number: "INV-V-8823", vendor_name: "Global Powertech Corp", po_amount: 22000.00, receipt_amount: 19800.00, invoice_amount: 22000.00, match_status: "qty_variance", variance: -2200.00, date: "2026-09-04", approved: false }
  ],

  // Purchase Requisitions
  PurchaseRequisition: [
    { id: "req-1", req_number: "REQ-2026-01", requested_by: "Dr. Sarah Jenkins", department: "ENG", item_name: "High Precision Laser Sensor Units", quantity: 15, estimated_unit_cost: 280.00, total_cost: 4200.00, status: "pending_approval", date: "2026-09-05", justification: "Required for autonomous drone telemetry testing" },
    { id: "req-2", req_number: "REQ-2026-02", requested_by: "Mark Davies", department: "PROD", item_name: "Hydraulic Fluid & Sealant Kits", quantity: 50, estimated_unit_cost: 45.00, total_cost: 2250.00, status: "approved", date: "2026-09-04", justification: "Scheduled preventative machine maintenance" }
  ],

  // Bank Reconciliation
  BankReconciliation: [
    { id: "rec-1", statement_no: "STMT-2026-08", bank_account_code: "BARCLAYS-OPERATING", statement_date: "2026-08-31", statement_balance: 342150.00, book_balance: 342150.00, difference: 0, status: "posted", matched_lines: 48, unmatched_lines: 0 },
    { id: "rec-2", statement_no: "STMT-2026-09A", bank_account_code: "BARCLAYS-OPERATING", statement_date: "2026-09-05", statement_balance: 388920.00, book_balance: 389420.00, difference: -500.00, status: "in_progress", matched_lines: 19, unmatched_lines: 1 }
  ],

  // Sales Shipments
  SalesShipment: [
    { id: "ss-1", shipment_no: "SSHIP-1001", order_number: "SO-0001", customer_name: "Trafalgar Logistics Ltd", location_code: "MAIN", tracking_number: "DHL-992144810GB", carrier: "DHL Express", ship_date: "2026-09-05", status: "in_transit", packages: 2, total_weight_kg: 34.5 },
    { id: "ss-2", shipment_no: "SSHIP-1002", order_number: "SO-0002", customer_name: "Oxford Biomedical Labs", location_code: "MAIN", tracking_number: "FEDEX-881299411", carrier: "FedEx International", ship_date: "2026-09-04", status: "delivered", packages: 1, total_weight_kg: 12.0 }
  ],

  // Customer Price Lists
  CustomerPriceList: [
    { id: "pl-1", code: "RETAIL-STD", name: "Standard Retail Price List", currency: "GBP", valid_from: "2026-01-01", status: "active", tier_rules: 2 },
    { id: "pl-2", code: "WHOLESALE-VIP", name: "Enterprise & Wholesale Tier 1", currency: "GBP", valid_from: "2026-01-01", status: "active", tier_rules: 5 },
    { id: "pl-3", code: "PUBLIC-EDU", name: "Academic & Government Concession", currency: "GBP", valid_from: "2026-01-01", status: "active", tier_rules: 3 }
  ],

  // Service Contracts
  ServiceContract: [
    { id: "sc-1", contract_no: "SCON-2026-001", customer_name: "Trafalgar Logistics Ltd", service_type: "24/7 Platinum Mission-Critical SLA", annual_value: 36000.00, start_date: "2026-01-01", end_date: "2026-12-31", response_time_hours: 2, status: "active" },
    { id: "sc-2", contract_no: "SCON-2026-002", customer_name: "Oxford Biomedical Labs", service_type: "Preventative Maintenance & Calibration", annual_value: 14500.00, start_date: "2026-03-01", end_date: "2027-02-28", response_time_hours: 4, status: "active" }
  ],

  // Approval Workflows
  ApprovalRequest: [
    { id: "apr-1", document_type: "Purchase Order", document_no: "PO-0004", requested_by: "James Stewart", approver: "Chaminuka Mbanje", amount: 18500.00, currency: "GBP", submission_date: "2026-09-05", status: "pending", priority: "high", reason: "Raw materials batch for PRD-2026-001" },
    { id: "apr-2", document_type: "Customer Credit Limit", document_no: "CUST-0002", requested_by: "Elena Vance", approver: "Chaminuka Mbanje", amount: 75000.00, currency: "GBP", submission_date: "2026-09-04", status: "pending", priority: "normal", reason: "Increase credit limit for Trafalgar expansion" },
    { id: "apr-3", document_type: "General Journal Batch", document_no: "GJ-2026-09", requested_by: "Robert Chen", approver: "Financial Controller", amount: 45000.00, currency: "GBP", submission_date: "2026-09-03", status: "approved", priority: "urgent", reason: "Month-end accruals and depreciation" }
  ],

  // Physical Inventory Count
  InventoryCount: [
    { id: "cnt-1", count_order_no: "PIC-2026-Q3", location_code: "MAIN", scheduled_date: "2026-09-30", status: "open", counted_by: "Warehouse Team Alpha", items_to_count: 142, variance_cost: 0 },
    { id: "cnt-2", count_order_no: "PIC-2026-Q2", location_code: "MAIN", scheduled_date: "2026-06-30", status: "posted", counted_by: "Warehouse Team Beta", items_to_count: 138, variance_cost: -340.00 }
  ],

  // Cash Flow Manual Entries
  CashFlowManualEntry: [
    { id: "cfm-1", description: "HMRC Quarterly Corporation Tax Installment", entry_type: "expense", amount: 24000.00, due_date: "2026-09-25", category: "Tax", recurrence: "quarterly" },
    { id: "cfm-2", description: "Facility & Cloud Server Leases", entry_type: "expense", amount: 6500.00, due_date: "2026-09-30", category: "Operational", recurrence: "monthly" },
    { id: "cfm-3", description: "R&D Government Innovation Grant Inflow", entry_type: "revenue", amount: 45000.00, due_date: "2026-10-15", category: "Financing", recurrence: "once" }
  ],

  // VAT Returns
  VATReturn: [
    { id: "vat-2026-q2", period: "2026-Q2", box1: 18400.00, box2: 0, box3: 18400.00, box4: 7200.00, box5: 11200.00, box6: 92000, box7: 36000, box8: 0, box9: 0, status: "submitted", due_date: "2026-08-07" },
    { id: "vat-2026-q3", period: "2026-Q3", box1: 22400.00, box2: 0, box3: 22400.00, box4: 8900.00, box5: 13500.00, box6: 112000, box7: 44500, box8: 0, box9: 0, status: "calculated", due_date: "2026-11-07" }
  ],

  // Intercompany Partners & Transactions
  IntercompanyPartner: [
    { id: "icp-1", code: "CRONUS-US", name: "CRONUS North America Inc", country: "United States", currency: "USD", auto_accept: false, offset_account: "1910 - Due from CRONUS US" },
    { id: "icp-2", code: "CRONUS-EU", name: "CRONUS Europe B.V.", country: "Netherlands", currency: "EUR", auto_accept: true, offset_account: "1920 - Due from CRONUS EU" },
    { id: "icp-3", code: "NEXUS-TECH", name: "Nexus Innovations Ltd", country: "United Kingdom", currency: "GBP", auto_accept: true, offset_account: "1930 - Due from Nexus Tech" }
  ],
  IntercompanyInbox: [
    { id: "icin-1", transaction_no: "IC-IN-90021", from_partner_name: "CRONUS North America Inc", partner_code: "CRONUS-US", document_type: "Management Charge", description: "Shared Cloud Engineering & SOC-2 Infrastructure allocation", amount: 18500.00, currency: "GBP", status: "pending", posting_date: "2026-09-04" },
    { id: "icin-2", transaction_no: "IC-IN-90022", from_partner_name: "CRONUS Europe B.V.", partner_code: "CRONUS-EU", document_type: "Distribution Fee", description: "EU Warehousing and Logistics handling", amount: 7400.00, currency: "GBP", status: "accepted", posting_date: "2026-09-02" }
  ],
  IntercompanyOutbox: [
    { id: "icout-1", transaction_no: "IC-OUT-80011", partner_code: "CRONUS-US", document_type: "IP License", description: "Nexus Platform Enterprise Software Royalty", amount: 25000.00, currency: "GBP", status: "pending_dispatch", posting_date: "2026-09-05" }
  ],

  // Assembly Orders
  AssemblyOrder: [
    { id: "asy-1", order_no: "ASY-1001", item_code: "KIT-CAD-WORKSTATION", item_name: "High-Performance CAD Workstation Bundle", quantity_to_assemble: 10, assembled_quantity: 0, location_code: "MAIN", due_date: "2026-09-15", assembly_policy: "Assemble-to-Stock (ATS)", status: "open", total_cost: 14500.00, lines_count: 4 },
    { id: "asy-2", order_no: "ASY-1002", item_code: "KIT-IOT-ROBOTICS", item_name: "Autonomous Robotics Sensor Kit", quantity_to_assemble: 25, assembled_quantity: 25, location_code: "MAIN", due_date: "2026-09-02", assembly_policy: "Assemble-to-Order (ATO)", status: "posted", total_cost: 8750.00, lines_count: 3 }
  ],

  // IT Security, Users & Permissions
  SystemUser: [
    {
      id: "usr-bc-admin",
      username: "bc-server\\administrator",
      full_name: "BC-SERVER Enterprise Administrator",
      email: "administrator@npcsolutions.co.uk",
      role_ids: ["SUPER"],
      status: "active",
      license_type: "Full User (Unrestricted Enterprise)",
      company_scope: "ALL",
      mfa_enabled: true,
      last_login: "2026-09-06 14:10",
      created_at: "2026-01-01"
    },
    {
      id: "usr-1",
      username: "mbanjec",
      full_name: "Chaminuka Mbanje",
      email: "mbanjec@gmail.com",
      role_ids: ["SUPER"],
      status: "active",
      license_type: "Internal Administrator",
      company_scope: "ALL",
      mfa_enabled: true,
      last_login: "2026-09-05 21:40",
      created_at: "2026-01-01"
    },
    {
      id: "usr-2",
      username: "sarah.jenkins",
      full_name: "Sarah Jenkins",
      email: "s.jenkins@cronus.co.uk",
      role_ids: ["FINANCE-MGR"],
      status: "active",
      license_type: "Full User",
      company_scope: "CRONUS UK Ltd",
      mfa_enabled: true,
      last_login: "2026-09-05 18:22",
      created_at: "2026-01-15"
    },
    {
      id: "usr-3",
      username: "alex.mercer",
      full_name: "Alex Mercer",
      email: "a.mercer@cronus.co.uk",
      role_ids: ["SALES-REP"],
      status: "active",
      license_type: "Full User",
      company_scope: "CRONUS UK Ltd",
      mfa_enabled: false,
      last_login: "2026-09-05 16:05",
      created_at: "2026-02-01"
    },
    {
      id: "usr-4",
      username: "david.okonkwo",
      full_name: "David Okonkwo",
      email: "d.okonkwo@cronus.co.uk",
      role_ids: ["PURCHASE-MGR"],
      status: "active",
      license_type: "Full User",
      company_scope: "CRONUS UK Ltd",
      mfa_enabled: true,
      last_login: "2026-09-05 14:15",
      created_at: "2026-02-10"
    },
    {
      id: "usr-5",
      username: "elena.rostova",
      full_name: "Elena Rostova",
      email: "e.rostova@cronus.co.uk",
      role_ids: ["WMS-MGR", "MFG-PLANNER"],
      status: "active",
      license_type: "Full User",
      company_scope: "CRONUS UK Ltd",
      mfa_enabled: true,
      last_login: "2026-09-05 19:10",
      created_at: "2026-03-01"
    },
    {
      id: "usr-6",
      username: "prof.strang",
      full_name: "Prof. Gilbert Strang",
      email: "strang@mit.edu",
      role_ids: ["UNIV-DEAN"],
      status: "active",
      license_type: "Full User",
      company_scope: "ALL",
      mfa_enabled: true,
      last_login: "2026-09-05 20:30",
      created_at: "2026-01-01"
    },
    {
      id: "usr-7",
      username: "pwc.auditor",
      full_name: "PwC External Audit Team",
      email: "audit.team@uk.pwc.com",
      role_ids: ["AUDITOR"],
      status: "locked",
      license_type: "External Auditor",
      company_scope: "CRONUS UK Ltd",
      mfa_enabled: true,
      last_login: "2026-08-31 11:00",
      created_at: "2026-06-01"
    }
  ],

  SystemRole: [
    {
      id: "SUPER",
      name: "System Administrator (SUPER)",
      description: "Unrestricted enterprise access across all legal entities, system setup, security, G/L, and operations",
      is_system: true,
      color: "red"
    },
    {
      id: "FINANCE-MGR",
      name: "Financial Controller / CFO",
      description: "Full management of General Ledger, Bank Accounts, VAT Returns, Cash Flow, Budgets, and Posting",
      is_system: true,
      color: "emerald"
    },
    {
      id: "SALES-REP",
      name: "Sales & CRM Specialist",
      description: "Manage customers, sales quotes, sales orders, shipments, invoices, and customer price lists",
      is_system: true,
      color: "blue"
    },
    {
      id: "PURCHASE-MGR",
      name: "Procurement & Payables Manager",
      description: "Manage vendors, purchase requisitions, purchase orders, 3-way matching, and purchase bills",
      is_system: true,
      color: "amber"
    },
    {
      id: "WMS-MGR",
      name: "Warehouse & Logistics Manager",
      description: "Item catalog, inventory tracking, warehouse bins, receipts, picks, physical counts, and assembly",
      is_system: true,
      color: "indigo"
    },
    {
      id: "MFG-PLANNER",
      name: "Manufacturing Planner",
      description: "Production orders, bill of materials (BOMs), work centers, routings, and MRP planning worksheets",
      is_system: true,
      color: "purple"
    },
    {
      id: "UNIV-DEAN",
      name: "University Dean & Academic Registrar",
      description: "Full management of MIT Student Lifecycle, Admissions, Course Majors, Gradebook, and CAP reviews",
      is_system: true,
      color: "rose"
    },
    {
      id: "AUDITOR",
      name: "Compliance & Read-Only Auditor",
      description: "Read-only access across all financial ledgers, transactional journals, and audit documentation",
      is_system: true,
      color: "slate"
    }
  ],

  RolePermission: [
    { id: "p-super-all", role_id: "SUPER", module_key: "all", can_read: true, can_insert: true, can_modify: true, can_delete: true, can_execute: true },
    { id: "p-fin-coa", role_id: "FINANCE-MGR", module_key: "chart_of_accounts", can_read: true, can_insert: true, can_modify: true, can_delete: false, can_execute: true },
    { id: "p-fin-gj", role_id: "FINANCE-MGR", module_key: "journal_entries", can_read: true, can_insert: true, can_modify: true, can_delete: true, can_execute: true },
    { id: "p-fin-vat", role_id: "FINANCE-MGR", module_key: "vat_returns", can_read: true, can_insert: true, can_modify: true, can_delete: false, can_execute: true },
    { id: "p-sales-cust", role_id: "SALES-REP", module_key: "customers_sales", can_read: true, can_insert: true, can_modify: true, can_delete: false, can_execute: true },
    { id: "p-purch-vend", role_id: "PURCHASE-MGR", module_key: "vendors_purchases", can_read: true, can_insert: true, can_modify: true, can_delete: false, can_execute: true },
    { id: "p-wms-items", role_id: "WMS-MGR", module_key: "items_warehousing", can_read: true, can_insert: true, can_modify: true, can_delete: true, can_execute: true }
  ],

  SecurityAuditLog: [
    { id: "sal-0", timestamp: "2026-09-06T14:10:00Z", actor: "bc-server\\administrator", event_type: "UNRESTRICTED_LIMITS_APPLIED", target: "BC-SERVER :: BC250 Instance", details: "Removed database size limits (UNLIMITED), max upload size (2047MB), max OData body (2047MB), codeunit execution tracing enabled, UI license element hiding disabled (None), and full cross-legal-entity SUPER scope assigned.", ip_address: "192.168.0.39" },
    { id: "sal-1", timestamp: "2026-09-05T21:40:00Z", actor: "Chaminuka Mbanje", event_type: "ADMIN_LOGIN", target: "mbanjec", details: "MFA challenge verified successfully via Microsoft Authenticator", ip_address: "192.168.0.218" },
    { id: "sal-2", timestamp: "2026-09-05T20:15:00Z", actor: "IT Administrator", event_type: "ROLE_ASSIGNED", target: "sarah.jenkins", details: "Assigned role 'FINANCE-MGR' with company scope 'CRONUS UK Ltd'", ip_address: "192.168.0.218" },
    { id: "sal-3", timestamp: "2026-09-05T19:00:00Z", actor: "IT Administrator", event_type: "USER_LOCKED", target: "pwc.auditor", details: "Account locked pending annual engagement renewal", ip_address: "192.168.0.218" },
    { id: "sal-4", timestamp: "2026-09-05T17:30:00Z", actor: "IT Administrator", event_type: "PERMISSION_MODIFIED", target: "SALES-REP :: sales_invoices", details: "Revoked DELETE permission for Sales Representative group", ip_address: "192.168.0.218" }
  ]
};

// Generic Client Store
export class EnterpriseDataStore {
  constructor(entityName) {
    this.entityName = entityName;
  }

  getStorageKey() {
    const company = getActiveCompany();
    return `${STORAGE_PREFIX}${company.id}_${this.entityName}`;
  }

  getAll() {
    if (typeof window === "undefined") return INITIAL_DATA[this.entityName] || [];
    const key = this.getStorageKey();
    const stored = localStorage.getItem(key);
    if (!stored) {
      const seed = INITIAL_DATA[this.entityName] || [];
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    try {
      const parsed = JSON.parse(stored);
      // If partition exists but is empty, and authentic initial seed data exists, populate it!
      if (Array.isArray(parsed) && parsed.length === 0 && (INITIAL_DATA[this.entityName] || []).length > 0) {
        const seed = INITIAL_DATA[this.entityName];
        localStorage.setItem(key, JSON.stringify(seed));
        return seed;
      }
      return parsed;
    } catch {
      return INITIAL_DATA[this.entityName] || [];
    }
  }

  saveAll(records) {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(records));
      window.dispatchEvent(new CustomEvent(`datastore_${this.entityName}_updated`, { detail: records }));
    }
  }

  async list(sortField, limit) {
    let items = this.getAll();
    if (sortField) {
      const desc = sortField.startsWith("-");
      const field = desc ? sortField.slice(1) : sortField;
      items.sort((a, b) => {
        const valA = a[field] ?? "";
        const valB = b[field] ?? "";
        if (valA < valB) return desc ? 1 : -1;
        if (valA > valB) return desc ? -1 : 1;
        return 0;
      });
    }
    if (limit && limit > 0) {
      items = items.slice(0, limit);
    }
    return items;
  }

  async filter(filterObj) {
    const items = this.getAll();
    return items.filter(item => {
      for (const [k, v] of Object.entries(filterObj)) {
        if (item[k] !== v) return false;
      }
      return true;
    });
  }

  async get(id) {
    const items = this.getAll();
    const found = items.find(i => i.id === id);
    if (!found) throw new Error(`${this.entityName} with id ${id} not found`);
    return found;
  }

  async create(data) {
    const items = this.getAll();
    const newRecord = {
      ...data,
      id: data.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };
    items.unshift(newRecord);
    this.saveAll(items);
    return newRecord;
  }

  async bulkCreate(records) {
    const items = this.getAll();
    const list = Array.isArray(records) ? records : [records];
    const newItems = list.map((data, idx) => ({
      ...data,
      id: data.id || `rec_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      created_date: data.created_date || new Date().toISOString(),
      updated_date: new Date().toISOString()
    }));
    const combined = [...newItems, ...items];
    this.saveAll(combined);
    return newItems;
  }

  async update(id, data) {
    const items = this.getAll();
    const index = items.findIndex(i => i.id === id);
    if (index === -1) throw new Error(`${this.entityName} with id ${id} not found`);
    items[index] = {
      ...items[index],
      ...data,
      updated_date: new Date().toISOString()
    };
    this.saveAll(items);
    return items[index];
  }

  async delete(id) {
    const items = this.getAll();
    const filtered = items.filter(i => i.id !== id);
    this.saveAll(filtered);
    return { success: true };
  }
}
