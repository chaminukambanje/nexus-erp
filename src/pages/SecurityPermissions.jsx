import React, { useState, useMemo } from 'react';
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
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  KeyRound,
  Lock,
  Unlock,
  Plus,
  Pencil,
  Trash2,
  Search,
  Copy,
  CheckCircle2,
  XCircle,
  Eye,
  Settings,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  History,
  Building2,
  Sliders,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

// Standard Enterprise Functional Modules for Permission Matrix
const PERMISSION_MODULES = [
  { key: 'chart_of_accounts', category: 'Finance', label: 'Chart of Accounts & GL Setup', desc: 'General Ledger, COA hierarchy, and posting groups' },
  { key: 'journal_entries', category: 'Finance', label: 'General Journals & Postings', desc: 'Voucher entry, batch posting, and reversals' },
  { key: 'bank_accounts', category: 'Finance', label: 'Bank Accounts & Reconciliation', desc: 'Bank ledgers, bank statements, and automatic matching' },
  { key: 'cash_flow', category: 'Finance', label: 'Cash Flow Forecasting', desc: 'Liquidity modeling, cash runway, and forecast horizons' },
  { key: 'vat_returns', category: 'Finance', label: 'VAT Returns & Tax Statements', desc: 'HMRC 9-box computation, MTD filing, and VAT settlement' },
  { key: 'intercompany', category: 'Finance', label: 'Intercompany Postings', desc: 'IC Partner directory, IC Inbox and Outbox mailboxes' },
  { key: 'customers_sales', category: 'Sales', label: 'Customers & Sales Orders', desc: 'Customer cards, credit limits, quotes, and orders' },
  { key: 'sales_invoices', category: 'Sales', label: 'Sales Invoices & Shipments', desc: 'Posting sales invoices, shipments, and customer price lists' },
  { key: 'vendors_purchases', category: 'Purchasing', label: 'Vendors & Purchase Orders', desc: 'Vendor management, purchase orders, and requisitions' },
  { key: 'bills_matching', category: 'Purchasing', label: 'Purchase Bills & 3-Way Match', desc: 'Invoice verification, 3-way matching, and payments' },
  { key: 'items_warehousing', category: 'Supply Chain', label: 'Items, Warehouses & Bins', desc: 'Item catalog, multi-location stock, and warehouse bins' },
  { key: 'receipts_picks', category: 'Supply Chain', label: 'Warehouse Receipts & Picks', desc: 'Inbound put-away, outbound picking, and lot/serial tracking' },
  { key: 'assembly_orders', category: 'Supply Chain', label: 'Assembly Orders & Kitting', desc: 'Assemble-to-Stock/Order kit explosion and finished goods output' },
  { key: 'manufacturing', category: 'Manufacturing', label: 'Production Orders & BOMs', desc: 'Work centers, machine centers, routings, and MRP planning' },
  { key: 'projects_service', category: 'Projects & Service', label: 'Jobs, Projects & Service SLAs', desc: 'Job tasks, WIP accounting, service orders, and contracts' },
  { key: 'university_mit', category: 'University', label: 'MIT Academic Student Lifecycle', desc: '7-phase lifecycle, Admissions, Course majors, GIR audit, and CAP' },
  { key: 'it_administration', category: 'Administration', label: 'IT Administration & Security', desc: 'User provisioning, role permissions, and legal entity setup' }
];

export default function SecurityPermissions() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('users');
  const [searchUser, setSearchUser] = useState('');
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState('SUPER');

  // Dialog states
  const [userDialog, setUserDialog] = useState(false);
  const [roleDialog, setRoleDialog] = useState(false);
  const [inspectorUser, setInspectorUser] = useState(null);

  // User form state
  const [userForm, setUserForm] = useState({
    id: '',
    username: '',
    full_name: '',
    email: '',
    role_ids: ['FINANCE-MGR'],
    license_type: 'Full User',
    company_scope: 'CRONUS UK Ltd',
    mfa_enabled: true,
    status: 'active'
  });

  // Role form state
  const [roleForm, setRoleForm] = useState({
    id: '',
    name: '',
    description: '',
    color: 'indigo'
  });

  // Fetch data
  const { data: users = [] } = useQuery({
    queryKey: ['systemUsers'],
    queryFn: () => base44.entities.SystemUser.list('-created_at', 200)
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['systemRoles'],
    queryFn: () => base44.entities.SystemRole.list()
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => base44.entities.RolePermission.list()
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['securityAuditLogs'],
    queryFn: () => base44.entities.SecurityAuditLog.list('-timestamp', 100)
  });

  // Mutations
  const userMutation = useMutation({
    mutationFn: async (userData) => {
      const isEdit = !!userData.id;
      if (isEdit) {
        await base44.entities.SystemUser.update(userData.id, userData);
        await base44.entities.SecurityAuditLog.create({
          timestamp: new Date().toISOString(),
          actor: 'IT Administrator',
          event_type: 'USER_UPDATED',
          target: userData.username,
          details: `Updated roles: [${userData.role_ids.join(', ')}], Scope: ${userData.company_scope}`,
          ip_address: '192.168.0.218'
        });
      } else {
        const id = `usr-${Date.now().toString().slice(-6)}`;
        await base44.entities.SystemUser.create({
          ...userData,
          id,
          created_at: new Date().toISOString().split('T')[0],
          last_login: 'Never'
        });
        await base44.entities.SecurityAuditLog.create({
          timestamp: new Date().toISOString(),
          actor: 'IT Administrator',
          event_type: 'USER_PROVISIONED',
          target: userData.username,
          details: `Provisioned account with license '${userData.license_type}' and roles: [${userData.role_ids.join(', ')}]`,
          ip_address: '192.168.0.218'
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['systemUsers']);
      qc.invalidateQueries(['securityAuditLogs']);
      setUserDialog(false);
      toast.success('User provisioning saved successfully');
    }
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, username, newStatus }) => {
      await base44.entities.SystemUser.update(id, { status: newStatus });
      await base44.entities.SecurityAuditLog.create({
        timestamp: new Date().toISOString(),
        actor: 'IT Administrator',
        event_type: newStatus === 'locked' ? 'USER_LOCKED' : 'USER_UNLOCKED',
        target: username,
        details: `Account state transitioned to '${newStatus}' by IT Security policy`,
        ip_address: '192.168.0.218'
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['systemUsers']);
      qc.invalidateQueries(['securityAuditLogs']);
      toast.success('User account status updated');
    }
  });

  const roleMutation = useMutation({
    mutationFn: async (roleData) => {
      const code = roleData.id.toUpperCase().replace(/\s+/g, '-');
      await base44.entities.SystemRole.create({
        ...roleData,
        id: code,
        is_system: false
      });
      await base44.entities.SecurityAuditLog.create({
        timestamp: new Date().toISOString(),
        actor: 'IT Administrator',
        event_type: 'ROLE_CREATED',
        target: code,
        details: `Created new custom security role: ${roleData.name}`,
        ip_address: '192.168.0.218'
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['systemRoles']);
      qc.invalidateQueries(['securityAuditLogs']);
      setRoleDialog(false);
      toast.success('New role created successfully');
    }
  });

  // Permission Matrix state for the selected role
  // Default fallback: SUPER has all true, others based on role
  const getPermission = (roleId, modKey, action) => {
    if (roleId === 'SUPER') return true;
    const found = permissions.find(p => p.role_id === roleId && p.module_key === modKey);
    if (found) return !!found[action];

    // Intelligent defaults based on role naming
    if (roleId === 'AUDITOR') return action === 'can_read';
    if (roleId === 'FINANCE-MGR' && ['chart_of_accounts', 'journal_entries', 'bank_accounts', 'cash_flow', 'vat_returns', 'intercompany'].includes(modKey)) return true;
    if (roleId === 'SALES-REP' && ['customers_sales', 'sales_invoices'].includes(modKey)) return action !== 'can_delete';
    if (roleId === 'PURCHASE-MGR' && ['vendors_purchases', 'bills_matching'].includes(modKey)) return action !== 'can_delete';
    if (roleId === 'WMS-MGR' && ['items_warehousing', 'receipts_picks', 'assembly_orders'].includes(modKey)) return true;
    if (roleId === 'MFG-PLANNER' && ['manufacturing', 'items_warehousing', 'assembly_orders'].includes(modKey)) return true;
    if (roleId === 'UNIV-DEAN' && modKey === 'university_mit') return true;

    // Default read-only for basic operational visibility
    return action === 'can_read';
  };

  const togglePermission = async (roleId, modKey, action) => {
    if (roleId === 'SUPER') {
      toast.info("The 'SUPER' System Administrator role retains mandatory full control.");
      return;
    }
    const currentVal = getPermission(roleId, modKey, action);
    const existing = permissions.find(p => p.role_id === roleId && p.module_key === modKey);

    const updatedRec = existing ? {
      ...existing,
      [action]: !currentVal
    } : {
      id: `perm-${roleId}-${modKey}`,
      role_id: roleId,
      module_key: modKey,
      can_read: action === 'can_read' ? !currentVal : getPermission(roleId, modKey, 'can_read'),
      can_insert: action === 'can_insert' ? !currentVal : getPermission(roleId, modKey, 'can_insert'),
      can_modify: action === 'can_modify' ? !currentVal : getPermission(roleId, modKey, 'can_modify'),
      can_delete: action === 'can_delete' ? !currentVal : getPermission(roleId, modKey, 'can_delete'),
      can_execute: action === 'can_execute' ? !currentVal : getPermission(roleId, modKey, 'can_execute')
    };

    if (existing) {
      await base44.entities.RolePermission.update(existing.id, updatedRec);
    } else {
      await base44.entities.RolePermission.create(updatedRec);
    }

    await base44.entities.SecurityAuditLog.create({
      timestamp: new Date().toISOString(),
      actor: 'IT Administrator',
      event_type: 'PERMISSION_MODIFIED',
      target: `${roleId} :: ${modKey}`,
      details: `Toggled ${action.toUpperCase()} to ${!currentVal}`,
      ip_address: '192.168.0.218'
    });

    qc.invalidateQueries(['rolePermissions']);
    qc.invalidateQueries(['securityAuditLogs']);
    toast.success(`Updated ${action.replace('can_', '')} permission for ${roleId}`);
  };

  const setFullControl = async (roleId) => {
    if (roleId === 'SUPER') return;
    for (const mod of PERMISSION_MODULES) {
      const existing = permissions.find(p => p.role_id === roleId && p.module_key === mod.key);
      const fullPerm = {
        id: existing?.id || `perm-${roleId}-${mod.key}`,
        role_id: roleId,
        module_key: mod.key,
        can_read: true,
        can_insert: true,
        can_modify: true,
        can_delete: true,
        can_execute: true
      };
      if (existing) await base44.entities.RolePermission.update(existing.id, fullPerm);
      else await base44.entities.RolePermission.create(fullPerm);
    }
    qc.invalidateQueries(['rolePermissions']);
    toast.success(`Granted Full Control to role ${roleId}`);
  };

  const setReadOnly = async (roleId) => {
    if (roleId === 'SUPER') return;
    for (const mod of PERMISSION_MODULES) {
      const existing = permissions.find(p => p.role_id === roleId && p.module_key === mod.key);
      const roPerm = {
        id: existing?.id || `perm-${roleId}-${mod.key}`,
        role_id: roleId,
        module_key: mod.key,
        can_read: true,
        can_insert: false,
        can_modify: false,
        can_delete: false,
        can_execute: false
      };
      if (existing) await base44.entities.RolePermission.update(existing.id, roPerm);
      else await base44.entities.RolePermission.create(roPerm);
    }
    qc.invalidateQueries(['rolePermissions']);
    toast.success(`Set Read-Only access for role ${roleId}`);
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      `${u.full_name} ${u.username} ${u.email} ${(u.role_ids || []).join(' ')} ${u.license_type}`
        .toLowerCase()
        .includes(searchUser.toLowerCase())
    );
  }, [users, searchUser]);

  // Role color helper
  const getRoleColor = (color) => {
    switch (color) {
      case 'red': return 'bg-rose-500/10 text-rose-700 border-rose-300 dark:text-rose-400';
      case 'emerald': return 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400';
      case 'blue': return 'bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-400';
      case 'amber': return 'bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400';
      case 'indigo': return 'bg-indigo-500/10 text-indigo-700 border-indigo-300 dark:text-indigo-400';
      case 'purple': return 'bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-400';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1500px]">
      <PageHeader
        title="Security & Permissions Management"
        description="Role-Based Access Control (RBAC), user provisioning, granular CRUDX permissions, and security audit trail"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { qc.invalidateQueries(); toast.success('Synchronized user directory & security cache'); }} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Sync Directory
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setRoleForm({ id: '', name: '', description: '', color: 'indigo' }); setRoleDialog(true); }} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> New Role
            </Button>
            <Button size="sm" onClick={() => { setUserForm({ id: '', username: '', full_name: '', email: '', role_ids: ['FINANCE-MGR'], license_type: 'Full User', company_scope: 'CRONUS UK Ltd', mfa_enabled: true, status: 'active' }); setUserDialog(true); }} className="gap-1.5 text-xs bg-primary">
              <Users className="w-3.5 h-3.5" /> Add User
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Provisioned Users</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2">{users.length}</div>
            <span className="text-[11px] text-muted-foreground">{users.filter(u => u.status === 'active').length} Active Accounts</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Security Roles</span>
              <KeyRound className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2">{roles.length}</div>
            <span className="text-[11px] text-muted-foreground">Permission Sets Active</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">SUPER Administrators</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2 text-rose-600">
              {users.filter(u => (u.role_ids || []).includes('SUPER')).length}
            </div>
            <span className="text-[11px] text-muted-foreground">Unrestricted System Privileges</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">MFA Enforcement</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2 text-emerald-600">
              {users.length > 0 ? Math.round((users.filter(u => u.mfa_enabled).length / users.length) * 100) : 100}%
            </div>
            <span className="text-[11px] text-muted-foreground">2-Factor Authenticated</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Security Audits</span>
              <History className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-2 text-amber-600">{auditLogs.length}</div>
            <span className="text-[11px] text-muted-foreground">Logged Admin Events</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="w-3.5 h-3.5" /> Users & Access Control ({users.length})</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Roles & Permission Sets ({roles.length})</TabsTrigger>
          <TabsTrigger value="matrix" className="text-xs gap-1.5"><Sliders className="w-3.5 h-3.5" /> Granular Permissions Matrix</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs gap-1.5"><History className="w-3.5 h-3.5" /> Security Audit Trail ({auditLogs.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Users */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <CardTitle className="text-base">System User Directory & Role Assignments</CardTitle>
                <CardDescription>Manage user accounts, assign permission roles, toggle lockouts, and restrict legal entity scopes</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search users, email, role..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-9 h-8 text-xs" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <DataTable
                columns={[
                  {
                    header: 'User / Identity',
                    render: r => (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-foreground">{r.full_name}</span>
                          {r.mfa_enabled && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-300">MFA</Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">@{r.username} · {r.email}</span>
                      </div>
                    )
                  },
                  {
                    header: 'Assigned Roles',
                    render: r => (
                      <div className="flex flex-wrap gap-1">
                        {(r.role_ids || []).map(rId => {
                          const roleObj = roles.find(ro => ro.id === rId);
                          return (
                            <Badge key={rId} variant="outline" className={`text-[10px] px-1.5 py-0.5 ${getRoleColor(roleObj?.color || 'indigo')}`}>
                              {roleObj?.name || rId}
                            </Badge>
                          );
                        })}
                      </div>
                    )
                  },
                  {
                    header: 'License & Company Scope',
                    render: r => (
                      <div className="space-y-0.5">
                        <Badge variant="secondary" className="text-[10px]">{r.license_type || 'Full User'}</Badge>
                        <span className="text-[11px] text-muted-foreground block flex items-center gap-1">
                          <Building2 className="w-3 h-3 inline" /> {r.company_scope || 'All Companies'}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'Account Status',
                    render: r => (
                      <Badge className={r.status === 'active' ? 'bg-emerald-600 text-white text-[10px]' : 'bg-rose-600 text-white text-[10px]'}>
                        {r.status === 'active' ? 'Active' : 'Locked'}
                      </Badge>
                    )
                  },
                  {
                    header: 'Last Login',
                    render: r => <span className="text-xs font-mono text-muted-foreground">{r.last_login || 'Never'}</span>
                  },
                  {
                    header: 'Actions',
                    render: r => (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setUserForm({ ...r });
                            setUserDialog(true);
                          }}
                          title="Edit User Permissions"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={r.status === 'active' ? 'ghost' : 'outline'}
                          className={`h-7 px-2 text-xs ${r.status === 'active' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 border-emerald-300'}`}
                          onClick={() => toggleUserStatusMutation.mutate({
                            id: r.id,
                            username: r.username,
                            newStatus: r.status === 'active' ? 'locked' : 'active'
                          })}
                          title={r.status === 'active' ? "Lock Account" : "Unlock Account"}
                        >
                          {r.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-blue-600"
                          onClick={() => setInspectorUser(r)}
                          title="Inspect Effective Permissions"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )
                  }
                ]}
                data={filteredUsers}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Roles */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Roles & Security Permission Sets</CardTitle>
                <CardDescription>Configured enterprise roles, member assignments, and template cloning</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setRoleForm({ id: '', name: '', description: '', color: 'indigo' }); setRoleDialog(true); }} className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Create Custom Role
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <DataTable
                columns={[
                  {
                    header: 'Role Code & Name',
                    render: r => (
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`font-mono text-xs font-bold ${getRoleColor(r.color)}`}>{r.id}</Badge>
                          <span className="font-semibold text-xs text-foreground">{r.name}</span>
                          {r.is_system && <Badge variant="secondary" className="text-[9px]">System Built-in</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                      </div>
                    )
                  },
                  {
                    header: 'Assigned Users',
                    render: r => {
                      const count = users.filter(u => (u.role_ids || []).includes(r.id)).length;
                      return (
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-mono text-xs font-semibold">{count} Users</span>
                        </div>
                      );
                    }
                  },
                  {
                    header: 'Actions',
                    render: r => (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => {
                            setSelectedRoleForMatrix(r.id);
                            setTab('matrix');
                          }}
                        >
                          <Sliders className="w-3.5 h-3.5" /> Matrix
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1"
                          onClick={() => {
                            setRoleForm({
                              id: `${r.id}-COPY`,
                              name: `${r.name} (Custom)`,
                              description: `Custom derivative of ${r.name}`,
                              color: 'purple'
                            });
                            setRoleDialog(true);
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" /> Clone
                        </Button>
                      </div>
                    )
                  }
                ]}
                data={roles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Permissions Matrix */}
        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Permission Set:</span>
                    <Badge variant="outline" className="font-mono text-xs font-bold bg-primary/10 text-primary">
                      {selectedRoleForMatrix}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">Granular CRUDX Permissions Matrix</CardTitle>
                  <CardDescription>
                    Configure Read (R), Insert (I), Modify (M), Delete (D), and Execute/Post (X) rights for every functional area
                  </CardDescription>
                </div>

                {/* Role Switcher & Bulk Presets */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedRoleForMatrix}
                    onChange={e => setSelectedRoleForMatrix(e.target.value)}
                    className="text-xs rounded-md border border-input bg-background px-3 py-1.5 font-medium"
                  >
                    {roles.map(ro => (
                      <option key={ro.id} value={ro.id}>{ro.id} — {ro.name}</option>
                    ))}
                  </select>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFullControl(selectedRoleForMatrix)}
                    className="h-8 text-xs text-emerald-600 border-emerald-300 gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Grant Full Control
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReadOnly(selectedRoleForMatrix)}
                    className="h-8 text-xs text-blue-600 border-blue-300 gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Set Read-Only
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Functional Module / Object</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Read (R)</th>
                      <th className="p-3 text-center">Insert (I)</th>
                      <th className="p-3 text-center">Modify (M)</th>
                      <th className="p-3 text-center">Delete (D)</th>
                      <th className="p-3 text-center">Execute / Post (X)</th>
                      <th className="p-3 text-right">Effective Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {PERMISSION_MODULES.map(mod => {
                      const r = getPermission(selectedRoleForMatrix, mod.key, 'can_read');
                      const i = getPermission(selectedRoleForMatrix, mod.key, 'can_insert');
                      const m = getPermission(selectedRoleForMatrix, mod.key, 'can_modify');
                      const d = getPermission(selectedRoleForMatrix, mod.key, 'can_delete');
                      const x = getPermission(selectedRoleForMatrix, mod.key, 'can_execute');
                      const isFull = r && i && m && d && x;
                      const isNone = !r && !i && !m && !d && !x;
                      const isRo = r && !i && !m && !d && !x;

                      return (
                        <tr key={mod.key} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <span className="font-semibold text-foreground block">{mod.label}</span>
                            <span className="text-[11px] text-muted-foreground">{mod.desc}</span>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px]">{mod.category}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={r}
                              onChange={() => togglePermission(selectedRoleForMatrix, mod.key, 'can_read')}
                              className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={i}
                              onChange={() => togglePermission(selectedRoleForMatrix, mod.key, 'can_insert')}
                              className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={m}
                              onChange={() => togglePermission(selectedRoleForMatrix, mod.key, 'can_modify')}
                              className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={d}
                              onChange={() => togglePermission(selectedRoleForMatrix, mod.key, 'can_delete')}
                              className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={x}
                              onChange={() => togglePermission(selectedRoleForMatrix, mod.key, 'can_execute')}
                              className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <Badge className={
                              isFull ? "bg-emerald-600 text-white text-[10px]" :
                              isRo ? "bg-blue-600 text-white text-[10px]" :
                              isNone ? "bg-muted text-muted-foreground text-[10px]" :
                              "bg-indigo-600 text-white text-[10px]"
                            }>
                              {isFull ? "Full Control" : isRo ? "Read-Only" : isNone ? "No Access" : "Custom"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Audit Trail */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Security & Access Audit Trail</CardTitle>
                <CardDescription>Immutable record of role assignments, permission overrides, and administrative events</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `security_audit_logs_${Date.now()}.json`;
                  a.click();
                  toast.success('Downloaded security audit logs');
                }}
                className="gap-1.5 text-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export Audit Log
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <DataTable
                columns={[
                  { header: 'Timestamp', render: r => <span className="font-mono text-xs">{r.timestamp?.replace('T', ' ').slice(0, 19)}</span> },
                  { header: 'Actor / Admin', render: r => <span className="font-medium text-xs text-foreground">{r.actor}</span> },
                  {
                    header: 'Event Type',
                    render: r => (
                      <Badge variant="outline" className={`text-[10px] uppercase font-mono ${
                        r.event_type.includes('LOCKED') ? 'bg-rose-500/10 text-rose-600 border-rose-300' :
                        r.event_type.includes('CREATED') || r.event_type.includes('PROVISIONED') ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300' :
                        'bg-blue-500/10 text-blue-600 border-blue-300'
                      }`}>
                        {r.event_type}
                      </Badge>
                    )
                  },
                  { header: 'Target Subject', render: r => <span className="font-mono text-xs font-semibold">{r.target}</span> },
                  { header: 'Audit Details', render: r => <span className="text-xs text-muted-foreground">{r.details}</span> },
                  { header: 'IP Address', render: r => <span className="font-mono text-[11px] text-muted-foreground">{r.ip_address}</span> }
                ]}
                data={auditLogs}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit User Dialog */}
      <FormDialog
        open={userDialog}
        onOpenChange={setUserDialog}
        title={userForm.id ? "Edit User Security & Roles" : "Provision New User"}
        onSubmit={() => userMutation.mutate(userForm)}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Full Name">
              <Input value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} placeholder="e.g. Elena Rostova" />
            </FormField>
            <FormField label="Username">
              <Input value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} placeholder="e.g. elena.rostova" />
            </FormField>
          </div>

          <FormField label="Email Address">
            <Input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} placeholder="e.g. e.rostova@cronus.co.uk" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="License Type">
              <select
                value={userForm.license_type}
                onChange={e => setUserForm({ ...userForm, license_type: e.target.value })}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="Full User (Unrestricted Enterprise)">Full User (Unrestricted Enterprise)</option>
                <option value="Full User">Full User (Business Manager)</option>
                <option value="Team Member">Team Member (Light User)</option>
                <option value="Internal Administrator">Internal Administrator</option>
                <option value="External Auditor">External Auditor</option>
              </select>
            </FormField>

            <FormField label="Company / Entity Access">
              <select
                value={userForm.company_scope}
                onChange={e => setUserForm({ ...userForm, company_scope: e.target.value })}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="ALL">All Legal Entities (Consolidated)</option>
                <option value="CRONUS UK Ltd">CRONUS UK Ltd</option>
                <option value="CRONUS North America Inc">CRONUS North America Inc</option>
                <option value="Nexus Innovations Ltd">Nexus Innovations Ltd</option>
              </select>
            </FormField>
          </div>

          <FormField label="Assigned Security Roles / Permission Sets">
            <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto bg-muted/20">
              {roles.map(role => {
                const checked = (userForm.role_ids || []).includes(role.id);
                return (
                  <label key={role.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 p-1.5 rounded">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const current = userForm.role_ids || [];
                        const updated = checked
                          ? current.filter(r => r !== role.id)
                          : [...current, role.id];
                        setUserForm({ ...userForm, role_ids: updated });
                      }}
                      className="w-4 h-4 rounded text-primary accent-primary"
                    />
                    <Badge variant="outline" className={`font-mono text-[10px] ${getRoleColor(role.color)}`}>{role.id}</Badge>
                    <span className="font-medium text-foreground">{role.name}</span>
                  </label>
                );
              })}
            </div>
          </FormField>

          <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
            <div>
              <span className="text-xs font-semibold block">Require Multi-Factor Authentication (MFA)</span>
              <span className="text-[11px] text-muted-foreground">Enforce Microsoft Authenticator / OTP on login</span>
            </div>
            <input
              type="checkbox"
              checked={userForm.mfa_enabled}
              onChange={e => setUserForm({ ...userForm, mfa_enabled: e.target.checked })}
              className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
            />
          </div>
        </div>
      </FormDialog>

      {/* Create Custom Role Dialog */}
      <FormDialog
        open={roleDialog}
        onOpenChange={setRoleDialog}
        title="Create Custom Security Role"
        onSubmit={() => roleMutation.mutate(roleForm)}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Role Identifier / Code">
              <Input value={roleForm.id} onChange={e => setRoleForm({ ...roleForm, id: e.target.value })} placeholder="e.g. JUNIOR-ACCT" />
            </FormField>
            <FormField label="Color Accent">
              <select
                value={roleForm.color}
                onChange={e => setRoleForm({ ...roleForm, color: e.target.value })}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="indigo">Indigo</option>
                <option value="emerald">Emerald</option>
                <option value="blue">Blue</option>
                <option value="purple">Purple</option>
                <option value="amber">Amber</option>
                <option value="red">Red</option>
              </select>
            </FormField>
          </div>

          <FormField label="Role Title / Display Name">
            <Input value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g. Junior Accountant & Cashier" />
          </FormField>

          <FormField label="Role Description & Purpose">
            <Input value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Brief explanation of authorized operational responsibilities" />
          </FormField>
        </div>
      </FormDialog>

      {/* User Permissions Inspector Dialog */}
      {inspectorUser && (
        <FormDialog
          open={!!inspectorUser}
          onOpenChange={() => setInspectorUser(null)}
          title={`Effective Permissions: ${inspectorUser.full_name} (@${inspectorUser.username})`}
          onSubmit={() => setInspectorUser(null)}
        >
          <div className="space-y-3">
            <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold block">{inspectorUser.email}</span>
                <span className="text-[11px] text-muted-foreground">License: {inspectorUser.license_type} • Scope: {inspectorUser.company_scope}</span>
              </div>
              <div className="flex gap-1">
                {(inspectorUser.role_ids || []).map(r => (
                  <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                ))}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y border rounded-md">
              {PERMISSION_MODULES.map(mod => {
                const userHasSuper = (inspectorUser.role_ids || []).includes('SUPER');
                const canRead = userHasSuper || (inspectorUser.role_ids || []).some(rId => getPermission(rId, mod.key, 'can_read'));
                const canWrite = userHasSuper || (inspectorUser.role_ids || []).some(rId => getPermission(rId, mod.key, 'can_insert') || getPermission(rId, mod.key, 'can_modify'));
                const canPost = userHasSuper || (inspectorUser.role_ids || []).some(rId => getPermission(rId, mod.key, 'can_execute'));

                return (
                  <div key={mod.key} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium block">{mod.label}</span>
                      <span className="text-[10px] text-muted-foreground">{mod.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <Badge className={canRead ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}>Read</Badge>
                      <Badge className={canWrite ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}>Write</Badge>
                      <Badge className={canPost ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"}>Post</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </FormDialog>
      )}
    </div>
  );
}
