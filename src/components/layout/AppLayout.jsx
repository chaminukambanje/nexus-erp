import React, { useState, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import CopilotAssistant from "@/components/copilot/CopilotAssistant";
import {
  COMPANIES, getActiveCompany, setActiveCompany,
  getCompanies, createLegalEntity
} from "@/api/erpDataEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, Sparkles, Check, ChevronDown, Shield,
  Plus, X, Globe, Layers, ArrowRight
} from "lucide-react";

export default function AppLayout() {
  const [activeCompany, setCompanyState] = useState(getActiveCompany());
  const [companiesList, setCompaniesList] = useState(getCompanies());
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state for creating legal entity
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    currency: "GBP",
    country: "United Kingdom",
    logo: "🇬🇧",
    copySetupFrom: "cronus-uk"
  });
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const handleCompanyChange = (e) => {
      const companies = getCompanies();
      const found = companies.find(c => c.id === e.detail);
      if (found) setCompanyState(found);
    };

    const handleCompaniesUpdated = (e) => {
      setCompaniesList(e.detail || getCompanies());
    };

    window.addEventListener("company_changed", handleCompanyChange);
    window.addEventListener("companies_updated", handleCompaniesUpdated);
    return () => {
      window.removeEventListener("company_changed", handleCompanyChange);
      window.removeEventListener("companies_updated", handleCompaniesUpdated);
    };
  }, []);

  const handleSelectCompany = (comp) => {
    setActiveCompany(comp.id);
    setCompanyState(comp);
    setIsCompanyDropdownOpen(false);
    window.location.reload(); // Refresh to re-scope entity stores
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setCreateError("");

    if (!formData.name.trim()) {
      setCreateError("Company name is required");
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

      // Switch to newly created legal entity
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
      setCreateError(err.message || "Failed to create legal entity");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top D365 Universal Bar */}
        <header className="h-13 border-b bg-card/50 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Legal Entity / Company Selector */}
            <div className="relative">
              <button
                onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background/80 hover:bg-background text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span className="text-base">{activeCompany.logo}</span>
                <span className="font-bold text-foreground">{activeCompany.name}</span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">{activeCompany.currency}</Badge>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              </button>

              {isCompanyDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-80 rounded-xl border bg-popover shadow-xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-border/60 mb-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Legal Entities ({companiesList.length})
                    </span>
                    <span className="text-[10px] text-primary font-mono font-medium">D365 Multi-Company</span>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {companiesList.map((comp) => (
                      <button
                        key={comp.id}
                        onClick={() => handleSelectCompany(comp)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                          activeCompany.id === comp.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg shrink-0">{comp.logo}</span>
                          <div className="truncate">
                            <div className="truncate text-xs font-semibold">{comp.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {comp.country} • Currency: <span className="font-mono font-bold">{comp.currency}</span>
                            </div>
                          </div>
                        </div>
                        {activeCompany.id === comp.id && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                      </button>
                    ))}
                  </div>

                  {/* Actions Footer inside dropdown */}
                  <div className="mt-1.5 pt-1.5 border-t border-border/60 space-y-1">
                    <button
                      onClick={() => {
                        setIsCompanyDropdownOpen(false);
                        setIsCreateModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Legal Entity</span>
                    </button>

                    <Link
                      to="/companies"
                      onClick={() => setIsCompanyDropdownOpen(false)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
                    >
                      <span>Manage all legal entities</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Badge variant="secondary" className="hidden sm:inline-flex gap-1 text-[11px] items-center bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <Shield className="w-3 h-3" /> Unrestricted Enterprise Edition (No Seat Limits)
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/role-center"
              className="text-xs font-medium px-2.5 py-1 rounded-md border hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Role Center</span>
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                CM
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold leading-tight">Chaminuka Mbanje</div>
                <div className="text-[10px] text-muted-foreground">System Administrator</div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content View */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Embedded D365 Copilot AI Assistant */}
      <CopilotAssistant />

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
              {createError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {createError}
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

