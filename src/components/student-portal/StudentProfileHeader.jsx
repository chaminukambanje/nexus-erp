import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  calculateGPA,
  calculateMITGPA,
  auditMITGIRProgress,
  totalCreditsEarned,
  SEMESTER_LABELS
} from '@/lib/academicUtils';
import { GraduationCap, Mail, Phone, Calendar, MapPin, Sparkles, ShieldCheck, Landmark } from 'lucide-react';

export default function StudentProfileHeader({ student, programme, enrollments, courses, balance }) {
  const isMit = !!(student?.mit_id || student?.kerberos_id || student?.email?.includes('mit.edu'));
  const gpa = isMit ? calculateMITGPA(enrollments) : calculateGPA(enrollments);
  const credits = totalCreditsEarned(enrollments, courses);
  const requiredCredits = isMit ? 360 : (programme?.total_credits || 120);
  const progressPercent = Math.min(100, Math.round((credits / requiredCredits) * 100));
  const girAudit = auditMITGIRProgress(enrollments, courses);

  return (
    <Card className="shadow-xs border-primary/20">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-6 justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold font-heading">{student.first_name} {student.last_name}</h2>
                {isMit && (
                  <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                    {student.kerberos_id ? `@${student.kerberos_id}` : 'MIT Student'}
                  </Badge>
                )}
                {student.urop_active && (
                  <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-300">
                    UROP Active
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground mt-0.5">
                {isMit ? (
                  <span>MIT ID: <strong className="font-mono text-foreground">{student.mit_id || student.student_number}</strong> · {student.class_year || 'Undergraduate'}</span>
                ) : (
                  <span>Student ID: {student.student_number || '—'}</span>
                )}
              </p>

              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {student.email && <span className="flex items-center gap-1 font-mono"><Mail className="w-3 h-3" />{student.email}</span>}
                {student.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{student.phone}</span>}
                {(student.class_year || student.intake_year) && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{student.class_year || `Intake ${student.intake_year}`}</span>}
                {student.nationality && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{student.nationality}</span>}
              </div>
            </div>
          </div>

          <div className="md:ml-auto flex flex-col gap-2 md:items-end">
            <div className="flex items-center gap-2">
              <StatusBadge status={student.status} />
              {student.cap_standing && (
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-300">
                  {student.cap_status_label || 'Good Standing'}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {SEMESTER_LABELS[student.current_semester] || student.current_semester} · Year {student.current_year}
            </span>
            {student.academic_stage && (
              <span className="text-[11px] text-primary font-medium">
                {student.stage_label || student.academic_stage}
              </span>
            )}
          </div>
        </div>

        {/* Academic Major and Degree Details */}
        <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {isMit ? 'Course Department / Major' : 'Programme'}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {student.declared_major || student.programme_name || programme?.name || 'Course 0 (Undeclared)'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isMit ? 'Degree: Scientiae Baccalaureus (S.B.)' : `${programme?.code || ''} · ${(programme?.degree_type || '').replace(/_/g, ' ')}`}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {isMit ? 'Academic Faculty Advisor' : 'Faculty'}
            </p>
            <p className="text-sm font-medium text-foreground">
              {student.first_year_advisor || student.departmental_advisor || programme?.faculty || 'Prof. Gerald Sussman'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isMit ? (student.associate_advisor ? `Peer Advisor: ${student.associate_advisor}` : 'Undergraduate Advising Center') : (programme?.department || '')}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {isMit ? 'GIR & Degree Progress' : 'Credit Progress'}
            </p>
            <div className="flex items-center gap-2">
              <Progress value={isMit ? girAudit.girPct : progressPercent} className="h-2 flex-1" />
              <span className="text-xs font-semibold shrink-0">
                {isMit ? `${girAudit.completedGIRs}/17 GIRs` : `${progressPercent}%`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isMit ? `${student.total_units_passed || credits} / 360 units passed` : `${credits} / ${requiredCredits} credits earned`}
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground font-medium">{isMit ? 'MIT Cumulative Rating' : 'Cumulative GPA'}</p>
            <p className="text-2xl font-bold mt-1 text-primary">{gpa.toFixed(2)}{isMit && <span className="text-xs font-normal text-muted-foreground"> / 5.0</span>}</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground font-medium">{isMit ? 'GIR Completion' : 'Credits Earned'}</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{isMit ? `${girAudit.completedGIRs} / 17` : credits}</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground font-medium">{isMit ? 'Subjects Completed' : 'Courses Completed'}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{enrollments.filter(e => e.result === 'pass' || e.result === 'distinction' || e.grade === 'P').length}</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg border">
            <p className="text-xs text-muted-foreground font-medium">{isMit ? 'PE & Swim Test' : 'Outstanding'}</p>
            {isMit ? (
              <p className="text-sm font-semibold mt-2.5 text-foreground">
                {student.pe_points_completed || 8} pts · {student.swim_test_passed ?? true ? 'Swim ✓' : 'Swim pending'}
              </p>
            ) : (
              <p className={`text-2xl font-bold mt-1 ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ${balance.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}