import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FolderKanban, Pencil, Trash2, Search, Plus, ListTodo } from 'lucide-react';
import { format } from 'date-fns';

const defaultProject = { name: '', status: 'planning', billing_type: 'time_and_material', budget: 0, actual_cost: 0, billed_amount: 0, percent_complete: 0, currency: 'USD' };
const defaultTask = { title: '', status: 'not_started', priority: 'medium', estimated_hours: 0, actual_hours: 0, unit_price: 0 };

export default function Projects() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [projDialog, setProjDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [projForm, setProjForm] = useState(defaultProject);
  const [taskForm, setTaskForm] = useState(defaultTask);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date', 200) });
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({ queryKey: ['projectTasks'], queryFn: () => base44.entities.ProjectTask.list('-created_date', 500) });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });

  const projMutation = useMutation({
    mutationFn: (data) => {
      const num = data.project_number || `PROJ-${String(Date.now()).slice(-5)}`;
      return data.id ? base44.entities.Project.update(data.id, { ...data, project_number: num }) : base44.entities.Project.create({ ...data, project_number: num });
    },
    onSuccess: () => { qc.invalidateQueries(['projects']); setProjDialog(false); setProjForm(defaultProject); }
  });

  const taskMutation = useMutation({
    mutationFn: (data) => {
      const proj = projects.find(p => p.id === data.project_id);
      const num = data.task_number || `TASK-${String(Date.now()).slice(-5)}`;
      return data.id
        ? base44.entities.ProjectTask.update(data.id, { ...data, task_number: num, project_name: proj?.name || '' })
        : base44.entities.ProjectTask.create({ ...data, task_number: num, project_name: proj?.name || '' });
    },
    onSuccess: () => { qc.invalidateQueries(['projectTasks']); setTaskDialog(false); setTaskForm(defaultTask); }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }) => type === 'project' ? base44.entities.Project.delete(id) : base44.entities.ProjectTask.delete(id),
    onSuccess: () => { qc.invalidateQueries(['projects']); qc.invalidateQueries(['projectTasks']); setDeleteTarget(null); }
  });

  const setP = (k, v) => setProjForm(f => ({ ...f, [k]: v }));
  const setT = (k, v) => setTaskForm(f => ({ ...f, [k]: v }));

  const filtered = projects.filter(p => `${p.name} ${p.customer_name || ''} ${p.status}`.toLowerCase().includes(search.toLowerCase()));

  const projColumns = [
    { header: 'Project', render: r => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.project_number} · {r.customer_name || 'Internal'}</p></div> },
    { header: 'Billing', render: r => <span className="capitalize text-sm">{(r.billing_type || '').replace(/_/g, ' ')}</span> },
    { header: 'Budget', render: r => <span className="font-medium">${(r.budget || 0).toLocaleString()}</span> },
    { header: 'Actual Cost', render: r => <span className={`font-medium ${(r.actual_cost || 0) > (r.budget || 0) ? 'text-red-600' : ''}`}>${(r.actual_cost || 0).toLocaleString()}</span> },
    { header: 'Progress', render: r => <div className="w-24"><Progress value={r.percent_complete || 0} className="h-2" /><p className="text-xs text-muted-foreground mt-0.5">{r.percent_complete || 0}%</p></div> },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setSelectedProject(r); setTaskForm({ ...defaultTask, project_id: r.id }); setTaskDialog(true); }} title="Add task"><ListTodo className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setProjForm(r); setProjDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'project', id: r.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  const taskColumns = [
    { header: 'Task', render: r => <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.project_name}</p></div> },
    { header: 'Assigned To', render: r => <span className="text-sm">{r.assigned_to || '—'}</span> },
    { header: 'Priority', render: r => <StatusBadge status={r.priority} /> },
    { header: 'Est. Hours', render: r => <span className="text-sm">{r.estimated_hours || 0}h</span> },
    { header: 'Actual Hours', render: r => <span className="text-sm">{r.actual_hours || 0}h</span> },
    { header: 'Due Date', render: r => <span className="text-sm">{r.due_date ? format(new Date(r.due_date), 'MMM d, yyyy') : '—'}</span> },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setTaskForm(r); setTaskDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'task', id: r.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalCost = projects.reduce((s, p) => s + (p.actual_cost || 0), 0);
  const openProjects = projects.filter(p => ['open','in_progress','planning'].includes(p.status)).length;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <PageHeader title="Project Management" subtitle="Track projects, tasks, and time" actionLabel="New Project" onAction={() => { setProjForm(defaultProject); setProjDialog(true); }} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: projects.length },
          { label: 'Open / Active', value: openProjects },
          { label: 'Total Budget', value: `$${totalBudget.toLocaleString()}` },
          { label: 'Actual Cost', value: `$${totalCost.toLocaleString()}` },
        ].map(s => <Card key={s.label}><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold mt-1">{s.value}</p></CardContent></Card>)}
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {filtered.length === 0 && !isLoading ? (
            <EmptyState icon={FolderKanban} title="No projects yet" description="Create your first project." actionLabel="New Project" onAction={() => { setProjForm(defaultProject); setProjDialog(true); }} />
          ) : (
            <DataTable columns={projColumns} data={filtered} isLoading={isLoading} />
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <DataTable columns={taskColumns} data={tasks} isLoading={tasksLoading} emptyMessage="No tasks yet" />
        </TabsContent>
      </Tabs>

      {/* Project Dialog */}
      <FormDialog open={projDialog} onOpenChange={setProjDialog} title={projForm.id ? 'Edit Project' : 'New Project'} onSubmit={() => projMutation.mutate(projForm)} isSubmitting={projMutation.isPending} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Project Name" value={projForm.name} onChange={v => setP('name', v)} required className="col-span-2" />
          <FormField label="Customer" type="select" value={projForm.customer_id || ''} onChange={v => { const c = customers.find(x => x.id === v); setProjForm(f => ({ ...f, customer_id: v, customer_name: c?.name || '' })); }} options={customers.map(c => ({ value: c.id, label: c.name }))} />
          <FormField label="Manager Name" value={projForm.manager_name} onChange={v => setP('manager_name', v)} />
          <FormField label="Status" type="select" value={projForm.status} onChange={v => setP('status', v)} options={['planning','open','in_progress','completed','cancelled','on_hold'].map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
          <FormField label="Billing Type" type="select" value={projForm.billing_type} onChange={v => setP('billing_type', v)} options={[{ value: 'fixed_price', label: 'Fixed Price' }, { value: 'time_and_material', label: 'Time & Material' }, { value: 'not_billable', label: 'Not Billable' }]} />
          <FormField label="Start Date" type="date" value={projForm.start_date} onChange={v => setP('start_date', v)} />
          <FormField label="End Date" type="date" value={projForm.end_date} onChange={v => setP('end_date', v)} />
          <FormField label="Budget" type="number" value={projForm.budget} onChange={v => setP('budget', v)} />
          <FormField label="Actual Cost" type="number" value={projForm.actual_cost} onChange={v => setP('actual_cost', v)} />
          <FormField label="% Complete" type="number" value={projForm.percent_complete} onChange={v => setP('percent_complete', v)} />
          <FormField label="Billed Amount" type="number" value={projForm.billed_amount} onChange={v => setP('billed_amount', v)} />
          <FormField label="Description" type="textarea" value={projForm.description} onChange={v => setP('description', v)} className="col-span-2" />
          <FormField label="Notes" type="textarea" value={projForm.notes} onChange={v => setP('notes', v)} className="col-span-2" />
        </div>
      </FormDialog>

      {/* Task Dialog */}
      <FormDialog open={taskDialog} onOpenChange={setTaskDialog} title={taskForm.id ? 'Edit Task' : 'New Task'} onSubmit={() => taskMutation.mutate(taskForm)} isSubmitting={taskMutation.isPending} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Project" type="select" value={taskForm.project_id || ''} onChange={v => setT('project_id', v)} options={projects.map(p => ({ value: p.id, label: p.name }))} required className="col-span-2" />
          <FormField label="Task Title" value={taskForm.title} onChange={v => setT('title', v)} required className="col-span-2" />
          <FormField label="Assigned To" value={taskForm.assigned_to} onChange={v => setT('assigned_to', v)} />
          <FormField label="Priority" type="select" value={taskForm.priority} onChange={v => setT('priority', v)} options={['low','medium','high','critical'].map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
          <FormField label="Status" type="select" value={taskForm.status} onChange={v => setT('status', v)} options={['not_started','in_progress','completed','on_hold','cancelled'].map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
          <FormField label="Start Date" type="date" value={taskForm.start_date} onChange={v => setT('start_date', v)} />
          <FormField label="Due Date" type="date" value={taskForm.due_date} onChange={v => setT('due_date', v)} />
          <FormField label="Estimated Hours" type="number" value={taskForm.estimated_hours} onChange={v => setT('estimated_hours', v)} />
          <FormField label="Actual Hours" type="number" value={taskForm.actual_hours} onChange={v => setT('actual_hours', v)} />
          <FormField label="Unit Price" type="number" value={taskForm.unit_price} onChange={v => setT('unit_price', v)} />
          <FormField label="Notes" type="textarea" value={taskForm.notes} onChange={v => setT('notes', v)} className="col-span-2" />
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Delete</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}