import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Pencil, Trash2, Search, CalendarClock, Plus, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const defaultEmployee = { first_name: '', last_name: '', email: '', phone: '', job_title: '', department: '', employment_type: 'full_time', status: 'active', hire_date: '', salary: 0, salary_currency: 'USD' };
const defaultAbsence = { employee_id: '', employee_name: '', absence_type: 'vacation', from_date: '', to_date: '', days: 1, status: 'pending', reason: '' };

export default function Employees() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [empDialog, setEmpDialog] = useState(false);
  const [absDialog, setAbsDialog] = useState(false);
  const [empForm, setEmpForm] = useState(defaultEmployee);
  const [absForm, setAbsForm] = useState(defaultAbsence);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: employees = [], isLoading: empLoading } = useQuery({ queryKey: ['employees'], queryFn: () => base44.entities.Employee.list('-created_date', 200) });
  const { data: absences = [], isLoading: absLoading } = useQuery({ queryKey: ['absences'], queryFn: () => base44.entities.EmployeeAbsence.list('-from_date', 200) });

  const empMutation = useMutation({
    mutationFn: (data) => {
      const num = data.employee_number || `EMP-${String(Date.now()).slice(-5)}`;
      const payload = { ...data, employee_number: num };
      return data.id ? base44.entities.Employee.update(data.id, payload) : base44.entities.Employee.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(['employees']); setEmpDialog(false); setEmpForm(defaultEmployee); }
  });

  const absMutation = useMutation({
    mutationFn: (data) => data.id ? base44.entities.EmployeeAbsence.update(data.id, data) : base44.entities.EmployeeAbsence.create(data),
    onSuccess: () => { qc.invalidateQueries(['absences']); setAbsDialog(false); setAbsForm(defaultAbsence); }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }) => type === 'employee' ? base44.entities.Employee.delete(id) : base44.entities.EmployeeAbsence.delete(id),
    onSuccess: () => { qc.invalidateQueries(['employees']); qc.invalidateQueries(['absences']); setDeleteTarget(null); }
  });

  const approveAbsence = (abs) => absMutation.mutate({ ...abs, status: 'approved' });
  const rejectAbsence = (abs) => absMutation.mutate({ ...abs, status: 'rejected' });

  const setEmp = (k, v) => setEmpForm(f => ({ ...f, [k]: v }));
  const setAbs = (k, v) => setAbsForm(f => ({ ...f, [k]: v }));

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    return `${e.first_name} ${e.last_name} ${e.email || ''} ${e.department || ''} ${e.job_title || ''}`.toLowerCase().includes(q);
  });

  const empOptions = employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }));

  const empColumns = [
    { header: 'Employee', render: r => <div><p className="font-medium">{r.first_name} {r.last_name}</p><p className="text-xs text-muted-foreground">{r.employee_number}</p></div> },
    { header: 'Title / Dept', render: r => <div><p className="text-sm">{r.job_title || '—'}</p><p className="text-xs text-muted-foreground">{r.department || '—'}</p></div> },
    { header: 'Type', render: r => <span className="capitalize text-sm">{(r.employment_type || '').replace('_', ' ')}</span> },
    { header: 'Hire Date', render: r => <span className="text-sm">{r.hire_date ? format(new Date(r.hire_date), 'MMM d, yyyy') : '—'}</span> },
    { header: 'Salary', render: r => <span className="font-semibold">{r.salary_currency || 'USD'} {(r.salary || 0).toLocaleString()}</span> },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setEmpForm(r); setEmpDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'employee', id: r.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  const absColumns = [
    { header: 'Employee', render: r => <span className="font-medium">{r.employee_name || employees.find(e => e.id === r.employee_id)?.first_name + ' ' + employees.find(e => e.id === r.employee_id)?.last_name || '—'}</span> },
    { header: 'Type', render: r => <span className="capitalize text-sm">{(r.absence_type || '').replace('_', ' ')}</span> },
    { header: 'From', render: r => <span className="text-sm">{r.from_date ? format(new Date(r.from_date), 'MMM d, yyyy') : '—'}</span> },
    { header: 'To', render: r => <span className="text-sm">{r.to_date ? format(new Date(r.to_date), 'MMM d, yyyy') : '—'}</span> },
    { header: 'Days', render: r => <span className="font-medium">{r.days}</span> },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-2">
          {r.status === 'pending' && <>
            <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => approveAbsence(r)}><CheckCircle className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => rejectAbsence(r)}><XCircle className="w-3.5 h-3.5" /></Button>
          </>}
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ type: 'absence', id: r.id })}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  const activeCount = employees.filter(e => e.status === 'active').length;
  const pendingLeave = absences.filter(a => a.status === 'pending').length;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <PageHeader title="Human Resources" subtitle="Manage employees, contracts, and leave requests">
        <Button variant="outline" onClick={() => { setAbsForm(defaultAbsence); setAbsDialog(true); }} className="gap-2">
          <CalendarClock className="w-4 h-4" /> Log Absence
        </Button>
        <Button onClick={() => { setEmpForm(defaultEmployee); setEmpDialog(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Employee
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: employees.length },
          { label: 'Active', value: activeCount },
          { label: 'On Leave', value: employees.filter(e => e.status === 'on_leave').length },
          { label: 'Pending Approvals', value: pendingLeave },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="absences">Leave Requests {pendingLeave > 0 && <Badge variant="destructive" className="ml-1.5 text-xs">{pendingLeave}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {filtered.length === 0 && !empLoading ? (
            <EmptyState icon={Users} title="No employees yet" description="Add your first employee to get started." actionLabel="New Employee" onAction={() => { setEmpForm(defaultEmployee); setEmpDialog(true); }} />
          ) : (
            <DataTable columns={empColumns} data={filtered} isLoading={empLoading} />
          )}
        </TabsContent>

        <TabsContent value="absences" className="mt-4">
          <DataTable columns={absColumns} data={absences} isLoading={absLoading} emptyMessage="No leave requests recorded" />
        </TabsContent>
      </Tabs>

      {/* Employee Dialog */}
      <FormDialog open={empDialog} onOpenChange={setEmpDialog} title={empForm.id ? 'Edit Employee' : 'New Employee'} onSubmit={() => empMutation.mutate(empForm)} isSubmitting={empMutation.isPending} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" value={empForm.first_name} onChange={v => setEmp('first_name', v)} required />
          <FormField label="Last Name" value={empForm.last_name} onChange={v => setEmp('last_name', v)} required />
          <FormField label="Email" type="email" value={empForm.email} onChange={v => setEmp('email', v)} />
          <FormField label="Phone" value={empForm.phone} onChange={v => setEmp('phone', v)} />
          <FormField label="Job Title" value={empForm.job_title} onChange={v => setEmp('job_title', v)} />
          <FormField label="Department" value={empForm.department} onChange={v => setEmp('department', v)} />
          <FormField label="Employment Type" type="select" value={empForm.employment_type} onChange={v => setEmp('employment_type', v)} options={[{ value: 'full_time', label: 'Full Time' }, { value: 'part_time', label: 'Part Time' }, { value: 'contract', label: 'Contract' }, { value: 'intern', label: 'Intern' }]} />
          <FormField label="Status" type="select" value={empForm.status} onChange={v => setEmp('status', v)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'on_leave', label: 'On Leave' }, { value: 'terminated', label: 'Terminated' }]} />
          <FormField label="Hire Date" type="date" value={empForm.hire_date} onChange={v => setEmp('hire_date', v)} />
          <FormField label="Birth Date" type="date" value={empForm.birth_date} onChange={v => setEmp('birth_date', v)} />
          <FormField label="Salary" type="number" value={empForm.salary} onChange={v => setEmp('salary', v)} />
          <FormField label="Currency" value={empForm.salary_currency} onChange={v => setEmp('salary_currency', v)} />
          <FormField label="Manager Name" value={empForm.manager_name} onChange={v => setEmp('manager_name', v)} />
          <FormField label="Tax ID" value={empForm.tax_id} onChange={v => setEmp('tax_id', v)} />
          <FormField label="Address" value={empForm.address} onChange={v => setEmp('address', v)} className="col-span-2" />
          <FormField label="Notes" type="textarea" value={empForm.notes} onChange={v => setEmp('notes', v)} className="col-span-2" />
        </div>
      </FormDialog>

      {/* Absence Dialog */}
      <FormDialog open={absDialog} onOpenChange={setAbsDialog} title="Log Leave Request" onSubmit={() => absMutation.mutate(absForm)} isSubmitting={absMutation.isPending}>
        <FormField label="Employee" type="select" value={absForm.employee_id} onChange={v => { const e = employees.find(x => x.id === v); setAbsForm(f => ({ ...f, employee_id: v, employee_name: e ? `${e.first_name} ${e.last_name}` : '' })); }} options={empOptions} required />
        <FormField label="Absence Type" type="select" value={absForm.absence_type} onChange={v => setAbs('absence_type', v)} options={['vacation','sick_leave','personal','maternity','paternity','bereavement','unpaid','other'].map(t => ({ value: t, label: t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="From Date" type="date" value={absForm.from_date} onChange={v => setAbs('from_date', v)} required />
          <FormField label="To Date" type="date" value={absForm.to_date} onChange={v => setAbs('to_date', v)} required />
        </div>
        <FormField label="Days" type="number" value={absForm.days} onChange={v => setAbs('days', v)} />
        <FormField label="Reason" type="textarea" value={absForm.reason} onChange={v => setAbs('reason', v)} />
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Delete</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}