import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Pencil, Trash2, Search, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const defaultApp = { first_name: '', last_name: '', email: '', phone: '', date_of_birth: '', gender: 'male', nationality: '', national_id: '', high_school_name: '', high_school_graduation_year: '', high_school_gpa: '', desired_programme_id: '', desired_intake_year: new Date().getFullYear().toString(), application_date: new Date().toISOString().slice(0, 10), status: 'submitted', documents_submitted: false };

const STATUS_COLORS = { submitted: 'bg-blue-50 border-l-blue-500', under_review: 'bg-yellow-50 border-l-yellow-500', shortlisted: 'bg-purple-50 border-l-purple-500', accepted: 'bg-emerald-50 border-l-emerald-500', rejected: 'bg-red-50 border-l-red-500', enrolled: 'bg-indigo-50 border-l-indigo-500' };

export default function Admissions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(defaultApp);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tab, setTab] = useState('all');

  const { data: applicants = [], isLoading } = useQuery({ queryKey: ['applicants'], queryFn: () => base44.entities.Applicant.list('-application_date', 500) });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes'], queryFn: () => base44.entities.Programme.list() });

  const mutation = useMutation({
    mutationFn: async (data) => {
      const num = data.application_number || `APP-${String(Date.now()).slice(-6)}`;
      const prog = programmes.find(p => p.id === data.desired_programme_id);
      const isNew = !data.id;

      const applicant = await (data.id
        ? base44.entities.Applicant.update(data.id, { ...data, application_number: num, desired_programme_name: prog?.name || data.desired_programme_name })
        : base44.entities.Applicant.create({ ...data, application_number: num, desired_programme_name: prog?.name || '' }));

      // On NEW application: create a Contact (lead) + Opportunity in the CRM pipeline
      if (isNew) {
        const contact = await base44.entities.Contact.create({
          first_name: data.first_name, last_name: data.last_name,
          email: data.email, phone: data.phone,
          type: 'applicant', status: 'active',
          applicant_id: applicant.id,
          notes: `Application: ${num} — ${prog?.name || data.desired_programme_name || ''}`,
          last_interaction: new Date().toISOString().slice(0, 10)
        });
        const opportunity = await base44.entities.Opportunity.create({
          name: `${data.first_name} ${data.last_name} — ${prog?.name || 'Programme Application'}`,
          contact_id: contact.id, contact_name: `${data.first_name} ${data.last_name}`,
          stage: 'qualification', status: 'open',
          estimated_value: prog?.annual_fee || 0,
          source: 'University Admissions',
          notes: `Application ref: ${num}`
        });
        await base44.entities.Applicant.update(applicant.id, {
          contact_id: contact.id, opportunity_id: opportunity.id
        });
      }
      return applicant;
    },
    onSuccess: () => { qc.invalidateQueries(['applicants']); qc.invalidateQueries(['contacts']); qc.invalidateQueries(['opportunities']); setDialog(false); setForm(defaultApp); }
  });

  const enrollMutation = useMutation({
    mutationFn: async (applicant) => {
      const prog = programmes.find(p => p.id === applicant.desired_programme_id);
      const snum = `STU-${String(Date.now()).slice(-6)}`;
      const cnum = `CUST-STU-${String(Date.now()).slice(-6)}`;

      // 1. Create Customer record for fees/billing
      const customer = await base44.entities.Customer.create({
        customer_number: cnum, name: `${applicant.first_name} ${applicant.last_name}`,
        email: applicant.email, phone: applicant.phone, status: 'active',
        notes: `Student: ${snum}`
      });

      // 2. Create Student record
      const student = await base44.entities.Student.create({
        student_number: snum, first_name: applicant.first_name, last_name: applicant.last_name,
        email: applicant.email, phone: applicant.phone, date_of_birth: applicant.date_of_birth,
        gender: applicant.gender, nationality: applicant.nationality, national_id: applicant.national_id,
        applicant_id: applicant.id, programme_id: applicant.desired_programme_id,
        programme_name: prog?.name || applicant.desired_programme_name,
        intake_year: applicant.desired_intake_year, current_year: 1, current_semester: 'semester_1',
        enrollment_date: new Date().toISOString().slice(0, 10),
        status: 'pending_fees', fees_status: 'outstanding',
        customer_id: customer.id, customer_number: cnum
      });

      // 3. Update CRM Contact: upgrade type to 'student', link student & customer records
      if (applicant.contact_id) {
        await base44.entities.Contact.update(applicant.contact_id, {
          type: 'student',
          student_id: student.id,
          customer_id: customer.id,
          last_interaction: new Date().toISOString().slice(0, 10),
          notes: `Enrolled as student ${snum} — Customer ${cnum}`
        });
      }

      // 4. Close linked Opportunity as 'won'
      if (applicant.opportunity_id) {
        await base44.entities.Opportunity.update(applicant.opportunity_id, {
          status: 'won', stage: 'closed_won',
          customer_id: customer.id, customer_name: `${applicant.first_name} ${applicant.last_name}`
        });
      }

      // 5. Mark applicant as enrolled
      await base44.entities.Applicant.update(applicant.id, { ...applicant, status: 'enrolled' });
      return student;
    },
    onSuccess: () => {
      qc.invalidateQueries(['applicants']); qc.invalidateQueries(['students']);
      qc.invalidateQueries(['contacts']); qc.invalidateQueries(['opportunities']);
      toast({ title: 'Applicant enrolled as student', description: 'Customer, Contact and Opportunity records updated.' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Applicant.delete(id),
    onSuccess: () => { qc.invalidateQueries(['applicants']); setDeleteTarget(null); }
  });

  const updateStatus = (app, status) => mutation.mutate({ ...app, status });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const counts = { all: applicants.length, submitted: applicants.filter(a => a.status === 'submitted').length, shortlisted: applicants.filter(a => a.status === 'shortlisted').length, accepted: applicants.filter(a => a.status === 'accepted').length };
  const filtered = applicants.filter(a => {
    const byTab = tab === 'all' || a.status === tab;
    const q = search.toLowerCase();
    return byTab && `${a.first_name} ${a.last_name} ${a.email} ${a.application_number || ''} ${a.desired_programme_name || ''}`.toLowerCase().includes(q);
  });

  const columns = [
    { header: 'Applicant', render: r => <div><p className="font-medium">{r.first_name} {r.last_name}</p><p className="text-xs text-muted-foreground">{r.application_number} · {r.email}</p></div> },
    { header: 'Programme', render: r => <span className="text-sm">{r.desired_programme_name || '—'}</span> },
    { header: 'Intake', render: r => <span className="text-sm">{r.desired_intake_year || '—'}</span> },
    { header: 'HS GPA', render: r => <span className="text-sm font-medium">{r.high_school_gpa || '—'}</span> },
    { header: 'Applied', render: r => <span className="text-sm">{r.application_date ? format(new Date(r.application_date), 'MMM d, yyyy') : '—'}</span> },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-1 flex-wrap">
          {r.status === 'submitted' && <Button size="sm" variant="ghost" title="Shortlist" onClick={e => { e.stopPropagation(); updateStatus(r, 'shortlisted'); }}><Badge variant="secondary" className="text-xs">Shortlist</Badge></Button>}
          {r.status === 'shortlisted' && <>
            <Button size="sm" variant="ghost" className="text-emerald-600" title="Accept" onClick={e => { e.stopPropagation(); updateStatus(r, 'accepted'); }}><CheckCircle className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" className="text-red-500" title="Reject" onClick={e => { e.stopPropagation(); updateStatus(r, 'rejected'); }}><XCircle className="w-3.5 h-3.5" /></Button>
          </>}
          {r.status === 'accepted' && <Button size="sm" variant="ghost" className="text-primary" title="Enroll as Student" onClick={e => { e.stopPropagation(); enrollMutation.mutate(r); }}><UserCheck className="w-3.5 h-3.5" /></Button>}
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setForm(r); setDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <PageHeader title="Admissions" subtitle="Manage student applications and enrolment" actionLabel="New Application" onAction={() => { setForm(defaultApp); setDialog(true); }} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[{ label: 'Total Applications', value: counts.all }, { label: 'Pending Review', value: counts.submitted }, { label: 'Shortlisted', value: counts.shortlisted }, { label: 'Accepted', value: counts.accepted }].map(s => (
          <Card key={s.label}><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="submitted">Submitted</TabsTrigger>
            <TabsTrigger value="under_review">Under Review</TabsTrigger>
            <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="enrolled">Enrolled</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search applicants..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 && !isLoading
            ? <EmptyState icon={UserPlus} title="No applications" description="Add a new application to get started." actionLabel="New Application" onAction={() => { setForm(defaultApp); setDialog(true); }} />
            : <DataTable columns={columns} data={filtered} isLoading={isLoading} />}
        </TabsContent>
      </Tabs>

      <FormDialog open={dialog} onOpenChange={setDialog} title={form.id ? 'Edit Application' : 'New Application'} onSubmit={() => mutation.mutate(form)} isSubmitting={mutation.isPending} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" value={form.first_name} onChange={v => set('first_name', v)} required />
          <FormField label="Last Name" value={form.last_name} onChange={v => set('last_name', v)} required />
          <FormField label="Email" type="email" value={form.email} onChange={v => set('email', v)} required />
          <FormField label="Phone" value={form.phone} onChange={v => set('phone', v)} />
          <FormField label="Date of Birth" type="date" value={form.date_of_birth} onChange={v => set('date_of_birth', v)} />
          <FormField label="Gender" type="select" value={form.gender} onChange={v => set('gender', v)} options={['male','female','other','prefer_not_to_say'].map(g => ({ value: g, label: g.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
          <FormField label="Nationality" value={form.nationality} onChange={v => set('nationality', v)} />
          <FormField label="National ID" value={form.national_id} onChange={v => set('national_id', v)} />
          <FormField label="High School" value={form.high_school_name} onChange={v => set('high_school_name', v)} />
          <FormField label="Graduation Year" value={form.high_school_graduation_year} onChange={v => set('high_school_graduation_year', v)} />
          <FormField label="HS GPA" type="number" value={form.high_school_gpa} onChange={v => set('high_school_gpa', v)} />
          <FormField label="Desired Programme" type="select" value={form.desired_programme_id} onChange={v => { const p = programmes.find(x => x.id === v); setForm(f => ({ ...f, desired_programme_id: v, desired_programme_name: p?.name || '' })); }} options={programmes.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }))} />
          <FormField label="Intake Year" value={form.desired_intake_year} onChange={v => set('desired_intake_year', v)} />
          <FormField label="Application Date" type="date" value={form.application_date} onChange={v => set('application_date', v)} />
          <FormField label="Status" type="select" value={form.status} onChange={v => set('status', v)} options={['submitted','under_review','shortlisted','accepted','rejected','waitlisted','enrolled'].map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
          <FormField label="Interview Date" type="date" value={form.interview_date} onChange={v => set('interview_date', v)} />
          <FormField label="Admission Score" type="number" value={form.admission_score} onChange={v => set('admission_score', v)} />
          <FormField label="Notes" type="textarea" value={form.notes} onChange={v => set('notes', v)} className="col-span-2" />
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Application?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}