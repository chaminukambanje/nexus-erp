import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Award, CheckCircle2, AlertCircle, Save, Info, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MIT_GIR_REQUIREMENTS,
  scoreToMITGrade,
  calculateMITGPA,
  auditMITGIRProgress
} from '@/lib/academicUtils';

export default function MITGIRGradingStage({ student, courses = [], enrollments = [], onUpdate }) {
  const qc = useQueryClient();
  const [gradeInputs, setGradeInputs] = useState({});

  const studentEnrollments = enrollments.filter(e => e.student_id === student?.id);
  const girAudit = auditMITGIRProgress(studentEnrollments, courses);
  const mitGpa = calculateMITGPA(studentEnrollments);

  // Determine current MIT grading policy for student
  const isFirstYearFall = student?.current_year === 1 && student?.current_semester === 'semester_1';
  const isFirstYearSpring = student?.current_year === 1 && student?.current_semester === 'semester_2';
  const currentPolicy = isFirstYearFall ? 'first_year_fall' : (isFirstYearSpring ? 'first_year_spring' : 'regular');

  const policyLabel = isFirstYearFall
    ? 'First-Year Fall: Pass / No Record (P/NR)'
    : (isFirstYearSpring
      ? 'First-Year Spring: A, B, C / No Record (ABC/NR)'
      : 'Sophomore - Senior: Standard 5.0 Letter Grades');

  const unitCap = isFirstYearFall ? 54 : (isFirstYearSpring ? 60 : 66);
  const registeredUnits = studentEnrollments.reduce((sum, e) => sum + (e.units || 12), 0);

  const saveGradeMutation = useMutation({
    mutationFn: async ({ enrollmentId, score }) => {
      const parsedScore = parseFloat(score);
      const gradeResult = scoreToMITGrade(parsedScore, currentPolicy);

      await base44.entities.Enrollment.update(enrollmentId, {
        final_score: parsedScore,
        grade: gradeResult.grade,
        grade_points: gradeResult.grade_points,
        result: gradeResult.result,
        transcript_status: gradeResult.transcript_status,
        status: gradeResult.result === 'no_record' ? 'failed' : 'completed',
        notes: gradeResult.notes || `Graded under MIT ${policyLabel}`
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['enrollments']);
      qc.invalidateQueries(['students']);
      toast.success('Subject grade recorded according to MIT grading policy.');
      if (onUpdate) onUpdate();
    }
  });

  return (
    <div className="space-y-6">
      {/* Policy Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-foreground">Phase 2: GIRs & MIT Transitional Grading</span>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
              {policyLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isFirstYearFall
              ? 'Grades of C or better are recorded as Pass (P) with full units. Grades of D or F are marked No Record (NR) and completely hidden from external transcripts.'
              : (isFirstYearSpring
                ? 'Grades of A, B, C are recorded with units. Grades of D or F are marked No Record (NR) to support exploration without transcript penalties.'
                : 'Standard letter grades on MIT\'s 5.0 scale (A=5, B=4, C=3, D=2, F=0).')}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-right">
          <div>
            <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Term Credit Limit</span>
            <span className="text-xs font-mono font-bold text-foreground">{registeredUnits} / {unitCap} Units</span>
          </div>
          <Badge variant="outline" className="text-xs py-1 px-2.5">
            {registeredUnits <= unitCap ? 'Within Cap' : 'Overload Petition Required'}
          </Badge>
        </div>
      </div>

      {/* GIR Progress Dashboard */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                General Institute Requirements (GIR) Progress
              </CardTitle>
              <CardDescription className="text-xs">
                All MIT undergraduates must complete 17 foundational GIR subjects across Science, HASS, CI, REST, and Lab
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold font-mono text-primary">{girAudit.girPct}%</span>
              <span className="text-xs text-muted-foreground block">{girAudit.completedGIRs} of {girAudit.totalGIRs} Requirements Fulfilled</span>
            </div>
          </div>
          <Progress value={girAudit.girPct} className="h-2 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className={`p-3 rounded-lg border ${girAudit.scienceCore.fulfilled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-muted/40'}`}>
              <span className="font-semibold block">Science Core</span>
              <span className="text-xs font-mono font-bold">{girAudit.scienceCore.completed} / {girAudit.scienceCore.total}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Calc, Phys, Chem, Bio</span>
            </div>

            <div className={`p-3 rounded-lg border ${girAudit.hass.fulfilled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-muted/40'}`}>
              <span className="font-semibold block">HASS Req</span>
              <span className="text-xs font-mono font-bold">{girAudit.hass.completed} / {girAudit.hass.total}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">A, H, S, Concentration</span>
            </div>

            <div className={`p-3 rounded-lg border ${girAudit.ci.fulfilled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-muted/40'}`}>
              <span className="font-semibold block">Communication</span>
              <span className="text-xs font-mono font-bold">{girAudit.ci.completed} / {girAudit.ci.total}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">CI-H (2) & CI-M (2)</span>
            </div>

            <div className={`p-3 rounded-lg border ${girAudit.rest.fulfilled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-muted/40'}`}>
              <span className="font-semibold block">REST Electives</span>
              <span className="text-xs font-mono font-bold">{girAudit.rest.completed} / {girAudit.rest.total}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Science & Tech electives</span>
            </div>

            <div className={`p-3 rounded-lg border ${girAudit.lab.fulfilled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-muted/40'}`}>
              <span className="font-semibold block">Institute Lab</span>
              <span className="text-xs font-mono font-bold">{girAudit.lab.completed} / {girAudit.lab.total}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">12-unit hands-on lab</span>
            </div>

            <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              <span className="font-semibold block">PE & Swim Test</span>
              <span className="text-xs font-mono font-bold">{student?.pe_points_completed || 8} / 8 Pts</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">{student?.swim_test_passed ? 'Swim Test Passed' : 'Test Scheduled'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Enrollments & MIT Grading Engine */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Current Term Subject Enrollments & Grade Evaluation
            </CardTitle>
            <CardDescription className="text-xs">
              Grades recorded here automatically apply MIT {policyLabel}
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Cumulative MIT Rating:</span>
            <span className="font-mono font-bold text-primary ml-1.5 text-sm">{mitGpa.toFixed(2)} / 5.0</span>
          </div>
        </CardHeader>
        <CardContent>
          {studentEnrollments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No subject enrollments registered for this student yet.
            </div>
          ) : (
            <div className="divide-y text-xs">
              {studentEnrollments.map(enr => {
                const course = courses.find(c => c.id === enr.course_id);
                const currentScore = gradeInputs[enr.id] !== undefined ? gradeInputs[enr.id] : (enr.final_score || '');
                const preview = currentScore !== '' ? scoreToMITGrade(parseFloat(currentScore), currentPolicy) : null;

                return (
                  <div key={enr.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground text-sm bg-muted/60 px-1.5 py-0.5 rounded">
                          {course?.code || enr.course_code || 'Subject'}
                        </span>
                        <span className="font-medium text-foreground">{course?.name || 'Subject Name'}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {enr.units || course?.units || 12} Units
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                        <span>Term: {enr.term || 'Fall 2026'}</span>
                        <span>&middot;</span>
                        <span>Category: {course?.gir_category || 'GIR Core'}</span>
                        <span>&middot;</span>
                        <span>Transcript: <strong className="text-foreground">{enr.transcript_status || 'recorded_grade'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">Score (%):</span>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={currentScore}
                          onChange={e => setGradeInputs({ ...gradeInputs, [enr.id]: e.target.value })}
                          className="w-16 h-8 text-xs font-mono text-center"
                          placeholder="Score"
                        />
                      </div>

                      {preview && (
                        <div className="text-center px-2 py-1 bg-muted rounded font-mono text-xs font-bold" title={preview.notes || ''}>
                          Grade: <span className={preview.grade === 'P' ? 'text-emerald-600' : (preview.grade === 'NR' ? 'text-rose-500' : 'text-primary')}>{preview.grade}</span>
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => saveGradeMutation.mutate({ enrollmentId: enr.id, score: currentScore })}
                        disabled={saveGradeMutation.isPending || currentScore === ''}
                        className="h-8 text-xs gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Grade
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
