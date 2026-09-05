import React, { useState, useEffect } from "react";
import { Outlet, Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import CopilotAssistant from "@/components/copilot/CopilotAssistant";
import { COMPANIES, getActiveCompany, setActiveCompany } from "@/api/erpDataEngine";
import { Badge } from "@/components/ui/badge";
import { Building2, Sparkles, Check, ChevronDown, Shield } from "lucide-react";

export default function AppLayout() {
  const [activeCompany, setCompanyState] = useState(getActiveCompany());
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      const found = COMPANIES.find(c => c.id === e.detail);
      if (found) setCompanyState(found);
    };
    window.addEventListener("company_changed", handler);
    return () => window.removeEventListener("company_changed", handler);
  }, []);

  const handleSelectCompany = (comp) => {
    setActiveCompany(comp.id);
    setCompanyState(comp);
    setIsCompanyDropdownOpen(false);
    window.location.reload(); // Refresh to re-scope entity stores
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background/80 hover:bg-background text-xs font-semibold shadow-xs transition-colors"
              >
                <span className="text-base">{activeCompany.logo}</span>
                <span className="font-bold text-foreground">{activeCompany.name}</span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">{activeCompany.currency}</Badge>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              </button>

              {isCompanyDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-72 rounded-xl border bg-popover shadow-xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase">
                    Select Legal Entity (F&O / BC)
                  </div>
                  {COMPANIES.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => handleSelectCompany(comp)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                        activeCompany.id === comp.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{comp.logo}</span>
                        <div>
                          <div>{comp.name}</div>
                          <div className="text-[10px] text-muted-foreground">{comp.country} • Currency: {comp.currency}</div>
                        </div>
                      </div>
                      {activeCompany.id === comp.id && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
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
    </div>
  );
}
