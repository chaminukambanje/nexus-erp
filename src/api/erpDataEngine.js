// Universal Enterprise Data Engine for NexusERP (Dynamics 365 Business Central & F&O Equivalent)
// Provides complete offline-capable, unrestricted persistence with full seed data matching CRONUS International Ltd.

const STORAGE_PREFIX = "nexuserp_data_";
const ACTIVE_COMPANY_KEY = "nexuserp_active_company";

export const COMPANIES = [
  { id: "cronus-uk", name: "CRONUS UK Ltd.", code: "GB", currency: "GBP", country: "United Kingdom", logo: "🇬🇧" },
  { id: "contoso-us", name: "Contoso Enterprise Solutions Inc.", code: "US", currency: "USD", country: "United States", logo: "🇺🇸" },
  { id: "fabrikam-eu", name: "Fabrikam Manufacturing GmbH", code: "DE", currency: "EUR", country: "Germany", logo: "🇩🇪" }
];

export function getActiveCompany() {
  if (typeof window === "undefined") return COMPANIES[0];
  const saved = localStorage.getItem(ACTIVE_COMPANY_KEY);
  return COMPANIES.find(c => c.id === saved) || COMPANIES[0];
}

export function setActiveCompany(companyId) {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
    window.dispatchEvent(new CustomEvent("company_changed", { detail: companyId }));
  }
}

// Initial seed data matching Dynamics 365 Business Central standards
const INITIAL_DATA = {
  // Dimensions
  Dimension: [
    { id: "dim-1", code: "DEPARTMENT", name: "Department", description: "Global Dimension 1 - Organizational Unit", is_global: true, global_num: 1, values_count: 5, mandatory: true },
    { id: "dim-2", code: "CUSTOMERGROUP", name: "Customer Group", description: "Global Dimension 2 - Market Segment", is_global: true, global_num: 2, values_count: 4, mandatory: false },
    { id: "dim-3", code: "PROJECT", name: "Project / Job", description: "Shortcut Dimension 3 - Job Code", is_global: false, global_num: 3, values_count: 6, mandatory: false },
    { id: "dim-4", code: "AREA", name: "Geographic Area", description: "Shortcut Dimension 4 - Sales Territory", is_global: false, global_num: 4, values_count: 4, mandatory: false },
    { id: "dim-5", code: "COSTCENTER", name: "Cost Center", description: "Shortcut Dimension 5 - Cost Accounting", is_global: false, global_num: 5, values_count: 5, mandatory: false }
  ],
  DimensionValue: [
    { id: "dv-1", dimension_code: "DEPARTMENT", code: "SALES", name: "Sales & Marketing", total_budget: 150000, active: true },
    { id: "dv-2", dimension_code: "DEPARTMENT", code: "PROD", name: "Production & Operations", total_budget: 450000, active: true },
    { id: "dv-3", dimension_code: "DEPARTMENT", code: "ADMIN", name: "Administration & Finance", total_budget: 120000, active: true },
    { id: "dv-4", dimension_code: "DEPARTMENT", code: "ENG", name: "R&D / Engineering", total_budget: 280000, active: true },
    { id: "dv-5", dimension_code: "DEPARTMENT", code: "LOG", name: "Warehouse & Logistics", total_budget: 95000, active: true },
    { id: "dv-6", dimension_code: "CUSTOMERGROUP", code: "ENTERPRISE", name: "Enterprise Accounts", total_budget: 0, active: true },
    { id: "dv-7", dimension_code: "CUSTOMERGROUP", code: "SMB", name: "Small & Medium Business", total_budget: 0, active: true },
    { id: "dv-8", dimension_code: "CUSTOMERGROUP", code: "PUBLIC", name: "Government & Education", total_budget: 0, active: true },
    { id: "dv-9", dimension_code: "CUSTOMERGROUP", code: "RETAIL", name: "Direct Consumer / Retail", total_budget: 0, active: true },
    { id: "dv-10", dimension_code: "AREA", code: "NORTH", name: "Northern Territory", total_budget: 0, active: true },
    { id: "dv-11", dimension_code: "AREA", code: "SOUTH", name: "Southern Territory", total_budget: 0, active: true },
    { id: "dv-12", dimension_code: "AREA", code: "INTL", name: "International Markets", total_budget: 0, active: true }
  ],

  // Currencies
  Currency: [
    { id: "curr-1", code: "GBP", name: "British Pound Sterling", symbol: "£", exchange_rate: 1.0, is_base: true, last_adjusted: "2026-09-01" },
    { id: "curr-2", code: "USD", name: "US Dollar", symbol: "$", exchange_rate: 1.285, is_base: false, last_adjusted: "2026-09-05" },
    { id: "curr-3", code: "EUR", name: "Euro", symbol: "€", exchange_rate: 1.172, is_base: false, last_adjusted: "2026-09-05" },
    { id: "curr-4", code: "JPY", name: "Japanese Yen", symbol: "¥", exchange_rate: 189.4, is_base: false, last_adjusted: "2026-09-04" },
    { id: "curr-5", code: "CHF", name: "Swiss Franc", symbol: "CHF", exchange_rate: 1.121, is_base: false, last_adjusted: "2026-09-03" }
  ],

  // Warehouses & Locations
  WarehouseLocation: [
    { id: "loc-1", code: "MAIN", name: "Main Distribution Center", address: "100 Logistics Way, Birmingham", bins_active: true, total_bins: 18, is_default: true, phone: "+44 121 555 0100" },
    { id: "loc-2", code: "WEST", name: "Bristol Regional Depot", address: "45 Avonmouth Docks, Bristol", bins_active: true, total_bins: 8, is_default: false, phone: "+44 117 555 0142" },
    { id: "loc-3", code: "PROD-PLANT", name: "Coventry Manufacturing Plant", address: "12 Industrial Park, Coventry", bins_active: true, total_bins: 12, is_default: false, phone: "+44 24 7655 0199" },
    { id: "loc-4", code: "TRANSIT", name: "Inter-company In-Transit", address: "Virtual Logistics Corridor", bins_active: false, total_bins: 0, is_default: false, phone: "N/A" }
  ],
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
      return JSON.parse(stored);
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
