import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  Building2,
  Inbox,
  Send,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function Intercompany() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('inbox');
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState({
    partner_code: 'CRONUS-US',
    document_type: 'Invoice',
    description: 'Shared IT Infrastructure & Cloud Services recharge',
    amount: '12500.00',
    currency: 'GBP',
    source_account: '7100 - IT Operating Expenses',
    target_account: '1900 - Intercompany Due to Affiliate'
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['icPartners'],
    queryFn: () => base44.entities.IntercompanyPartner.list()
  });

  const { data: inboxTransactions = [] } = useQuery({
    queryKey: ['icInbox'],
    queryFn: () => base44.entities.IntercompanyInbox.list('-created_date', 100)
  });

  const { data: outboxTransactions = [] } = useQuery({
    queryKey: ['icOutbox'],
    queryFn: () => base44.entities.IntercompanyOutbox.list('-created_date', 100)
  });

  // Accept and post IC Inbox transaction
  const acceptMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.IntercompanyInbox.update(id, { status: 'accepted' });
      // Create local general journal entry
      await base44.entities.JournalEntry.create({
        entry_number: `IC-POST-${Date.now().toString().slice(-6)}`,
        posting_date: new Date().toISOString().split('T')[0],
        description: `Posted Intercompany Transaction from partner`,
        reference: `IC-REF-${id}`,
        status: 'posted'
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['icInbox']);
      qc.invalidateQueries(['journalEntries']);
      toast.success('Intercompany Transaction accepted and posted to General Ledger');
    }
  });

  // Create Outbox transaction
  const outboxMutation = useMutation({
    mutationFn: (data) => base44.entities.IntercompanyOutbox.create({
      ...data,
      amount: parseFloat(data.amount),
      status: 'pending_dispatch',
      transaction_no: `IC-OUT-${Date.now().toString().slice(-6)}`,
      posting_date: new Date().toISOString().split('T')[0]
    }),
    onSuccess: () => {
      qc.invalidateQueries(['icOutbox']);
      setCreateDialog(false);
      toast.success('Intercompany Outbox Transaction created and queued for transmission');
    }
  });

  // Dispatch outbox to partner
  const dispatchMutation = useMutation({
    mutationFn: (id) => base44.entities.IntercompanyOutbox.update(id, { status: 'transmitted' }),
    onSuccess: () => {
      qc.invalidateQueries(['icOutbox']);
      toast.success('Transaction transmitted to partner inbox');
    }
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <PageHeader
        title="Intercompany Postings"
        description="Multi-entity transactions, IC Partner directory, and automated Inbox/Outbox synchronization (Dynamics 365 BC architecture)"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Sync IC Mailbox
            </Button>
            <Button size="sm" onClick={() => setCreateDialog(true)} className="gap-1.5 text-xs bg-primary">
              <Plus className="w-3.5 h-3.5" /> New IC Transaction
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Pending IC Inbox</span>
              <Inbox className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2">
              {inboxTransactions.filter(t => t.status === 'pending').length}
            </div>
            <span className="text-[11px] text-muted-foreground">Transactions awaiting review</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Outbox Queued</span>
              <Send className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2">
              {outboxTransactions.filter(t => t.status === 'pending_dispatch').length}
            </div>
            <span className="text-[11px] text-muted-foreground">Ready for transmission</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Registered IC Partners</span>
              <Building2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2">
              {partners.length}
            </div>
            <span className="text-[11px] text-muted-foreground">Active group subsidiaries</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox" className="text-xs gap-1.5"><Inbox className="w-3.5 h-3.5" /> IC Inbox ({inboxTransactions.length})</TabsTrigger>
          <TabsTrigger value="outbox" className="text-xs gap-1.5"><Send className="w-3.5 h-3.5" /> IC Outbox ({outboxTransactions.length})</TabsTrigger>
          <TabsTrigger value="partners" className="text-xs gap-1.5"><Building2 className="w-3.5 h-3.5" /> Intercompany Partners ({partners.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Inbox */}
        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Intercompany Inbox</CardTitle>
              <CardDescription>Incoming documents from affiliate entities requiring journal acceptance</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <DataTable
                columns={[
                  { header: 'Transaction #', render: r => <span className="font-mono font-semibold text-xs">{r.transaction_no || r.id.slice(0, 8)}</span> },
                  { header: 'From Partner', render: r => <span className="font-medium text-xs">{r.from_partner_name || r.partner_code}</span> },
                  { header: 'Document Type', render: r => <Badge variant="outline" className="text-[10px]">{r.document_type || 'General Journal'}</Badge> },
                  { header: 'Description', render: r => <span className="text-xs text-muted-foreground">{r.description}</span> },
                  { header: 'Amount', render: r => <span className="font-mono font-bold text-xs">£{parseFloat(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> },
                  { header: 'Status', render: r => <StatusBadge status={r.status} /> },
                  {
                    header: 'Actions',
                    render: r => (
                      <div className="flex items-center gap-1.5">
                        {r.status === 'pending' && (
                          <Button size="sm" onClick={() => acceptMutation.mutate(r.id)} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Post
                          </Button>
                        )}
                      </div>
                    )
                  }
                ]}
                data={inboxTransactions}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Outbox */}
        <TabsContent value="outbox" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Intercompany Outbox</CardTitle>
              <CardDescription>Transactions originated locally to be routed to partner affiliate entities</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <DataTable
                columns={[
                  { header: 'Transaction #', render: r => <span className="font-mono font-semibold text-xs">{r.transaction_no}</span> },
                  { header: 'To Partner', render: r => <span className="font-medium text-xs">{r.partner_code}</span> },
                  { header: 'Document Type', render: r => <Badge variant="outline" className="text-[10px]">{r.document_type}</Badge> },
                  { header: 'Description', render: r => <span className="text-xs text-muted-foreground">{r.description}</span> },
                  { header: 'Amount', render: r => <span className="font-mono font-bold text-xs">£{parseFloat(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> },
                  { header: 'Status', render: r => <StatusBadge status={r.status} /> },
                  {
                    header: 'Actions',
                    render: r => (
                      <div className="flex items-center gap-1.5">
                        {r.status === 'pending_dispatch' && (
                          <Button size="sm" onClick={() => dispatchMutation.mutate(r.id)} className="h-7 text-xs gap-1">
                            <Send className="w-3.5 h-3.5" /> Dispatch
                          </Button>
                        )}
                      </div>
                    )
                  }
                ]}
                data={outboxTransactions}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Partners */}
        <TabsContent value="partners" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Intercompany Partners</CardTitle>
              <CardDescription>Configured legal entities with intercompany mapping privileges</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <DataTable
                columns={[
                  { header: 'Partner Code', render: r => <span className="font-mono font-bold text-xs">{r.code}</span> },
                  { header: 'Entity Name', render: r => <span className="font-medium text-xs">{r.name}</span> },
                  { header: 'Country / Jurisdiction', render: r => <span className="text-xs">{r.country}</span> },
                  { header: 'Currency', render: r => <Badge variant="secondary" className="font-mono text-[10px]">{r.currency}</Badge> },
                  { header: 'Auto-Accept', render: r => <Badge variant={r.auto_accept ? "default" : "outline"} className="text-[10px]">{r.auto_accept ? "Enabled" : "Manual Approval"}</Badge> },
                  { header: 'G/L Offset Account', render: r => <span className="font-mono text-xs text-muted-foreground">{r.offset_account || '1910 - IC Receivables'}</span> }
                ]}
                data={partners}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Outbox Transaction Dialog */}
      <FormDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        title="Create Intercompany Transaction"
        onSubmit={() => outboxMutation.mutate(form)}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Target Partner">
              <select
                value={form.partner_code}
                onChange={e => setForm({ ...form, partner_code: e.target.value })}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2"
              >
                {partners.map(p => (
                  <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Document Type">
              <select
                value={form.document_type}
                onChange={e => setForm({ ...form, document_type: e.target.value })}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="Invoice">Intercompany Invoice</option>
                <option value="General Journal">General Journal Transfer</option>
                <option value="Credit Memo">Intercompany Credit Memo</option>
              </select>
            </FormField>
          </div>

          <FormField label="Description / Purpose">
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount">
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </FormField>
            <FormField label="Currency">
              <Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} />
            </FormField>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
