import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/shared/StatusBadge';
import { useToast } from '@/components/ui/use-toast';
import { calculateFinalScore, scoreToGrade, calculateGPA, totalCreditsEarned, SEMESTER_LABELS, nextSemester } from '@/lib/academicUtils';
import { Save, ArrowRight, Award, TrendingUp } from 'lucide-react';

export default function ProgressionStage({ student, programmes, courses, enrollments }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [gradeEdits, setGradeEdits] = useState({});

  const programme = programmes.find(p => p.id === student?.programme_id || p.id === student?.undergraduate_programme_id);
  const passMark = programme?.pass_mark || 50;
  const distinctionMark = programme?.distinction_mark || 75;

  const activeEnrollments = enrollments.filter(e => e.student_id === student?.id && e.status === 'enrolled');
  const completedEnrollments = enrollments.filter(e => e.student_id === student?.id && e.status !== 'enrolled');
  const allStudentEnrollments = [...activeEnrollments, ...completedEnrollments];
  const gpa = calculateGPA(allStudentEnrollments);
  const credits = totalCreditsEarned(allStudentEnrollments, courses);

  const handleGradeChange = (enrollmentId, field, value) => {
    setGradeEdits(prev => ({ ...prev, [enrollmentId]: { ...prev[enrollmentId], [field]: value } }));
  };

  const saveGradeMutation = useMutation({
    mutationFn: async (enrollment) => {
      if (!student) return;
      const edits = gradeEdits[enrollment.id] || {};
      const course = courses.find(c => c.id === enrollment.course_id);
      const courseworkScore = edits.coursework_score != null ? parseFloat(edits.coursework_score) : enrollment.coursework_score;
      const examScore = edits.exam_score != null ? parseFloat(edits.exam_score) : enrollment.exam_score;
      const finalScore = calculateFinalScore(courseworkScore, examScore, course?.coursework_weight, course?.exam_weight);
      const { grade, grade_points, result } = scoreToGrade(finalScore, passMark, distinctionMark);
      await base44.entities.Enrollment.update(enrollment.id, {
        coursework_score: courseworkScore,
        exam_score: examScore,
        final_score: finalScore,
        grade, grade_points, result,
        status: result === 'fail' ? 'failed' : 'completed',
      });
    },
    onSuccess: () => { qc.invalidateQueries(['enrollments']); toast({ title: 'Grade saved' }); }
  });

  const progressMutation = useMutation({
    mutationFn: async () => {
      if (!student) return;
      const next = nextSemester(student.current_semester);
      const failedCount = activeEnrollments.filter(e => e.result === 'fail').length;
      const yearAverage = activeEnrollments.length > 0 ? parseFloat((activeEnrollments.reduce((s, e) => s + (e.final_score || 0), 0) / activeEnrollments.length).toFixed(1)) : 0;
      const creditsPassed = activeEnrollments.filter(e => e.result === 'pass' || e.result === 'distinction').reduce((s, e) => s + (courses.find(c => c.id === e.course_id)?.credits || 0), 0);
      const maxFailed = programme?.max_failed_modules || 2;
      if (next) {
        await base44.entities.Student.update(student.id, { current_semester: next });
        await base44.entities.ProgressionDecision.create({
          student_id: student.id, student_name: `${student.first_name} ${student.last_name}`, student_number: student.student_number,
          programme_id: student.programme_id || student.undergraduate_programme_id, programme_name: programme?.name,
          academic_year: new Date().getFullYear().toString(), from_year: student.current_year, to_year: student.current_year,
          year_average: yearAverage, total_credits_passed: creditsPassed, modules_failed: failedCount,
          decision: failedCount > maxFailed ? 'supplementary' : 'progress',
          decided_by: 'system', decision_date: new Date().toISOString().slice(0, 10),
          notes: `Progressed from ${SEMESTER_LABELS[student.current_semester]} to ${SEMESTER_LABELS[next]}`,
        });
      } else {
        const nextYear = student.current_year + 1;
        const decision = failedCount > maxFailed ? 'repeat_year' : 'progress';
        await base44.entities.Student.update(student.id, { current_year: nextYear, current_semester: 'semester_1' });
        await base44.entities.ProgressionDecision.create({
          student_id: student.id, student_name: `${student.first_name} ${student.last_name}`, student_number: student.student_number,
          programme_id: student.programme_id || student.undergraduate_programme_id, programme_name: programme?.name,
          academic_year: new Date().getFullYear().toString(), from_year: student.current_year, to_year: nextYear,
          year_average: yearAverage, total_credits_passed: creditsPassed, modules_failed: failedCount,
          decision, decided_by: 'system', decision_date: new Date().toISOString().slice(0, 10),
          notes: `Progressed from Year ${student.current_year} to Year ${nextYear}`,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']); qc.invalidateQueries(['enrollments']); qc.invalidateQueries(['progressionDecisions']);
      toast({ title: 'Student progressed successfully' });
    }
  });

  if (!student) return <p className="text-sm text-muted-foreground">Select a student.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /><div><p className="text-xs text-muted-foreground">GPA</p><p className="text-xl font-bold">{gpa}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-2"><Award className="w-4 h-4 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Credits Earned</p><p className="text-xl font-bold">{credits}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div><p className="text-xs text-muted-foreground">Current</p><p className="text-xl font-bold">Year {student.current_year}</p><p className="text-xs text-muted-foreground">{SEMESTER_LABELS[student.current_semester]}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Grade Entry — Active Courses</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {activeEnrollments.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No active enrollments. Enroll courses first.</p> : activeEnrollments.map(e => {
              const course = courses.find(c => c.id === e.course_id);
              const edits = gradeEdits[e.id] || {};
              const cw = edits.coursework_score != null ? parseFloat(edits.coursework_score) : e.coursework_score;
              const ex = edits.exam_score != null ? parseFloat(edits.exam_score) : e.exam_score;
              const finalScore = calculateFinalScore(cw, ex, course?.coursework_weight, course?.exam_weight);
              const { grade, result } = scoreToGrade(finalScore, passMark, distinctionMark);
              return (
                <div key={e.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div><p className="text-sm font-medium">{e.course_code} — {e.course_name}</p><p className="text-xs text-muted-foreground">CW weight: {course?.coursework_weight || 40}% · Exam weight: {course?.exam_weight || 60}%</p></div>
                    <div className="flex items-center gap-3">{finalScore != null && <><span className="text-sm font-bold">{grade}</span><span className="text-xs text-muted-foreground">{finalScore}%</span><StatusBadge status={result === 'distinction' ? 'completed' : result} /></>}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[10px] text-muted-foreground">Coursework Score</label><Input type="number" value={cw ?? ''} onChange={ev => handleGradeChange(e.id, 'coursework_score', ev.target.value)} className="h-8 text-xs" placeholder="0-100" /></div>
                    <div><label className="text-[10px] text-muted-foreground">Exam Score</label><Input type="number" value={ex ?? ''} onChange={ev => handleGradeChange(e.id, 'exam_score', ev.target.value)} className="h-8 text-xs" placeholder="0-100" /></div>
                    <div className="flex items-end"><Button size="sm" variant="outline" className="h-8 w-full" onClick={() => saveGradeMutation.mutate(e)} disabled={saveGradeMutation.isPending}><Save className="w-3 h-3 mr-1" /> Save</Button></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Progression</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Advance the student to the next semester or year. Ensure all grades are saved first.</p>
          <Button onClick={() => progressMutation.mutate()} disabled={progressMutation.isPending || activeEnrollments.length === 0}>
            <ArrowRight className="w-4 h-4 mr-1" /> {nextSemester(student.current_semester) ? `Progress to ${SEMESTER_LABELS[nextSemester(student.current_semester)]}` : `Progress to Year ${student.current_year + 1}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}