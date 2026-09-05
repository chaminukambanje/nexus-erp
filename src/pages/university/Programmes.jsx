import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { BookOpen, Pencil, Trash2, Search, List, Link, Sparkles, Landmark, GraduationCap, ShieldCheck } from 'lucide-react';
import { MIT_GIR_REQUIREMENTS, MIT_COURSES } from '@/lib/academicUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const defaultProg = { code: '', name: '', faculty: '', department: '', degree_type: 'bachelors', duration_value: 4, duration_unit: 'years', total_credits: 120, credits_per_year: 30, pass_mark: 50, distinction_mark: 75, min_progression_average: 50, max_failed_modules: 2, status: 'active', max_capacity: 100 };
const defaultCourse = { code: '', name: '', year_level: 1, semester: 'semester_1', credits: 15, type: 'compulsory', pass_mark: 50, coursework_weight: 40, exam_weight: 60, status: 'active' };

export default function Programmes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [progDialog, setProgDialog] = useState(false);
  const [courseDialog, setCourseDialog] = useState(false);
  const [progForm, setProgForm] = useState(defaultProg);
  const [courseForm, setCourseForm] = useState(defaultCourse);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedProg, setSelectedProg] = useState(null);
  // Assign-courses-to-programme state
  const [assignDialog, setAssignDialog] = useState(null); // programme record
  const [assignedIds, setAssignedIds] = useState(new Set());
  const [assigning, setAssigning] = useState(false);

  const { data: programmes = [], isLoading } = useQuery({ queryKey: ['programmes'], queryFn: () => base44.entities.Programme.list() });
  const { data: courses = [], isLoading: coursesLoading } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });

  const progMutation = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Programme.update(data.id, data) : base44.entities.Programme.create(data),
    onSuccess: () => { qc.invalidateQueries(['programmes']); setProgDialog(false); setProgForm(defaultProg); }
  });

  const courseMutation = useMutation({
    mutationFn: (data) => {
      const prog = programmes.find(p => p.id === data.programme_id);
      const payload = { ...data, programme_name: prog?.name || data.programme_name || '' };
      return data.id ? base44.entities.Course.update(data.id, payload) : base44.entities.Course.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(['courses']); setCourseDialog(false); setCourseForm(defaultCourse); }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }) => type === 'programme' ? base44.entities.Programme.delete(id) : base44.entities.Course.delete(id),
    onSuccess: () => { qc.invalidateQueries(['programmes']); qc.invalidateQueries(['courses']); setDeleteTarget(null); }
  });

  const setP = (k, v) => setProgForm(f => ({ ...f, [k]: v }));
  const setC = (k, v) => setCourseForm(f => ({ ...f, [k]: v }));

  const openAssignDialog = (prog) => {
    const currentIds = new Set(courses.filter(c => c.programme_id === prog.id).map(c => c.id));
    setAssignedIds(currentIds);
    setAssignDialog(prog);
  };

  const toggleCourse = (courseId) => {
    setAssignedIds(prev => {
      const next = new Set(prev);
      next.has(courseId) ? next.delete(courseId) : next.add(courseId);
      return next;
    });
  };

  const saveAssignments = async () => {
    setAssigning(true);
    const prog = assignDialog;
    const prev = new Set(courses.filter(c => c.programme_id === prog.id).map(c => c.id));

    // Courses to assign (newly checked)
    const toAssign = courses.filter(c => assignedIds.has(c.id) && !prev.has(c.id));
    // Courses to unassign (unchecked)
    const toUnassign = courses.filter(c => !assignedIds.has(c.id) && prev.has(c.id));

    await Promise.all([
      ...toAssign.map(c => base44.entities.Course.update(c.id, { ...c, programme_id: prog.id, programme_name: prog.name })),
      ...toUnassign.map(c => base44.entities.Course.update(c.id, { ...c, programme_id: '', programme_name: '' })),
    ]);

    qc.invalidateQueries(['courses']);
    toast({ title: `Assignments saved`, description: `${toAssign.length} added, ${toUnassign.length} removed from ${prog.name}.` });
    setAssignDialog(null);
    setAssigning(false);
  };

  const filtered = programmes.filter(p => `${p.code} ${p.name} ${p.faculty || ''} ${p.department || ''}`.toLowerCase().includes(search.toLowerCase()));
  const displayedCourses = selectedProg ? courses.filter(c => c.programme_id === selectedProg) : courses;

  const progColumns = [
    { header: 'Programme', render: r => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.code} · {r.faculty || '—'}</p></div> },
    { header: 'Degree', render: r => <span className="capitalize text-sm">{(r.degree_type || '').replace(/_/g, ' ')}</span> },
    { header: 'Duration', render: r => <span className="text-sm">{r.duration_value || r.duration_years || 0} {r.duration_unit === 'semesters' ? 'semesters' : 'yrs'} · {r.total_credits} credits</span> },
    { header: 'Pass Mark', render: r => <span className="text-sm">{r.pass_mark}%</span> },
    { header: 'Progression Min', render: r => <span className="text-sm">{r.min_progression_average}% avg / max {r.max_failed_modules} fails</span> },
    { header: 'Courses', render: r => <Badge variant="secondary">{courses.filter(c => c.programme_id === r.id).length}</Badge> },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" title="View courses" onClick={e => { e.stopPropagation(); setSelectedProg(selectedProg === r.id ? null : r.id); }}><List className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" title="Assign courses" onClick={e => { e.stopPropagation(); openAssignDialog(r); }}><Link className="w-3.5 h-3.5 text-indigo-600" /></Button>
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setProgForm(r); setProgDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'programme', id: r.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  const courseColumns = [
    { header: 'Course', render: r => <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.code}</p></div> },
    { header: 'Programme', render: r => <span className="text-sm">{r.programme_name || programmes.find(p => p.id === r.programme_id)?.name || '—'}</span> },
    { header: 'Year', render: r => <span className="text-sm">Year {r.year_level}</span> },
    { header: 'Semester', render: r => <span className="text-sm capitalize">{(r.semester || '').replace(/_/g, ' ')}</span> },
    { header: 'Credits', render: r => <span className="text-sm font-medium">{r.credits}</span> },
    { header: 'CW/Exam', render: r => <span className="text-sm">{r.coursework_weight}% / {r.exam_weight}%</span> },
    { header: 'Type', render: r => <Badge variant={r.type === 'compulsory' ? 'default' : 'secondary'} className="capitalize">{r.type}</Badge> },
    { header: 'Lecturer', render: r => <span className="text-sm">{r.lecturer || '—'}</span> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setCourseForm(r); setCourseDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'course', id: r.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <PageHeader title="Programmes & Courses" subtitle="Define academic programmes and their course structure">
        <Button variant="outline" onClick={() => { setCourseForm(defaultCourse); setCourseDialog(true); }}>Add Course</Button>
        <Button onClick={() => { setProgForm(defaultProg); setProgDialog(true); }}>New Programme</Button>
      </PageHeader>

      <Tabs defaultValue="programmes">
        <TabsList>
          <TabsTrigger value="programmes">Programmes ({programmes.length})</TabsTrigger>
          <TabsTrigger value="courses">Subjects & Courses ({courses.length})</TabsTrigger>
          <TabsTrigger value="mit_curriculum" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> MIT GIR & Course Departments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="programmes" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search programmes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {filtered.length === 0 && !isLoading
            ? <EmptyState icon={BookOpen} title="No programmes" description="Create your first academic programme." actionLabel="New Programme" onAction={() => { setProgForm(defaultProg); setProgDialog(true); }} />
            : <DataTable columns={progColumns} data={filtered} isLoading={isLoading} />}
        </TabsContent>

        <TabsContent value="courses" className="mt-4 space-y-4">
          {selectedProg && <p className="text-sm text-muted-foreground">Showing courses for: <strong>{programmes.find(p => p.id === selectedProg)?.name}</strong> <Button variant="link" size="sm" onClick={() => setSelectedProg(null)}>Show All</Button></p>}
          <DataTable columns={courseColumns} data={displayedCourses} isLoading={coursesLoading} emptyMessage="No courses yet" />
        </TabsContent>

        <TabsContent value="mit_curriculum" className="mt-4 space-y-6">
          {/* General Institute Requirements Overview */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    MIT General Institute Requirements (GIR) Master Framework
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    17 compulsory undergraduate subjects forming the core intellectual foundation of an MIT education
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  17 Institute Requirements
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {MIT_GIR_REQUIREMENTS.map(gir => (
                  <div key={gir.id} className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary">{gir.code}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{gir.category}</Badge>
                    </div>
                    <p className="font-medium text-foreground">{gir.name}</p>
                    <p className="text-[11px] text-muted-foreground">Units: {gir.units} · Required for all S.B. degrees</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* MIT Course Major Academic Departments */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary" />
                MIT Course Departments (Course 1 – Course 24)
              </CardTitle>
              <CardDescription className="text-xs">
                Undergraduate degree programs awarding the Scientiae Baccalaureus (S.B.) upon completion of 180+ major units
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MIT_COURSES.map(course => (
                  <div key={course.code} className="p-3 rounded-lg border bg-card text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground font-mono">{course.code}</span>
                      <Badge variant="outline" className="text-[10px]">{course.degree}</Badge>
                    </div>
                    <p className="font-semibold text-primary">{course.name}</p>
                    <p className="text-[11px] text-muted-foreground">Department: {course.department}</p>
                    <p className="text-[11px] text-muted-foreground">Required Major Units: {course.required_major_units} Units</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Programme Dialog */}
      <FormDialog open={progDialog} onOpenChange={setProgDialog} title={progForm.id ? 'Edit Programme' : 'New Programme'} onSubmit={() => progMutation.mutate(progForm)} isSubmitting={progMutation.isPending} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Programme Code" value={progForm.code} onChange={v => setP('code', v)} required />
          <FormField label="Programme Name" value={progForm.name} onChange={v => setP('name', v)} required />
          <FormField label="Faculty" value={progForm.faculty} onChange={v => setP('faculty', v)} />
          <FormField label="Department" value={progForm.department} onChange={v => setP('department', v)} />
          <FormField label="Degree Type" type="select" value={progForm.degree_type} onChange={v => setP('degree_type', v)} options={['certificate','diploma','bachelors','honours','postgrad_diploma','masters','phd'].map(d => ({ value: d, label: d.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
          <FormField label="Status" type="select" value={progForm.status} onChange={v => setP('status', v)} options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'discontinued',label:'Discontinued'}]} />
          <FormField label="Duration Unit" type="select" value={progForm.duration_unit || 'years'} onChange={v => setP('duration_unit', v)} options={[{value:'years',label:'Years'},{value:'semesters',label:'Semesters'}]} />
          <FormField label="Duration" type="number" value={progForm.duration_value ?? progForm.duration_years ?? 4} onChange={v => setP('duration_value', v)} />
          <FormField label="Total Credits" type="number" value={progForm.total_credits} onChange={v => setP('total_credits', v)} />
          <FormField label="Credits Per Year" type="number" value={progForm.credits_per_year} onChange={v => setP('credits_per_year', v)} />
          <FormField label="Max Capacity" type="number" value={progForm.max_capacity} onChange={v => setP('max_capacity', v)} />
          <FormField label="Pass Mark (%)" type="number" value={progForm.pass_mark} onChange={v => setP('pass_mark', v)} />
          <FormField label="Distinction Mark (%)" type="number" value={progForm.distinction_mark} onChange={v => setP('distinction_mark', v)} />
          <FormField label="Min Progression Average (%)" type="number" value={progForm.min_progression_average} onChange={v => setP('min_progression_average', v)} />
          <FormField label="Max Failed Modules (Progression)" type="number" value={progForm.max_failed_modules} onChange={v => setP('max_failed_modules', v)} />
          <FormField label="Description" type="textarea" value={progForm.description} onChange={v => setP('description', v)} className="col-span-2" />
        </div>
      </FormDialog>

      {/* Course Dialog */}
      <FormDialog open={courseDialog} onOpenChange={setCourseDialog} title={courseForm.id ? 'Edit Course' : 'New Course'} onSubmit={() => courseMutation.mutate(courseForm)} isSubmitting={courseMutation.isPending} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Course Code" value={courseForm.code} onChange={v => setC('code', v)} required />
          <FormField label="Course Name" value={courseForm.name} onChange={v => setC('name', v)} required />
          <FormField label="Programme" type="select" value={courseForm.programme_id || ''} onChange={v => setC('programme_id', v)} options={programmes.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }))} />
          <FormField label="Year Level" type="number" value={courseForm.year_level} onChange={v => setC('year_level', v)} />
          <FormField label="Semester" type="select" value={courseForm.semester} onChange={v => setC('semester', v)} options={['semester_1','semester_2','full_year','trimester_1','trimester_2','trimester_3'].map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} />
          <FormField label="Credits" type="number" value={courseForm.credits} onChange={v => setC('credits', v)} />
          <FormField label="Type" type="select" value={courseForm.type} onChange={v => setC('type', v)} options={[{value:'compulsory',label:'Compulsory'},{value:'elective',label:'Elective'},{value:'optional',label:'Optional'}]} />
          <FormField label="Lecturer" value={courseForm.lecturer} onChange={v => setC('lecturer', v)} />
          <FormField label="Pass Mark (%)" type="number" value={courseForm.pass_mark} onChange={v => setC('pass_mark', v)} />
          <FormField label="Coursework Weight (%)" type="number" value={courseForm.coursework_weight} onChange={v => setC('coursework_weight', v)} />
          <FormField label="Exam Weight (%)" type="number" value={courseForm.exam_weight} onChange={v => setC('exam_weight', v)} />
          <FormField label="Status" type="select" value={courseForm.status} onChange={v => setC('status', v)} options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]} />
          <FormField label="Description" type="textarea" value={courseForm.description} onChange={v => setC('description', v)} className="col-span-2" />
        </div>
      </FormDialog>

      {/* ── Assign Courses to Programme Dialog ── */}
      {assignDialog && (
        <FormDialog
          open={!!assignDialog}
          onOpenChange={() => setAssignDialog(null)}
          title={`Assign Courses — ${assignDialog.name}`}
          onSubmit={saveAssignments}
          isSubmitting={assigning}
          submitLabel="Save Assignments"
          size="lg"
        >
          <p className="text-sm text-muted-foreground mb-3">
            Check each course to assign it to <strong>{assignDialog.name}</strong>. Unchecking will remove it from this programme.
          </p>

          {/* Group by: already assigned, then unassigned */}
          {['assigned', 'unassigned'].map(group => {
            const groupCourses = group === 'assigned'
              ? courses.filter(c => c.programme_id === assignDialog.id)
              : courses.filter(c => !c.programme_id || c.programme_id === '');
            if (groupCourses.length === 0) return null;
            return (
              <div key={group} className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {group === 'assigned' ? `Currently Assigned (${groupCourses.length})` : `Unassigned Courses (${groupCourses.length})`}
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {groupCourses.map(c => (
                    <label key={c.id} className={`flex items-center justify-between gap-3 p-2.5 border rounded-lg cursor-pointer hover:bg-muted/30 ${assignedIds.has(c.id) ? 'border-indigo-300 bg-indigo-50/40' : 'border-border'}`}>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={assignedIds.has(c.id)}
                          onCheckedChange={() => toggleCourse(c.id)}
                          id={`ac-${c.id}`}
                        />
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.code} · Year {c.year_level} · {(c.semester || '').replace(/_/g, ' ')} · {c.credits} credits</p>
                        </div>
                      </div>
                      <Badge variant={c.type === 'compulsory' ? 'default' : 'secondary'} className="text-xs capitalize shrink-0">{c.type}</Badge>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Courses assigned to OTHER programmes */}
          {(() => {
            const otherProg = courses.filter(c => c.programme_id && c.programme_id !== assignDialog.id && c.programme_id !== '');
            if (otherProg.length === 0) return null;
            return (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Assigned to Other Programmes ({otherProg.length})</p>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {otherProg.map(c => (
                    <label key={c.id} className={`flex items-center justify-between gap-3 p-2.5 border rounded-lg cursor-pointer hover:bg-muted/30 ${assignedIds.has(c.id) ? 'border-amber-300 bg-amber-50/40' : 'border-border opacity-70'}`}>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={assignedIds.has(c.id)}
                          onCheckedChange={() => toggleCourse(c.id)}
                          id={`ac-${c.id}`}
                        />
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.code} · currently in <em>{c.programme_name}</em></p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 shrink-0">Reassign</Badge>
                    </label>
                  ))}
                </div>
              </div>
            );
          })()}
        </FormDialog>
      )}

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