import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import { useToast } from '@/components/ui/use-toast';
import { calculateGPA, totalCreditsEarned, SEMESTER_LABELS } from '@/lib/academicUtils';
import { Award, CheckCircle, XCircle, GraduationCap } from 'lucide-react';

export default function GraduationStage({ student, programmes, courses, enrollments }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const programme = programmes.find(p => p.id === student?.programme_id || p.id === student?.undergraduate_programme_id);
  const studentEnrollments = enrollments.filter(e => e.student_id === student?.id);
  const gpa = calculateGPA(studentEnrollments);
  const credits = totalCreditsEarned(studentEnrollments, courses);
  const passedCourses = studentEnrollments.filter(e => e.result === 'pass' || e.result === 'distinction').length;
  const failedCourses = studentEnrollments.filter(e => e.result === 'fail').length;
  const requiredCredits = programme?.total_credits || 120;
  const canGraduate = student && credits >= requiredCredits && failedCourses === 0 && student.status !== 'graduated';
  const alreadyGraduated = student?.status === 'graduated';

  const graduateMutation = useMutation({
    mutationFn: async () => {
      if (!student) return;
      await base44.entities.Student.update(student.id, {
        status: 'graduated', cumulative_gpa: gpa, total_credits_earned: credits,
      });
      await base44.entities.ProgressionDecision.create({
        student_id: student.id, student_name: `${student.first_name} ${student.last_name}`, student_number: student.student_number,
        programme_id: student.programme_id || student.undergraduate_programme_id, programme_name: programme?.name,
        academic_year: new Date().getFullYear().toString(), from_year: student.current_year, to_year: student.current_year,
        year_average: gpa, total_credits_passed: credits, modules_failed: failedCourses,
        decision: 'graduate', decided_by: 'system', decision_date: new Date().toISOString().slice(0, 10),
        notes: `Graduated with GPA ${gpa}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']); qc.invalidateQueries(['progressionDecisions']);
      toast({ title: 'Student graduated!', description: `${student.first_name} ${student.last_name} has graduated.` });
    }
  });

  if (!student) return <p className="text-sm text-muted-foreground">Select a student.</p>;

  return (
    <div className="space-y-4">
      {alreadyGraduated && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-6 text-center">
            <GraduationCap className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-emerald-700">Graduated</p>
            <p className="text-sm text-emerald-600">GPA: {gpa} · {credits} credits earned</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Total Courses</p><p className="text-xl font-bold">{studentEnrollments.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Passed</p><p className="text-xl font-bold text-emerald-600">{passedCourses}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Failed</p><p className="text-xl font-bold text-red-600">{failedCourses}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><p className="text-xs text-muted-foreground">Credits / Required</p><p className="text-xl font-bold">{credits} / {requiredCredits}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Graduation Eligibility</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            {credits >= requiredCredits ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
            <span>Credits requirement ({credits}/{requiredCredits})</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {failedCourses === 0 ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
            <span>No outstanding failed courses ({failedCourses} failed)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Award className="w-4 h-4 text-primary" />
            <span>GPA: {gpa}</span>
          </div>
          {!alreadyGraduated && (
            <Button className="w-full mt-2" disabled={!canGraduate || graduateMutation.isPending} onClick={() => graduateMutation.mutate()}>
              <GraduationCap className="w-4 h-4 mr-2" /> Graduate Student
            </Button>
          )}
          {!canGraduate && !alreadyGraduated && (
            <p className="text-xs text-amber-600 text-center">Student does not meet graduation requirements.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}