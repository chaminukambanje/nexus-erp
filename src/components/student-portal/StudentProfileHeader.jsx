import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import StatusBadge from '@/components/shared/StatusBadge';
import { calculateGPA, totalCreditsEarned, SEMESTER_LABELS } from '@/lib/academicUtils';
import { GraduationCap, Mail, Phone, Calendar, MapPin } from 'lucide-react';

export default function StudentProfileHeader({ student, programme, enrollments, courses, balance }) {
  const gpa = calculateGPA(enrollments);
  const credits = totalCreditsEarned(enrollments, courses);
  const requiredCredits = programme?.total_credits || 120;
  const progressPercent = Math.min(100, Math.round((credits / requiredCredits) * 100));
  const durationValue = programme?.duration_value || programme?.duration_years || 0;
  const durationUnit = programme?.duration_unit === 'semesters' ? 'semesters' : 'years';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading">{student.first_name} {student.last_name}</h2>
              <p className="text-sm text-muted-foreground">{student.student_number || '—'}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {student.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{student.email}</span>}
                {student.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{student.phone}</span>}
                {student.intake_year && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Intake {student.intake_year}</span>}
                {student.nationality && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{student.nationality}</span>}
              </div>
            </div>
          </div>

          <div className="md:ml-auto flex flex-col gap-2 md:items-end">
            <StatusBadge status={student.status} />
            <span className="text-xs text-muted-foreground">{SEMESTER_LABELS[student.current_semester] || student.current_semester} · Year {student.current_year}</span>
          </div>
        </div>

        {programme && (
          <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Programme</p>
              <p className="text-sm font-medium">{programme.name}</p>
              <p className="text-xs text-muted-foreground">{programme.code} · {programme.degree_type.replace(/_/g, ' ')} · {durationValue} {durationUnit}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Faculty</p>
              <p className="text-sm font-medium">{programme.faculty || '—'}</p>
              <p className="text-xs text-muted-foreground">{programme.department || ''}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Credit Progress</p>
              <div className="flex items-center gap-2">
                <Progress value={progressPercent} className="h-2 flex-1" />
                <span className="text-xs font-medium shrink-0">{progressPercent}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{credits} / {requiredCredits} credits earned</p>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Cumulative GPA</p>
            <p className="text-2xl font-bold mt-1">{gpa.toFixed(2)}</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Credits Earned</p>
            <p className="text-2xl font-bold mt-1">{credits}</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Courses Completed</p>
            <p className="text-2xl font-bold mt-1">{enrollments.filter(e => e.result === 'pass' || e.result === 'distinction').length}</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className={`text-2xl font-bold mt-1 ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              ${balance.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}