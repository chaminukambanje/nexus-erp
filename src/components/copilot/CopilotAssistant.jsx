import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Send, Bot, User, ArrowRight, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CopilotAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    {
      sender: "copilot",
      text: "Hello! I am your Dynamics 365 Copilot assistant. I can help you analyze financial performance, check warehouse inventory, run MRP planning, or review pending approvals.",
      suggestions: [
        "What is our cash balance?",
        "Check MRP raw material shortages",
        "Show overdue sales invoices",
        "Review pending approvals"
      ]
    }
  ]);

  const handleSend = (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = { sender: "user", text: query };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    // Dynamic AI response logic based on ERP data
    setTimeout(() => {
      let response = {
        sender: "copilot",
        text: "",
        actionLabel: "",
        actionRoute: ""
      };

      const lower = query.toLowerCase();
      if (lower.includes("cash") || lower.includes("bank")) {
        response.text = "Your total available cash across all 3 bank accounts is £388,920.00 ($499,762 USD). Barclays Main Operating has £342,150.00 and no unresolved variance.";
        response.actionLabel = "Open Bank Accounts";
        response.actionRoute = "/bank-accounts";
      } else if (lower.includes("mrp") || lower.includes("shortage") || lower.includes("supply")) {
        response.text = "MRP analysis indicates critical shortages for 3 items: Industrial Servo Motor 400W (-92 units) and Lithium Polymer Battery Pack (-65 units). 2 suggested Purchase Orders are ready.";
        response.actionLabel = "Open MRP Planning Worksheet";
        response.actionRoute = "/mrp-planning";
      } else if (lower.includes("invoice") || lower.includes("overdue") || lower.includes("receivable")) {
        response.text = "You have 2 overdue invoices totaling $18,400.00. Trafalgar Logistics has an overdue balance of $12,800.00 (14 days past Net 30).";
        response.actionLabel = "View Sales Invoices";
        response.actionRoute = "/sales-invoices";
      } else if (lower.includes("approval") || lower.includes("pending")) {
        response.text = "There are 2 pending approval requests waiting for your authorization: PO-0004 for Industrial Metals (£18,500) and Customer Credit Limit for Trafalgar (£75,000).";
        response.actionLabel = "Open Approval Workflows";
        response.actionRoute = "/approvals";
      } else if (lower.includes("production") || lower.includes("bom") || lower.includes("manufacturing")) {
        response.text = "Production order PRD-2026-001 (Autonomous Drone v2) is released and 60% complete (15 of 25 units assembled). Work Center WC-100 is operating at 92% efficiency.";
        response.actionLabel = "Open Production Orders";
        response.actionRoute = "/production-orders";
      } else {
        response.text = `I have analyzed your query across your Chart of Accounts, Items, Sales, and Production datasets. All records are currently synchronized with your active legal entity (CRONUS UK Ltd).`;
        response.actionLabel = "View Role Center";
        response.actionRoute = "/role-center";
      }

      setMessages(prev => [...prev, response]);
    }, 600);
  };

  return (
    <>
      {/* Floating Copilot Launcher */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-linear-to-r from-primary via-indigo-600 to-primary text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        >
          <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
          <span className="font-semibold text-sm">Copilot Assistant</span>
          <Badge variant="secondary" className="bg-white/20 text-white text-[10px] px-1.5 py-0 border-0">D365</Badge>
        </button>
      )}

      {/* Slide-over Copilot Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-4rem)] flex flex-col shadow-2xl rounded-xl border bg-background overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          <div className="p-4 border-b bg-linear-to-r from-primary/10 via-indigo-500/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  Dynamics 365 Copilot
                  <Badge variant="outline" className="text-[10px] font-mono">AI Active</Badge>
                </h3>
                <p className="text-[11px] text-muted-foreground">Natural Language Enterprise Intelligence</p>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                {m.sender === "copilot" && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-lg p-3 ${m.sender === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted/70 text-foreground border"}`}>
                  <p className="leading-relaxed">{m.text}</p>
                  {m.actionLabel && (
                    <div className="mt-2.5 pt-2 border-t border-border/50">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs gap-1.5 font-semibold w-full justify-between"
                        onClick={() => {
                          navigate(m.actionRoute);
                          setIsOpen(false);
                        }}
                      >
                        <span>{m.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {m.suggestions && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-amber-500" /> Suggested Inquiries
                      </p>
                      {m.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(s)}
                          className="w-full text-left p-1.5 rounded bg-background/80 hover:bg-background border border-border/60 text-[11px] transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {m.sender === "user" && (
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t bg-muted/20 flex gap-2">
            <input
              className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ask Copilot anything about your ERP..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button size="sm" className="h-9 px-3" onClick={() => handleSend()}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
