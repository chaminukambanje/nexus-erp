import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { GraduationCap, Pencil, Trash2, Search, BookOpen, Plus, UserCheck, AlertCircle, CheckCircle, Ban, Receipt, Workflow, Landmark, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import CustomerSalesPanel from '@/components/sales/CustomerSalesPanel';
import BulkActionsToolbar from '@/components/students/BulkActionsToolbar';
import BulkProgrammeDialog from '@/components/students/BulkProgrammeDialog';
import BulkSemesterDialog from '@/components/students/BulkSemesterDialog';
import BulkBillingDialog from '@/components/students/BulkBillingDialog';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const UNDERGRAD_TYPES = ['certificate', 'diploma', 'bachelors', 'honours'];
const POSTGRAD_TYPES = ['postgrad_diploma', 'masters', 'phd'];

const defaultStudent = {
  first_name: '', last_name: '', email: '', phone: '', gender: 'male',
  current_year: 1, current_semester: 'semester_1',
  status: 'pending_fees', fees_status: 'outstanding', outstanding_balance: 0,
  cumulative_gpa: 0, total_credits_earned: 0
};

const STATUS_META = {
  enrolled:       { label: 'Enrolled',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  pending_fees:   { label: 'Pending Fees',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  blocked:        { label: 'Blocked',        color: 'bg-red-100 text-red-700 border-red-200' },
  suspended:      { label: 'Suspended',      color: 'bg-orange-100 text-orange-700 border-orange-200' },
  deferred:       { label: 'Deferred',       color: 'bg-blue-100 text-blue-700 border-blue-200' },
  withdrawn:      { label: 'Withdrawn',      color: 'bg-gray-100 text-gray-600 border-gray-200' },
  graduated:      { label: 'Graduated',      color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  excluded:       { label: 'Excluded',       color: 'bg-red-200 text-red-800 border-red-300' },
};

function StudentStatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${meta.color}`}>{meta.label}</span>;
}

export default function Students() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(defaultStudent);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [progEnrolDialog, setProgEnrolDialog] = useState(null); // student
  const [progEnrolForm, setProgEnrolForm] = useState({ programme_id: '', intake_year: '', enrollment_date: new Date().toISOString().slice(0, 10) });
  const [courseEnrolDialog, setCourseEnrolDialog] = useState(null); // student
  const [courseEnrolForm, setCourseEnrolForm] = useState({ course_id: '', academic_year: new Date().getFullYear().toString(), semester: 'semester_1' });
  const [billingStudent, setBillingStudent] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProgramme, setBulkProgramme] = useState(false);
  const [bulkSemester, setBulkSemester] = useState(false);
  const [bulkBilling, setBulkBilling] = useState(false);

  const { data: students = [], isLoading } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list('-created_date', 500) });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes'], queryFn: () => base44.entities.Programme.list() });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: progEnrollments = [] } = useQuery({ queryKey: ['programmeEnrollments'], queryFn: () => base44.entities.ProgrammeEnrollment.list() });
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => base44.entities.Customer.list() });

  const undergradProgrammes = useMemo(() => programmes.filter(p => UNDERGRAD_TYPES.includes(p.degree_type)), [programmes]);
  const postgradProgrammes = useMemo(() => programmes.filter(p => POSTGRAD_TYPES.includes(p.degree_type)), [programmes]);

  // Student save/update
  const mutation = useMutation({
    mutationFn: (data) => {
      const num = data.student_number || `STU-${String(Date.now()).slice(-6)}`;
      return data.id
        ? base44.entities.Student.update(data.id, { ...data, student_number: num })
        : base44.entities.Student.create({ ...data, student_number: num });
    },
    onSuccess: async (savedStudent, data) => {
      // Auto-create a Customer record if not already linked
      if (!data.id && !data.customer_id) {
        const cnum = `CUST-STU-${String(Date.now()).slice(-6)}`;
        const customer = await base44.entities.Customer.create({
          customer_number: cnum, name: `${data.first_name} ${data.last_name}`,
          email: data.email, phone: data.phone,
          status: 'active', notes: `Student: ${savedStudent?.student_number || ''}`
        });
        await base44.entities.Student.update(savedStudent.id, { customer_id: customer.id, customer_number: cnum });
      }
      qc.invalidateQueries(['students']); qc.invalidateQueries(['customers']);
      setDialog(false); setForm(defaultStudent);
    }
  });

  // Enrol in a Programme
  const progEnrolMutation = useMutation({
    mutationFn: async ({ student, programmeId, intakeYear, enrollmentDate }) => {
      const prog = programmes.find(p => p.id === programmeId);
      const isUndergrad = UNDERGRAD_TYPES.includes(prog?.degree_type);

      // Enforce: only 1 active undergraduate programme
      if (isUndergrad) {
        const existing = progEnrollments.find(pe => pe.student_id === student.id && pe.programme_level === 'undergraduate' && pe.status === 'active');
        if (existing) throw new Error('Student already has an active undergraduate programme. Withdraw from current programme first.');
      }

      const pe = await base44.entities.ProgrammeEnrollment.create({
        student_id: student.id, student_name: `${student.first_name} ${student.last_name}`,
        student_number: student.student_number, programme_id: programmeId,
        programme_code: prog?.code || '', programme_name: prog?.name || '',
        programme_level: isUndergrad ? 'undergraduate' : 'postgraduate',
        intake_year: intakeYear, enrollment_date: enrollmentDate,
        current_year: 1, status: 'active'
      });

      // Update student's primary programme reference
      const updatePayload = { programme_id: programmeId, programme_name: prog?.name || '', status: 'enrolled' };
      if (isUndergrad) {
        updatePayload.undergraduate_programme_id = programmeId;
        updatePayload.undergraduate_programme_name = prog?.name || '';
        updatePayload.intake_year = intakeYear;
      } else {
        const existingIds = student.postgraduate_programme_ids || [];
        const existingNames = student.postgraduate_programme_names || [];
        updatePayload.postgraduate_programme_ids = [...existingIds, programmeId];
        updatePayload.postgraduate_programme_names = [...existingNames, prog?.name || ''];
      }
      await base44.entities.Student.update(student.id, { ...student, ...updatePayload });
      return pe;
    },
    onSuccess: () => {
      qc.invalidateQueries(['programmeEnrollments']); qc.invalidateQueries(['students']);
      setProgEnrolDialog(null);
      toast({ title: 'Programme enrollment successful' });
    },
    onError: (err) => toast({ title: 'Enrollment failed', description: err.message, variant: 'destructive' })
  });

  // Enrol in a Course
  const courseEnrolMutation = useMutation({
    mutationFn: async ({ student, courseId, academicYear, semester }) => {
      const course = courses.find(c => c.id === courseId);
      return base44.entities.Enrollment.create({
        student_id: student.id, student_name: `${student.first_name} ${student.last_name}`,
        student_number: student.student_number, course_id: courseId,
        course_code: course?.code || '', course_name: course?.name || '',
        programme_id: course?.programme_id || student.programme_id,
        academic_year: academicYear, semester, year_level: student.current_year,
        status: 'enrolled', result: 'pending'
      });
    },
    onSuccess: () => { qc.invalidateQueries(['enrollments']); setCourseEnrolDialog(null); toast({ title: 'Course enrollment successful' }); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Student.delete(id),
    onSuccess: () => { qc.invalidateQueries(['students']); setDeleteTarget(null); }
  });

  // Quick status change
  const setStudentStatus = (student, newStatus) => {
    base44.entities.Student.update(student.id, { ...student, status: newStatus }).then(() => qc.invalidateQueries(['students']));
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const getStudentProgrammes = (student) => {
    return progEnrollments.filter(pe => pe.student_id === student.id && pe.status === 'active');
  };

  const filtered = students.filter(s => {
    const matchesSearch = `${s.first_name} ${s.last_name} ${s.student_number || ''} ${s.email} ${s.programme_name || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getGpaColor = (gpa) => gpa >= 3.5 ? 'text-emerald-600' : gpa >= 2.5 ? 'text-blue-600' : gpa >= 1.5 ? 'text-yellow-600' : 'text-red-600';

  const selectedStudents = students.filter(s => selectedIds.has(s.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));

  const toggleStudent = (id, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };
  const toggleAll = (checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) filtered.forEach(s => next.add(s.id));
      else filtered.forEach(s => next.delete(s.id));
      return next;
    });
  };

  const columns = [
    {
      header: <Checkbox checked={allFilteredSelected} onCheckedChange={toggleAll} aria-label="Select all" />,
      render: r => <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={c => toggleStudent(r.id, c)} onClick={e => e.stopPropagation()} aria-label="Select student" />,
    },
    {
      header: 'Student',
      render: r => (
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-foreground">{r.first_name} {r.last_name}</p>
            {r.urop_active && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-500/10 text-purple-600 border-purple-300">
                UROP
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {r.mit_id ? (
              <span className="font-mono text-[11px]">MIT ID: {r.mit_id} · {r.kerberos_id ? `@${r.kerberos_id}` : r.email}</span>
            ) : (
              <span>{r.student_number} · {r.email}</span>
            )}
          </p>
        </div>
      )
    },
    {
      header: 'Course / Major',
      render: r => {
        const isMit = !!(r.mit_id || r.kerberos_id);
        if (isMit) {
          return (
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-foreground block">{r.declared_major || r.programme_name || 'Course 0 (Undeclared)'}</span>
              <div className="flex items-center gap-1 flex-wrap">
                {r.stage_label && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/60 text-muted-foreground">
                    {r.stage_label.split(':')[0]}
                  </Badge>
                )}
                {r.cap_standing && (
                  <Badge variant="outline" className={cn(
                    "text-[10px] px-1 py-0",
                    r.cap_standing === 'good_standing' && "bg-emerald-500/10 text-emerald-600 border-emerald-300",
                    r.cap_standing === 'dean_list' && "bg-indigo-500/10 text-indigo-600 border-indigo-300",
                    r.cap_standing === 'cap_warning' && "bg-amber-500/10 text-amber-600 border-amber-300"
                  )}>
                    {r.cap_standing === 'good_standing' ? 'Good Standing' : (r.cap_standing === 'dean_list' ? "Dean's List" : 'CAP Warning')}
                  </Badge>
                )}
              </div>
            </div>
          );
        }
        const stuProgs = getStudentProgrammes(r);
        if (stuProgs.length === 0) return <span className="text-xs text-muted-foreground">Not enrolled</span>;
        return (
          <div className="space-y-0.5">
            {stuProgs.map(pe => (
              <div key={pe.id} className="flex items-center gap-1">
                <Badge variant={pe.programme_level === 'undergraduate' ? 'default' : 'secondary'} className="text-xs">{pe.programme_level === 'undergraduate' ? 'UG' : 'PG'}</Badge>
                <span className="text-xs">{pe.programme_name}</span>
              </div>
            ))}
          </div>
        );
      }
    },
    { header: 'Year', render: r => <span className="text-sm">Year {r.current_year}</span> },
    {
      header: 'Fees',
      render: r => (
        <div>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${r.fees_status === 'paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : r.fees_status === 'overdue' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
            {(r.fees_status || 'outstanding').replace(/_/g, ' ').toUpperCase()}
          </span>
          {r.outstanding_balance > 0 && <p className="text-xs text-red-600 mt-0.5">Owes ${(r.outstanding_balance).toLocaleString()}</p>}
        </div>
      )
    },
    {
      header: 'GPA / Rating',
      render: r => {
        const isMit = !!(r.mit_id || r.kerberos_id);
        const gpa = (r.cumulative_gpa || 0).toFixed(2);
        return (
          <div>
            <span className={`font-bold ${getGpaColor(r.cumulative_gpa || 0)}`}>{gpa}</span>
            {isMit && <span className="text-[10px] text-muted-foreground block">5.0 Scale</span>}
          </div>
        );
      }
    },
    { header: 'Status', render: r => <StudentStatusBadge status={r.status} /> },
    {
      header: 'Actions',
      render: r => (
        <div className="flex gap-1 flex-wrap items-center">
          <Button asChild size="sm" variant="ghost" className="text-primary h-7 px-1.5" title="Manage in MIT Student Lifecycle">
            <Link to="/university/lifecycle">
              <Workflow className="w-3.5 h-3.5 mr-1" />
              <span className="text-[11px]">Lifecycle</span>
            </Link>
          </Button>
          {r.status === 'blocked' && <Button size="sm" variant="ghost" className="text-emerald-600" title="Unblock" onClick={e => { e.stopPropagation(); setStudentStatus(r, 'enrolled'); }}><CheckCircle className="w-3.5 h-3.5" /></Button>}
          {r.status === 'enrolled' && <Button size="sm" variant="ghost" className="text-red-500" title="Block (fees)" onClick={e => { e.stopPropagation(); setStudentStatus(r, 'blocked'); }}><Ban className="w-3.5 h-3.5" /></Button>}
          <Button size="sm" variant="ghost" title="Enrol in Programme" onClick={e => { e.stopPropagation(); setProgEnrolDialog(r); setProgEnrolForm({ programme_id: '', intake_year: new Date().getFullYear().toString(), enrollment_date: new Date().toISOString().slice(0, 10) }); }}><GraduationCap className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" title="Enrol in Course" onClick={e => { e.stopPropagation(); setCourseEnrolDialog(r); setCourseEnrolForm({ course_id: '', academic_year: new Date().getFullYear().toString(), semester: r.current_semester || 'semester_1' }); }}><BookOpen className="w-3.5 h-3.5" /></Button>
          {r.customer_id && <Button size="sm" variant="ghost" title="Billing" onClick={e => { e.stopPropagation(); setBillingStudent(r); }}><Receipt className="w-3.5 h-3.5 text-indigo-600" /></Button>}
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setForm(r); setDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  const stats = [
    { label: 'Total Students', value: students.length },
    { label: 'Enrolled', value: students.filter(s => s.status === 'enrolled').length },
    { label: 'Blocked / Pending Fees', value: students.filter(s => ['blocked','pending_fees'].includes(s.status)).length },
    { label: 'Graduated', value: students.filter(s => s.status === 'graduated').length },
  ];

  // Courses available for a student based on their active programme enrollments
  const getCoursesForStudent = (student) => {
    const stuProgIds = progEnrollments.filter(pe => pe.student_id === student?.id && pe.status === 'active').map(pe => pe.programme_id);
    if (stuProgIds.length === 0 && student?.programme_id) stuProgIds.push(student.programme_id);
    return courses.filter(c => stuProgIds.includes(c.programme_id));
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <PageHeader title="Students" subtitle="Manage enrolled students, programme allocations and fee status" actionLabel="New Student" onAction={() => { setForm(defaultStudent); setDialog(true); }} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => <Card key={s.label}><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-1">{s.value}</p></CardContent></Card>)}
      </div>

      {/* Fees alert banner */}
      {students.filter(s => s.status === 'blocked').length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span><strong>{students.filter(s => s.status === 'blocked').length} student(s)</strong> are blocked due to outstanding fees.</span>
        </div>
      )}

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['all', 'enrolled', 'pending_fees', 'blocked', 'suspended', 'graduated'].map(s => (
            <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)} className="capitalize text-xs">
              {s === 'all' ? 'All' : STATUS_META[s]?.label || s}
            </Button>
          ))}
        </div>
      </div>

      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        onAssignProgramme={() => setBulkProgramme(true)}
        onUpdateSemester={() => setBulkSemester(true)}
        onProcessBilling={() => setBulkBilling(true)}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {filtered.length === 0 && !isLoading
        ? <EmptyState icon={GraduationCap} title="No students found" description="Students are created from accepted applications or manually." actionLabel="New Student" onAction={() => { setForm(defaultStudent); setDialog(true); }} />
        : <DataTable columns={columns} data={filtered} isLoading={isLoading} />}

      {/* ── Student Form Dialog ── */}
      <FormDialog open={dialog} onOpenChange={setDialog} title={form.id ? 'Edit Student' : 'New Student'} onSubmit={() => mutation.mutate(form)} isSubmitting={mutation.isPending} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" value={form.first_name} onChange={v => set('first_name', v)} required />
          <FormField label="Last Name" value={form.last_name} onChange={v => set('last_name', v)} required />
          <FormField label="Email" type="email" value={form.email} onChange={v => set('email', v)} required />
          <FormField label="Phone" value={form.phone} onChange={v => set('phone', v)} />
          <FormField label="Date of Birth" type="date" value={form.date_of_birth} onChange={v => set('date_of_birth', v)} />
          <FormField label="Gender" type="select" value={form.gender} onChange={v => set('gender', v)} options={['male','female','other','prefer_not_to_say'].map(g => ({ value: g, label: g.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
          <FormField label="Nationality" value={form.nationality} onChange={v => set('nationality', v)} />
          <FormField label="National ID" value={form.national_id} onChange={v => set('national_id', v)} />
          <FormField label="Current Year Level" type="number" value={form.current_year} onChange={v => set('current_year', v)} />
          <FormField label="Current Semester" type="select" value={form.current_semester} onChange={v => set('current_semester', v)} options={['semester_1','semester_2','full_year'].map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
          <FormField label="Enrolment Status" type="select" value={form.status} onChange={v => set('status', v)} options={Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))} />
          <FormField label="Fees Status" type="select" value={form.fees_status} onChange={v => set('fees_status', v)} options={[{value:'paid',label:'Paid'},{value:'partial',label:'Partial'},{value:'outstanding',label:'Outstanding'},{value:'overdue',label:'Overdue'}]} />
          <FormField label="Outstanding Balance" type="number" value={form.outstanding_balance} onChange={v => set('outstanding_balance', v)} />
          <FormField label="Enrollment Date" type="date" value={form.enrollment_date} onChange={v => set('enrollment_date', v)} />
          <FormField label="Cumulative GPA" type="number" value={form.cumulative_gpa} onChange={v => set('cumulative_gpa', v)} />
          <FormField label="Credits Earned" type="number" value={form.total_credits_earned} onChange={v => set('total_credits_earned', v)} />
          <FormField label="Emergency Contact Name" value={form.emergency_contact_name} onChange={v => set('emergency_contact_name', v)} />
          <FormField label="Emergency Contact Phone" value={form.emergency_contact_phone} onChange={v => set('emergency_contact_phone', v)} />
          <FormField label="Notes" type="textarea" value={form.notes} onChange={v => set('notes', v)} className="col-span-2" />
        </div>
      </FormDialog>

      {/* ── Programme Enrolment Dialog ── */}
      {progEnrolDialog && (
        <FormDialog
          open={!!progEnrolDialog}
          onOpenChange={() => setProgEnrolDialog(null)}
          title={`Enrol ${progEnrolDialog.first_name} in a Programme`}
          onSubmit={() => progEnrolMutation.mutate({ student: progEnrolDialog, programmeId: progEnrolForm.programme_id, intakeYear: progEnrolForm.intake_year, enrollmentDate: progEnrolForm.enrollment_date })}
          isSubmitting={progEnrolMutation.isPending}
          submitLabel="Enrol"
          size="md"
        >
          <div className="space-y-1 mb-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <p><strong>Rule:</strong> A student may enrol in <strong>only 1 undergraduate</strong> programme (bachelor's, diploma, certificate, honours).</p>
            <p>A student may enrol in <strong>multiple postgraduate</strong> programmes (master's, PhD, postgrad diploma).</p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">Undergraduate Programmes</p>
              {undergradProgrammes.map(p => {
                const alreadyEnrolled = progEnrollments.some(pe => pe.student_id === progEnrolDialog.id && pe.programme_id === p.id && pe.status === 'active');
                const hasUG = progEnrollments.some(pe => pe.student_id === progEnrolDialog.id && pe.programme_level === 'undergraduate' && pe.status === 'active' && pe.programme_id !== p.id);
                return (
                  <label key={p.id} className={`flex items-center gap-2 p-2 rounded border mb-1 cursor-pointer ${progEnrolForm.programme_id === p.id ? 'border-primary bg-primary/5' : 'border-border'} ${(alreadyEnrolled || hasUG) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/40'}`}>
                    <input type="radio" name="programme" value={p.id} checked={progEnrolForm.programme_id === p.id} disabled={alreadyEnrolled || hasUG} onChange={() => setProgEnrolForm(f => ({ ...f, programme_id: p.id }))} />
                    <span className="text-sm font-medium">{p.code} — {p.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto capitalize">{p.degree_type}</Badge>
                    {alreadyEnrolled && <Badge variant="secondary" className="text-xs">Already Enrolled</Badge>}
                    {hasUG && !alreadyEnrolled && <Badge variant="destructive" className="text-xs">UG Limit Reached</Badge>}
                  </label>
                );
              })}
            </div>
            <div>
              <p className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">Postgraduate Programmes</p>
              {postgradProgrammes.map(p => {
                const alreadyEnrolled = progEnrollments.some(pe => pe.student_id === progEnrolDialog.id && pe.programme_id === p.id && pe.status === 'active');
                return (
                  <label key={p.id} className={`flex items-center gap-2 p-2 rounded border mb-1 cursor-pointer ${progEnrolForm.programme_id === p.id ? 'border-primary bg-primary/5' : 'border-border'} ${alreadyEnrolled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/40'}`}>
                    <input type="radio" name="programme" value={p.id} checked={progEnrolForm.programme_id === p.id} disabled={alreadyEnrolled} onChange={() => setProgEnrolForm(f => ({ ...f, programme_id: p.id }))} />
                    <span className="text-sm font-medium">{p.code} — {p.name}</span>
                    <Badge variant="secondary" className="text-xs ml-auto capitalize">{p.degree_type}</Badge>
                    {alreadyEnrolled && <Badge variant="secondary" className="text-xs">Already Enrolled</Badge>}
                  </label>
                );
              })}
              {postgradProgrammes.length === 0 && <p className="text-xs text-muted-foreground">No postgraduate programmes defined.</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FormField label="Intake Year" value={progEnrolForm.intake_year} onChange={v => setProgEnrolForm(f => ({ ...f, intake_year: v }))} />
            <FormField label="Enrollment Date" type="date" value={progEnrolForm.enrollment_date} onChange={v => setProgEnrolForm(f => ({ ...f, enrollment_date: v }))} />
          </div>
        </FormDialog>
      )}

      {/* ── Course Enrolment Dialog ── */}
      {courseEnrolDialog && (
        <FormDialog
          open={!!courseEnrolDialog}
          onOpenChange={() => setCourseEnrolDialog(null)}
          title={`Enrol ${courseEnrolDialog.first_name} in a Course`}
          onSubmit={() => courseEnrolMutation.mutate({ student: courseEnrolDialog, courseId: courseEnrolForm.course_id, academicYear: courseEnrolForm.academic_year, semester: courseEnrolForm.semester })}
          isSubmitting={courseEnrolMutation.isPending}
          submitLabel="Enrol"
        >
          <p className="text-xs text-muted-foreground mb-2">Showing courses from the student's enrolled programme(s).</p>
          <FormField label="Course" type="select" value={courseEnrolForm.course_id} onChange={v => setCourseEnrolForm(f => ({ ...f, course_id: v }))} options={getCoursesForStudent(courseEnrolDialog).map(c => ({ value: c.id, label: `${c.code} — ${c.name} (Year ${c.year_level})` }))} required />
          <FormField label="Academic Year" value={courseEnrolForm.academic_year} onChange={v => setCourseEnrolForm(f => ({ ...f, academic_year: v }))} />
          <FormField label="Semester" type="select" value={courseEnrolForm.semester} onChange={v => setCourseEnrolForm(f => ({ ...f, semester: v }))} options={['semester_1','semester_2','full_year'].map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
        </FormDialog>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Student?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkProgrammeDialog open={bulkProgramme} onOpenChange={setBulkProgramme} selectedStudents={selectedStudents} programmes={programmes} progEnrollments={progEnrollments} />
      <BulkSemesterDialog open={bulkSemester} onOpenChange={setBulkSemester} selectedStudents={selectedStudents} />
      <BulkBillingDialog open={bulkBilling} onOpenChange={setBulkBilling} selectedStudents={selectedStudents} programmes={programmes} />

      <Sheet open={!!billingStudent} onOpenChange={() => setBillingStudent(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Billing — {billingStudent?.first_name} {billingStudent?.last_name}</SheetTitle>
            <p className="text-xs text-muted-foreground">{billingStudent?.student_number} · {billingStudent?.email}</p>
          </SheetHeader>
          {billingStudent?.customer_id && (
            <CustomerSalesPanel customerId={billingStudent.customer_id} customerName={`${billingStudent.first_name} ${billingStudent.last_name}`} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}