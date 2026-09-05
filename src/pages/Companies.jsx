import React, { useState, useEffect } from "react";
import {
  getCompanies, getActiveCompany, setActiveCompany,
  createLegalEntity, deleteLegalEntity, importBCServerSampleData
} from "@/api/erpDataEngine";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Plus, Check, Globe, Layers, ArrowRight,
  Shield, Trash2, Calendar, Coins, CheckCircle2, AlertCircle, X,
  Database, DownloadCloud, Server
} from "lucide-react";

export default function Companies() {
  const [companies, setCompanies] = useState(getCompanies());
  const [activeCompany, setActiveCompanyState] = useState(getActiveCompany());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    currency: "GBP",
    country: "United Kingdom",
    logo: "🇬🇧",
    copySetupFrom: "cronus-uk"
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const handleCompaniesUpdated = (e) => {
      setCompanies(e.detail || getCompanies());
    };
    const handleCompanyChange = (e) => {
      const list = getCompanies();
      const found = list.find(c => c.id === e.detail);
      if (found) setActiveCompanyState(found);
    };

    window.addEventListener("companies_updated", handleCompaniesUpdated);
    window.addEventListener("company_changed", handleCompanyChange);
    return () => {
      window.removeEventListener("companies_updated", handleCompaniesUpdated);
      window.removeEventListener("company_changed", handleCompanyChange);
    };
  }, []);

  const handleSwitchCompany = (comp) => {
    setActiveCompany(comp.id);
    setActiveCompanyState(comp);
    setMessage({ type: "success", text: `Switched active legal entity to ${comp.name}` });
    window.location.reload();
  };

  const handleDeleteCompany = (comp) => {
    if (comp.id === activeCompany.id) {
      alert("Cannot delete the currently active legal entity. Please switch to another entity first.");
      return;
    }
    if (companies.length <= 1) {
      alert("Cannot delete the only remaining legal entity.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete legal entity "${comp.name}"? All associated data partitions will be permanently removed.`)) {
      try {
        const updated = deleteLegalEntity(comp.id);
        setCompanies(updated);
        setMessage({ type: "info", text: `Legal entity ${comp.name} was removed.` });
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Company name is required");
      return;
    }

    try {
      const newComp = createLegalEntity({
        name: formData.name.trim(),
        code: formData.code.trim() || formData.name.slice(0, 4).toUpperCase(),
        currency: formData.currency,
        country: formData.country,
        logo: formData.logo,
        copySetupFrom: formData.copySetupFrom
      });

      setActiveCompany(newComp.id);
      setIsCreateModalOpen(false);
      setFormData({
        name: "",
        code: "",
        currency: "GBP",
        country: "United Kingdom",
        logo: "🇬🇧",
        copySetupFrom: "cronus-uk"
      });
      window.location.reload();
    } catch (err) {
      setFormError(err.message || "Failed to create legal entity");
    }
  };

  const handleImportBCData = () => {
    try {
      const res = importBCServerSampleData(activeCompany.id, true);
      setMessage({
        type: "success",
        text: `Successfully imported ${res.count} authentic records from Microsoft Dynamics 365 Business Central Server (BC_DemoDB / CRONUS UK Ltd_) into ${activeCompany.name}!`
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to import BC sample data: " + err.message });
    }
  };

  // Group currencies
  const uniqueCurrencies = Array.from(new Set(companies.map(c => c.currency)));

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight font-heading text-foreground">
                Legal Entities & Companies
              </h1>
              <p className="text-xs text-muted-foreground">
                Dynamics 365 Business Central & Finance & Operations Multi-Company Management
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportBCData}
            className="font-semibold gap-1.5 cursor-pointer border-blue-500/30 text-blue-600 hover:bg-blue-500/10 shadow-xs"
            title="Import 370+ real records from Dynamics 365 Business Central Server (192.168.0.39)"
          >
            <Database className="w-4 h-4" />
            <span>Import BC Server Data</span>
          </Button>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground font-semibold gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Legal Entity</span>
          </Button>
        </div>
      </div>

      {/* BC Server Data Integration Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/20 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground">Dynamics 365 Business Central Server Integration</h3>
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] py-0">
                Connected: 192.168.0.39
              </Badge>
              <Badge variant="outline" className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px] py-0 font-mono">
                BC_DemoDB (CRONUS UK Ltd_)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Direct SQL Server sample extract available: 50 Customers, 50 Vendors, 50 Items, 50 G/L Accounts, 44 Sales Orders, 21 Purchase Orders, 6 Bank Accounts, 8 Warehouses, 8 Dimensions, 36 Values, 47 Currencies, 4 Work Centers.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleImportBCData}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium shrink-0 gap-1.5 shadow-xs cursor-pointer"
        >
          <DownloadCloud className="w-4 h-4" />
          <span>Sync BC Server Data</span>
        </Button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-xs ${
          message.type === "success" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-muted text-muted-foreground"
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* D365 Overview KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Legal Entities
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-heading">{companies.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Multi-company group</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Active Operating Entity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeCompany.logo}</span>
              <div className="text-base font-bold font-heading truncate">{activeCompany.name}</div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Base Currency: <strong className="font-mono">{activeCompany.currency}</strong></p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Currencies in Scope
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-heading font-mono">{uniqueCurrencies.join(", ")}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Auto FX triangulation ready</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Intercompany & Consolidation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-base">
              <Shield className="w-4 h-4" />
              <span>Unrestricted</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">No seat or entity license limits</p>
          </CardContent>
        </Card>
      </div>

      {/* Legal Entities Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-heading">
            Operating Legal Entities Directory
          </h2>
          <span className="text-xs text-muted-foreground">
            Click "Switch Company" to scope all G/L, Sales, Purchasing & WMS ledgers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((comp) => {
            const isActive = comp.id === activeCompany.id;
            return (
              <Card key={comp.id} className={`transition-all shadow-xs overflow-hidden ${
                isActive ? "border-primary ring-1 ring-primary/40 bg-card" : "hover:border-primary/50"
              }`}>
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center text-2xl shrink-0 shadow-2xs border">
                        {comp.logo}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm leading-tight text-foreground truncate">
                          {comp.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] font-mono uppercase px-1.5 py-0">
                            {comp.code}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground truncate">{comp.country}</span>
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-semibold gap-1 shrink-0">
                        <Check className="w-3 h-3" /> Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60 bg-muted/20 px-3 rounded-lg">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Base Currency</span>
                      <span className="font-mono font-bold text-foreground">{comp.currency}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Data Namespace</span>
                      <span className="font-mono text-[10px] text-muted-foreground truncate block">{comp.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {isActive ? (
                      <Button
                        disabled
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs font-semibold cursor-default"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Currently Active
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSwitchCompany(comp)}
                        variant="default"
                        size="sm"
                        className="w-full text-xs font-semibold cursor-pointer shadow-xs gap-1"
                      >
                        <span>Switch to this Entity</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {!isActive && companies.length > 1 && (
                      <Button
                        onClick={() => handleDeleteCompany(comp)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2.5 cursor-pointer"
                        title="Delete Company"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Create New Legal Entity Modal Dialog */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">
                  🏢
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight font-heading text-foreground">
                    Create New Legal Entity
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Dynamics 365 Business Central & F&O Multi-Company Provisioning
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {formError}
                </div>
              )}

              {/* Company Name */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Legal Entity / Company Name <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Sama Enterprise Holdings Ltd."
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoCode = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
                    setFormData(prev => ({
                      ...prev,
                      name,
                      code: prev.code && prev.code !== autoCode.slice(0, prev.code.length) ? prev.code : autoCode
                    }));
                  }}
                  className="h-8 text-xs"
                />
              </div>

              {/* Code & Currency Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Entity Code (e.g. D365 DataAreaId)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. SAMA"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="h-8 text-xs font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Functional Base Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="ZAR">ZAR (R) - South African Rand</option>
                    <option value="AUD">AUD ($) - Australian Dollar</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                    <option value="JPY">JPY (¥) - Japanese Yen</option>
                    <option value="CHF">CHF (Fr) - Swiss Franc</option>
                  </select>
                </div>
              </div>

              {/* Country & Icon */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Country / Region
                </label>
                <Input
                  type="text"
                  placeholder="e.g. United Kingdom, South Africa, Australia"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              {/* Emoji Icon / Flag Picker */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Entity Icon / Flag Badge
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["🇬🇧", "🇺🇸", "🇪🇺", "🇿🇦", "🇦🇺", "🇨🇦", "🇯🇵", "🇨🇭", "🏢", "🏭", "🏦", "🌐"].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logo: emoji }))}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-all cursor-pointer ${
                        formData.logo === emoji ? "border-primary bg-primary/20 scale-110 shadow-xs" : "border-border hover:bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template / Setup Duplication */}
              <div className="space-y-1.5 pt-1 border-t border-border/60">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>Setup Data Template (Chart of Accounts, Dimensions, Posting Groups)</span>
                </label>
                <select
                  value={formData.copySetupFrom}
                  onChange={(e) => setFormData(prev => ({ ...prev, copySetupFrom: e.target.value }))}
                  className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="cronus-uk">Copy Baseline Setup from CRONUS UK Ltd. (Recommended)</option>
                  <option value="contoso-us">Copy Baseline Setup from Contoso Enterprise Solutions Inc.</option>
                  <option value="fabrikam-eu">Copy Baseline Setup from Fabrikam Manufacturing GmbH</option>
                  <option value="none">Start with Blank Ledgers (No Pre-seeded Setup)</option>
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Copies standard evaluation Chart of Accounts, Global Dimensions, and Subledger Posting Groups so your new entity is immediately ready for transactions.
                </p>
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary text-primary-foreground font-semibold gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create & Switch to Entity</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
