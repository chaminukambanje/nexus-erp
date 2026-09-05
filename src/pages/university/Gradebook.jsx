import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/shared/PageHeader';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ClipboardList, Pencil, Trash2, Plus, Search, Save } from 'lucide-react';
import { format } from 'date-fns';

const defaultAssessment = { title: '', type: 'assignment', semester: 'semester_1', total_marks: 100, weight_percent: 10, status: 'upcoming' };

function calcGrade(score, passMark = 50) {
  if (score === null || score === undefined) return { grade: '—', points: 0, result: 'pending' };
  if (score >= 85) return { grade: 'A+', points: 4.0, result: 'distinction' };
  if (score >= 75) return { grade: 'A', points: 4.0, result: 'distinction' };
  if (score >= 70) return { grade: 'B+', points: 3.5, result: 'merit' };
  if (score >= 65) return { grade: 'B', points: 3.0, result: 'merit' };
  if (score >= 60) return { grade: 'C+', points: 2.5, result: 'pass' };
  if (score >= passMark) return { grade: 'C', points: 2.0, result: 'pass' };
  if (score >= 40) return { grade: 'D', points: 1.0, result: 'supplementary' };
  return { grade: 'F', points: 0.0, result: 'fail' };
}

export default function Gradebook() {
  const qc = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [assessDialog, setAssessDialog] = useState(false);
  const [assessForm, setAssessForm] = useState(defaultAssessment);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [gradeEdits, setGradeEdits] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: assessments = [], isLoading: assLoading } = useQuery({ queryKey: ['assessments'], queryFn: () => base44.entities.Assessment.list('-due_date', 500) });
  const { data: enrollments = [] } = useQuery({ queryKey: ['enrollments'], queryFn: () => base44.entities.Enrollment.list() });
  const { data: grades = [] } = useQuery({ queryKey: ['assessmentGrades'], queryFn: () => base44.entities.AssessmentGrade.list() });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });

  const assessMutation = useMutation({
    mutationFn: (data) => {
      const course = courses.find(c => c.id === data.course_id);
      const payload = { ...data, course_code: course?.code || '', course_name: course?.name || '', academic_year: selectedYear };
      return data.id ? base44.entities.Assessment.update(data.id, payload) : base44.entities.Assessment.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(['assessments']); setAssessDialog(false); setAssessForm(defaultAssessment); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Assessment.delete(id),
    onSuccess: () => { qc.invalidateQueries(['assessments']); setDeleteTarget(null); }
  });

  const setA = (k, v) => setAssessForm(f => ({ ...f, [k]: v }));

  const courseAssessments = useMemo(() => assessments.filter(a => a.course_id === selectedCourse), [assessments, selectedCourse]);
  const courseEnrollments = useMemo(() => enrollments.filter(e => e.course_id === selectedCourse && e.academic_year === selectedYear), [enrollments, selectedCourse, selectedYear]);

  // Build grade grid: rows = students, columns = assessments
  const gradeMap = useMemo(() => {
    const map = {};
    grades.forEach(g => { map[`${g.student_id}_${g.assessment_id}`] = g; });
    return map;
  }, [grades]);

  const saveGrades = async () => {
    setSaving(true);
    const ops = [];
    for (const [key, val] of Object.entries(gradeEdits)) {
      const [studentId, assessId] = key.split('_');
      const existing = gradeMap[`${studentId}_${assessId}`];
      const assessment = assessments.find(a => a.id === assessId);
      const student = students.find(s => s.id === studentId);
      const pct = assessment?.total_marks > 0 ? (val / assessment.total_marks) * 100 : 0;
      const payload = {
        assessment_id: assessId, assessment_title: assessment?.title || '',
        assessment_type: assessment?.type || '', student_id: studentId,
        student_name: student ? `${student.first_name} ${student.last_name}` : '',
        student_number: student?.student_number || '', course_id: selectedCourse,
        course_code: assessment?.course_code || '',
        marks_obtained: parseFloat(val), total_marks: assessment?.total_marks || 100,
        percentage: parseFloat(pct.toFixed(2)), graded_date: new Date().toISOString().slice(0, 10), status: 'graded'
      };
      if (existing) ops.push(base44.entities.AssessmentGrade.update(existing.id, payload));
      else ops.push(base44.entities.AssessmentGrade.create(payload));
    }
    await Promise.all(ops);

    // Recalculate enrollment final scores
    const enrollOps = courseEnrollments.map(async (enr) => {
      const course = courses.find(c => c.id === selectedCourse);
      const cwWeight = (course?.coursework_weight || 40) / 100;
      const examWeight = (course?.exam_weight || 60) / 100;
      const cwAssessments = courseAssessments.filter(a => a.type !== 'exam');
      const examAssessments = courseAssessments.filter(a => a.type === 'exam');
      const getCwScore = () => {
        const scores = cwAssessments.map(a => {
          const key = `${enr.student_id}_${a.id}`;
          const g = gradeMap[key] || grades.find(g => g.student_id === enr.student_id && g.assessment_id === a.id);
          return g ? g.percentage : null;
        }).filter(x => x !== null);
        return scores.length > 0 ? scores.reduce((s, x) => s + x, 0) / scores.length : null;
      };
      const getExamScore = () => {
        const scores = examAssessments.map(a => {
          const key = `${enr.student_id}_${a.id}`;
          const g = gradeMap[key] || grades.find(g => g.student_id === enr.student_id && g.assessment_id === a.id);
          return g ? g.percentage : null;
        }).filter(x => x !== null);
        return scores.length > 0 ? scores.reduce((s, x) => s + x, 0) / scores.length : null;
      };
      const cw = getCwScore(), exam = getExamScore();
      const passMark = course?.pass_mark || 50;
      let finalScore = null;
      if (cw !== null && exam !== null) finalScore = cw * cwWeight + exam * examWeight;
      else if (cw !== null) finalScore = cw;
      else if (exam !== null) finalScore = exam;
      if (finalScore === null) return;
      const { grade, points, result } = calcGrade(finalScore, passMark);
      await base44.entities.Enrollment.update(enr.id, { ...enr, coursework_score: cw, exam_score: exam, final_score: parseFloat(finalScore.toFixed(2)), grade, grade_points: points, result });
    });
    await Promise.all(enrollOps);

    qc.invalidateQueries(['assessmentGrades']); qc.invalidateQueries(['enrollments']);
    setGradeEdits({}); setSaving(false);
  };

  const assessColumns = [
    { header: 'Assessment', render: r => <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.course_name}</p></div> },
    { header: 'Type', render: r => <Badge variant="outline" className="capitalize">{r.type}</Badge> },
    { header: 'Due / Exam Date', render: r => <span className="text-sm">{r.due_date ? format(new Date(r.due_date), 'MMM d') : r.exam_date ? format(new Date(r.exam_date), 'MMM d') : '—'}</span> },
    { header: 'Marks', render: r => <span className="text-sm">{r.total_marks}</span> },
    { header: 'Weight', render: r => <span className="text-sm">{r.weight_percent}%</span> },
    { header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      header: 'Actions', render: r => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setAssessForm(r); setAssessDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )
    }
  ];

  const getGradeColor = (pct) => {
    if (pct >= 75) return 'text-emerald-600 font-bold';
    if (pct >= 50) return 'text-blue-600 font-medium';
    if (pct >= 40) return 'text-yellow-600';
    return 'text-red-600 font-bold';
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
      <PageHeader title="Gradebook & Assessments" subtitle="Manage assessments and record student grades">
        <Button onClick={() => { setAssessForm(defaultAssessment); setAssessDialog(true); }}><Plus className="w-4 h-4 mr-1" /> New Assessment</Button>
      </PageHeader>

      <Tabs defaultValue="grade_entry">
        <TabsList>
          <TabsTrigger value="grade_entry">Grade Entry</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="results">Results Overview</TabsTrigger>
        </TabsList>

        {/* GRADE ENTRY TAB */}
        <TabsContent value="grade_entry" className="mt-4 space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <Label className="text-xs font-medium">Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-64 mt-1.5"><SelectValue placeholder="Select a course..." /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Academic Year</Label>
              <Input value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="w-32 mt-1.5" />
            </div>
            {Object.keys(gradeEdits).length > 0 && (
              <Button onClick={saveGrades} disabled={saving} className="gap-2"><Save className="w-4 h-4" />{saving ? 'Saving...' : `Save ${Object.keys(gradeEdits).length} Grades`}</Button>
            )}
          </div>

          {!selectedCourse ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Select a course to enter grades</CardContent></Card>
          ) : courseEnrollments.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No students enrolled in this course for {selectedYear}</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-4 py-3 font-semibold min-w-[180px]">Student</th>
                        {courseAssessments.map(a => (
                          <th key={a.id} className="text-center px-3 py-3 font-semibold min-w-[90px]">
                            <p>{a.title}</p>
                            <p className="text-xs font-normal text-muted-foreground capitalize">{a.type} /{a.total_marks}</p>
                          </th>
                        ))}
                        <th className="text-center px-4 py-3 font-semibold">CW%</th>
                        <th className="text-center px-4 py-3 font-semibold">Exam%</th>
                        <th className="text-center px-4 py-3 font-semibold">Final</th>
                        <th className="text-center px-4 py-3 font-semibold">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseEnrollments.map(enr => {
                        const student = students.find(s => s.id === enr.student_id);
                        return (
                          <tr key={enr.id} className="border-b hover:bg-muted/20">
                            <td className="px-4 py-2.5">
                              <p className="font-medium">{enr.student_name}</p>
                              <p className="text-xs text-muted-foreground">{enr.student_number}</p>
                            </td>
                            {courseAssessments.map(a => {
                              const key = `${enr.student_id}_${a.id}`;
                              const existing = gradeMap[key];
                              const editVal = gradeEdits[key];
                              const currentVal = editVal !== undefined ? editVal : (existing?.marks_obtained ?? '');
                              const pct = existing?.percentage;
                              return (
                                <td key={a.id} className="px-2 py-2 text-center">
                                  <Input
                                    type="number" min={0} max={a.total_marks}
                                    value={currentVal}
                                    onChange={e => setGradeEdits(g => ({ ...g, [key]: e.target.value }))}
                                    className={`w-20 text-center text-xs ${editVal !== undefined ? 'border-primary' : ''}`}
                                    placeholder="—"
                                  />
                                  {pct !== undefined && editVal === undefined && <p className={`text-xs mt-0.5 ${getGradeColor(pct)}`}>{pct.toFixed(0)}%</p>}
                                </td>
                              );
                            })}
                            <td className="px-4 py-2.5 text-center"><span className={enr.coursework_score != null ? getGradeColor(enr.coursework_score) : 'text-muted-foreground'}>{enr.coursework_score != null ? `${enr.coursework_score.toFixed(1)}%` : '—'}</span></td>
                            <td className="px-4 py-2.5 text-center"><span className={enr.exam_score != null ? getGradeColor(enr.exam_score) : 'text-muted-foreground'}>{enr.exam_score != null ? `${enr.exam_score.toFixed(1)}%` : '—'}</span></td>
                            <td className="px-4 py-2.5 text-center"><span className={enr.final_score != null ? getGradeColor(enr.final_score) + ' font-bold' : 'text-muted-foreground'}>{enr.final_score != null ? `${enr.final_score.toFixed(1)}%` : '—'}</span></td>
                            <td className="px-4 py-2.5 text-center"><span className={`font-bold text-base ${enr.grade ? getGradeColor(enr.final_score || 0) : 'text-muted-foreground'}`}>{enr.grade || '—'}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ASSESSMENTS TAB */}
        <TabsContent value="assessments" className="mt-4 space-y-4">
          <div>
            <Label className="text-xs font-medium">Filter by Course</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-64 mt-1.5"><SelectValue placeholder="All courses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Courses</SelectItem>
                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DataTable columns={assessColumns} data={selectedCourse ? courseAssessments : assessments} isLoading={assLoading} emptyMessage="No assessments yet" />
        </TabsContent>

        {/* RESULTS OVERVIEW TAB */}
        <TabsContent value="results" className="mt-4 space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <Label className="text-xs font-medium">Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-64 mt-1.5"><SelectValue placeholder="Select a course..." /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {selectedCourse && (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 border-b"><th className="text-left px-4 py-3">Student</th><th className="text-right px-4 py-3">CW Score</th><th className="text-right px-4 py-3">Exam Score</th><th className="text-right px-4 py-3">Final Score</th><th className="text-center px-4 py-3">Grade</th><th className="text-center px-4 py-3">Result</th></tr></thead>
                  <tbody>
                    {courseEnrollments.map(enr => (
                      <tr key={enr.id} className="border-b hover:bg-muted/20">
                        <td className="px-4 py-2.5"><p className="font-medium">{enr.student_name}</p><p className="text-xs text-muted-foreground">{enr.student_number}</p></td>
                        <td className="px-4 py-2.5 text-right">{enr.coursework_score != null ? `${enr.coursework_score.toFixed(1)}%` : '—'}</td>
                        <td className="px-4 py-2.5 text-right">{enr.exam_score != null ? `${enr.exam_score.toFixed(1)}%` : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{enr.final_score != null ? `${enr.final_score.toFixed(1)}%` : '—'}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-lg">{enr.grade || '—'}</td>
                        <td className="px-4 py-2.5 text-center"><StatusBadge status={enr.result || 'pending'} /></td>
                      </tr>
                    ))}
                    {courseEnrollments.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Select a course to view results</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Assessment Dialog */}
      <FormDialog open={assessDialog} onOpenChange={setAssessDialog} title={assessForm.id ? 'Edit Assessment' : 'New Assessment'} onSubmit={() => assessMutation.mutate(assessForm)} isSubmitting={assessMutation.isPending} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Title" value={assessForm.title} onChange={v => setA('title', v)} required className="col-span-2" />
          <FormField label="Course" type="select" value={assessForm.course_id || selectedCourse || ''} onChange={v => setA('course_id', v)} options={courses.map(c => ({ value: c.id, label: `${c.code} — ${c.name}` }))} required />
          <FormField label="Type" type="select" value={assessForm.type} onChange={v => setA('type', v)} options={['assignment','test','project','practical','presentation','quiz','exam'].map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
          <FormField label="Due Date" type="date" value={assessForm.due_date} onChange={v => setA('due_date', v)} />
          <FormField label="Exam Date" type="date" value={assessForm.exam_date} onChange={v => setA('exam_date', v)} />
          <FormField label="Total Marks" type="number" value={assessForm.total_marks} onChange={v => setA('total_marks', v)} />
          <FormField label="Weight (%)" type="number" value={assessForm.weight_percent} onChange={v => setA('weight_percent', v)} />
          <FormField label="Status" type="select" value={assessForm.status} onChange={v => setA('status', v)} options={['upcoming','active','grading','completed'].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
          <FormField label="Description" type="textarea" value={assessForm.description} onChange={v => setA('description', v)} className="col-span-2" />
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Assessment?</AlertDialogTitle><AlertDialogDescription>All grades for this assessment will still exist but the assessment will be removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={() => deleteMutation.mutate(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}