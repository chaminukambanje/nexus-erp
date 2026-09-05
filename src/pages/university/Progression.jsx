import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TrendingUp, CheckCircle, XCircle, RefreshCcw, GraduationCap, AlertTriangle, ChevronRight, Sparkles, ShieldCheck, UserCheck, Workflow, Landmark, FileText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import {
  calculateMITGPA,
  auditMITGIRProgress,
  evaluateMITCAPStanding
} from '@/lib/academicUtils';

export default function Progression() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [selectedProg, setSelectedProg] = useState('');
  const [fromYear, setFromYear] = useState('1');
  const [confirmDialog, setConfirmDialog] = useState(null); // { student, decision, notes }
  const [notes, setNotes] = useState('');

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: enrollments = [] } = useQuery({ queryKey: ['enrollments'], queryFn: () => base44.entities.Enrollment.list() });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes'], queryFn: () => base44.entities.Programme.list() });
  const { data: decisions = [], isLoading } = useQuery({ queryKey: ['progressionDecisions'], queryFn: () => base44.entities.ProgressionDecision.list('-decision_date', 500) });

  const decideMutation = useMutation({
    mutationFn: async ({ student, decision, notes, coursesSummary, yearAvg, creditsPassed, modulesFailed }) => {
      const prog = programmes.find(p => p.id === student.programme_id);
      const toYear = parseInt(fromYear) + 1;
      // Save progression decision
      await base44.entities.ProgressionDecision.create({
        student_id: student.id, student_name: `${student.first_name} ${student.last_name}`,
        student_number: student.student_number, programme_id: student.programme_id,
        programme_name: student.programme_name, academic_year: academicYear,
        from_year: parseInt(fromYear), to_year: decision === 'progress' || decision === 'graduate' ? toYear : parseInt(fromYear),
        year_average: yearAvg, total_credits_passed: creditsPassed, modules_failed: modulesFailed,
        courses_summary: coursesSummary, decision, decided_by: 'Academic Board',
        decision_date: new Date().toISOString().slice(0, 10), notes, notified: false
      });
      // Update student record based on decision
      if (decision === 'progress') {
        await base44.entities.Student.update(student.id, { ...student, current_year: toYear, current_semester: 'semester_1' });
      } else if (decision === 'graduate') {
        await base44.entities.Student.update(student.id, { ...student, status: 'graduated', expected_graduation: new Date().toISOString().slice(0, 10) });
      } else if (decision === 'exclude') {
        await base44.entities.Student.update(student.id, { ...student, status: 'excluded' });
      }
    },
    onSuccess: () => { qc.invalidateQueries(['progressionDecisions']); qc.invalidateQueries(['students']); setConfirmDialog(null); toast({ title: 'Decision recorded' }); }
  });

  const updateCapStandingMutation = useMutation({
    mutationFn: async ({ studentId, standing, label }) => {
      return base44.entities.Student.update(studentId, {
        cap_standing: standing,
        cap_status_label: label
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']);
      toast({ title: 'MIT CAP Standing updated successfully' });
    }
  });

  // Compute eligible students for the selected year and academic year
  const eligibleStudents = useMemo(() => {
    return students
      .filter(s => s.status === 'enrolled' && s.current_year === parseInt(fromYear) && (!selectedProg || s.programme_id === selectedProg))
      .map(student => {
        const prog = programmes.find(p => p.id === student.programme_id);
        const stuEnrollments = enrollments.filter(e => e.student_id === student.id && e.academic_year === academicYear && e.year_level === parseInt(fromYear));
        const completed = stuEnrollments.filter(e => e.result !== 'pending' && e.result !== 'supplementary');
        const passed = completed.filter(e => ['pass','merit','distinction'].includes(e.result));
        const failed = completed.filter(e => e.result === 'fail');
        const supp = stuEnrollments.filter(e => e.result === 'supplementary');
        const scores = completed.map(e => e.final_score).filter(x => x != null);
        const avg = scores.length > 0 ? scores.reduce((s, x) => s + x, 0) / scores.length : null;
        const totalCredits = passed.reduce((s, e) => s + 15, 0);
        const alreadyDecided = decisions.some(d => d.student_id === student.id && d.academic_year === academicYear && d.from_year === parseInt(fromYear));

        // Automatic recommendation
        let recommendation = 'pending';
        if (completed.length > 0 && avg !== null) {
          const maxFails = prog?.max_failed_modules ?? 2;
          const minAvg = prog?.min_progression_average ?? 50;
          const totalYears = prog?.duration_years ?? 4;
          if (parseInt(fromYear) >= totalYears && failed.length === 0 && avg >= minAvg) recommendation = 'graduate';
          else if (avg >= minAvg && failed.length <= maxFails) recommendation = 'progress';
          else if (failed.length > maxFails + 2 || avg < 30) recommendation = 'exclude';
          else recommendation = 'repeat_year';
        }

        return { student, stuEnrollments, passed, failed, supp, avg, totalCredits, recommendation, alreadyDecided, prog };
      });
  }, [students, enrollments, programmes, decisions, fromYear, selectedProg, academicYear]);

  // MIT CAP Evaluations
  const mitCapList = useMemo(() => {
    return students.map(student => {
      const stuEnrollments = enrollments.filter(e => e.student_id === student.id);
      const mitGpa = calculateMITGPA(stuEnrollments);
      const girAudit = auditMITGIRProgress(stuEnrollments, courses);
      const capEval = evaluateMITCAPStanding(student, stuEnrollments);
      return {
        student,
        stuEnrollments,
        mitGpa,
        girAudit,
        capEval
      };
    });
  }, [students, enrollments, courses]);

  const decisionHistory = decisions.filter(d => !selectedProg || d.programme_id === selectedProg);

  const recColor = (r) => ({ progress: 'text-emerald-600', graduate: 'text-indigo-600', repeat_year: 'text-yellow-600', exclude: 'text-red-600', pending: 'text-muted-foreground' }[r] || '');
  const recIcon = (r) => ({ progress: <ChevronRight className="w-4 h-4" />, graduate: <GraduationCap className="w-4 h-4" />, repeat_year: <RefreshCcw className="w-4 h-4" />, exclude: <XCircle className="w-4 h-4" />, pending: <AlertTriangle className="w-4 h-4" /> }[r] || null);

  const historyColumns = [
    { header: 'Student', render: r => <div><p className="font-medium">{r.student_name}</p><p className="text-xs text-muted-foreground">{r.student_number}</p></div> },
    { header: 'Programme', render: r => <span className="text-sm">{r.programme_name}</span> },
    { header: 'Year', render: r => <span className="text-sm">Year {r.from_year} → {r.to_year}</span> },
    { header: 'Decision', render: r => <StatusBadge status={r.decision} /> },
    { header: 'Average', render: r => <span className="text-sm font-semibold">{r.year_average != null ? `${r.year_average.toFixed(1)}%` : '—'}</span> },
    { header: 'Credits', render: r => <span className="text-sm">{r.total_credits_passed}</span> },
    { header: 'Date', render: r => <span className="text-sm">{r.decision_date ? format(new Date(r.decision_date), 'MMM d, yyyy') : '—'}</span> },
    { header: 'By', render: r => <span className="text-sm text-muted-foreground">{r.decided_by}</span> },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Progression & Academic Standing</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Committee on Academic Performance (CAP) 5.0 evaluations, General Institute Requirements progress, and Annual Board decisions
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
          <Link to="/university/lifecycle">
            <Workflow className="w-3.5 h-3.5 text-primary" />
            MIT Student Lifecycle View
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="mit_cap">
        <TabsList>
          <TabsTrigger value="mit_cap" className="gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> MIT CAP Standing (5.0 Scale & GIRs)
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="text-xs">Annual Board Progression</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">Decision History</TabsTrigger>
        </TabsList>

        {/* MIT CAP Standing & GIR Progress View */}
        <TabsContent value="mit_cap" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Cohort</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{students.length}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Dean's List / High Standing</p>
              <p className="text-2xl font-bold mt-1 text-indigo-600">
                {mitCapList.filter(item => item.capEval.status === 'dean_list' || item.student.cap_standing === 'dean_list').length}
              </p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Good Standing</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">
                {mitCapList.filter(item => item.capEval.status === 'good_standing' || item.student.cap_standing === 'good_standing').length}
              </p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">CAP Review / Warning</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">
                {mitCapList.filter(item => item.capEval.status === 'cap_warning' || item.student.cap_standing === 'cap_warning').length}
              </p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-primary" />
                  Committee on Academic Performance (CAP) Review Roster
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  Evaluated under MIT Faculty Rules & 5.0 Rating Standards
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Reviews undergraduate term ratings, flags credit restrictions (max 48 units under warning), and audits 17 GIRs progress
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-y bg-muted/40 text-muted-foreground text-left">
                      <th className="py-2.5 px-4 font-semibold">Student & Kerberos</th>
                      <th className="py-2.5 px-3 font-semibold">Course Major</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Year / Term</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Cumulative 5.0</th>
                      <th className="py-2.5 px-3 font-semibold">GIR Completion</th>
                      <th className="py-2.5 px-3 font-semibold text-center">CAP Standing</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Committee Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mitCapList.map(({ student, mitGpa, girAudit, capEval }) => {
                      const standingStatus = student.cap_standing || capEval.status;
                      const standingBadgeClass = standingStatus === 'dean_list'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200'
                        : standingStatus === 'cap_warning'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200';

                      const standingLabel = standingStatus === 'dean_list'
                        ? "Dean's List"
                        : standingStatus === 'cap_warning'
                          ? 'CAP Warning (48u Cap)'
                          : 'Good Standing';

                      return (
                        <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{student.first_name} {student.last_name}</span>
                              {student.urop_active && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-500/10 text-purple-600 border-purple-300">
                                  UROP
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">
                              MIT ID: {student.mit_id || student.student_number} · {student.kerberos_id ? `@${student.kerberos_id}` : student.email}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-foreground block">{student.declared_major || student.programme_name || 'Course 0 (Undeclared)'}</span>
                            <span className="text-[10px] text-muted-foreground">{student.first_year_advisor || student.departmental_advisor || 'Faculty Advisor Assigned'}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-medium">Year {student.current_year}</span>
                            <span className="text-[10px] text-muted-foreground block">{student.current_semester === 'semester_1' ? 'Fall' : 'Spring'}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-sm text-foreground">{mitGpa}</span>
                            <span className="text-[10px] text-muted-foreground block">/ 5.00</span>
                          </td>
                          <td className="py-3 px-3 min-w-[140px]">
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-muted-foreground">17 GIRs:</span>
                              <span className="font-semibold text-emerald-600">{girAudit.completedGIRs}/17 ({girAudit.girPct}%)</span>
                            </div>
                            <Progress value={girAudit.girPct} className="h-1.5" />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium border ${standingBadgeClass}`}>
                              {standingLabel}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => updateCapStandingMutation.mutate({ studentId: student.id, standing: 'good_standing', label: 'Good Standing' })}
                              >
                                Good Standing
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-[11px] text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => updateCapStandingMutation.mutate({ studentId: student.id, standing: 'cap_warning', label: 'CAP Academic Warning (Credit Cap 48u)' })}
                              >
                                Warning
                              </Button>
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] gap-1"
                              >
                                <Link to="/university/lifecycle">
                                  <Workflow className="w-3 h-3 text-primary" />
                                  Lifecycle
                                </Link>
                              </Button>
                            </div>
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

        <TabsContent value="evaluation" className="mt-4 space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <Label className="text-xs font-medium">Academic Year</Label>
              <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="w-32 mt-1.5 text-xs" />
            </div>
            <div>
              <Label className="text-xs font-medium">Evaluate Students in Year</Label>
              <Select value={fromYear} onValueChange={setFromYear}>
                <SelectTrigger className="w-36 mt-1.5 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5,6].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Programme</Label>
              <Select value={selectedProg} onValueChange={setSelectedProg}>
                <SelectTrigger className="w-56 mt-1.5 text-xs"><SelectValue placeholder="All programmes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Programmes</SelectItem>
                  {programmes.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {eligibleStudents.length === 0
            ? <Card><CardContent className="py-12 text-center text-muted-foreground text-xs">No active Year {fromYear} students found for {academicYear}</CardContent></Card>
            : (
              <div className="space-y-3">
                {eligibleStudents.map(({ student, stuEnrollments, passed, failed, supp, avg, recommendation, alreadyDecided, prog }) => (
                  <Card key={student.id} className={`border-l-4 ${alreadyDecided ? 'border-l-muted opacity-60' : recommendation === 'progress' || recommendation === 'graduate' ? 'border-l-emerald-500' : recommendation === 'exclude' ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{student.first_name} {student.last_name}</p>
                            <span className="text-xs text-muted-foreground">{student.student_number}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{student.programme_name}</span>
                            {alreadyDecided && <Badge variant="secondary" className="text-xs">Decision Recorded</Badge>}
                          </div>
                          <div className="flex gap-6 mt-2 flex-wrap text-xs">
                            <span>Enrolled: <strong>{stuEnrollments.length}</strong></span>
                            <span className="text-emerald-600">Passed: <strong>{passed.length}</strong></span>
                            <span className={failed.length > 0 ? 'text-red-600' : ''}>Failed: <strong>{failed.length}</strong></span>
                            <span className="text-yellow-600">Supplementary: <strong>{supp.length}</strong></span>
                            <span>Average: <strong>{avg != null ? `${avg.toFixed(1)}%` : '—'}</strong></span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {stuEnrollments.map(e => (
                              <Badge key={e.id} variant={e.result === 'pass' || e.result === 'merit' || e.result === 'distinction' ? 'default' : e.result === 'fail' ? 'destructive' : 'secondary'} className="text-[10px]">
                                {e.course_code}: {e.final_score != null ? `${e.final_score.toFixed(0)}%` : 'Pending'} {e.grade ? `(${e.grade})` : ''}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className={`flex items-center gap-1 text-xs font-semibold ${recColor(recommendation)}`}>
                            {recIcon(recommendation)} Recommendation: {recommendation.replace(/_/g, ' ').toUpperCase()}
                          </div>
                          {!alreadyDecided && (
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300 text-xs h-8" onClick={() => setConfirmDialog({ student, decision: 'progress', stuEnrollments, avg, passed, failed })}>
                                <ChevronRight className="w-3.5 h-3.5 mr-1" /> Progress
                              </Button>
                              {parseInt(fromYear) >= (prog?.duration_years || 4) && (
                                <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-300 text-xs h-8" onClick={() => setConfirmDialog({ student, decision: 'graduate', stuEnrollments, avg, passed, failed })}>
                                  <GraduationCap className="w-3.5 h-3.5 mr-1" /> Graduate
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-300 text-xs h-8" onClick={() => setConfirmDialog({ student, decision: 'repeat_year', stuEnrollments, avg, passed, failed })}>
                                <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Repeat
                              </Button>
                              <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 text-xs h-8" onClick={() => setConfirmDialog({ student, decision: 'supplementary', stuEnrollments, avg, passed, failed })}>
                                Supplementary
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-300 text-xs h-8" onClick={() => setConfirmDialog({ student, decision: 'exclude', stuEnrollments, avg, passed, failed })}>
                                <XCircle className="w-3.5 h-3.5 mr-1" /> Exclude
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <DataTable columns={historyColumns} data={decisionHistory} isLoading={isLoading} emptyMessage="No progression decisions recorded yet" />
        </TabsContent>
      </Tabs>

      {/* Confirm Decision Dialog */}
      {confirmDialog && (
        <AlertDialog open onOpenChange={() => setConfirmDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm: {confirmDialog.decision.replace(/_/g, ' ').toUpperCase()}</AlertDialogTitle>
              <AlertDialogDescription>
                Student: <strong>{confirmDialog.student.first_name} {confirmDialog.student.last_name}</strong><br />
                Average: <strong>{confirmDialog.avg != null ? `${confirmDialog.avg.toFixed(1)}%` : '—'}</strong> ·
                Passed: <strong>{confirmDialog.passed.length}</strong> · Failed: <strong>{confirmDialog.failed.length}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-1 py-2">
              <Label className="text-xs font-medium">Notes / Remarks</Label>
              <Textarea className="mt-1.5 text-xs" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setNotes('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                decideMutation.mutate({
                  student: confirmDialog.student, decision: confirmDialog.decision, notes,
                  coursesSummary: confirmDialog.stuEnrollments.map(e => ({ course_code: e.course_code, course_name: e.course_name, final_score: e.final_score, result: e.result })),
                  yearAvg: confirmDialog.avg, creditsPassed: confirmDialog.passed.length * 15, modulesFailed: confirmDialog.failed.length
                });
                setNotes('');
              }}>Confirm Decision</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}