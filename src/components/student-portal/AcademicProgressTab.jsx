import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/shared/StatusBadge';
import { SEMESTER_LABELS, totalCreditsEarned } from '@/lib/academicUtils';
import { BookOpen } from 'lucide-react';

export default function AcademicProgressTab({ enrollments, courses }) {
  const creditsEarned = totalCreditsEarned(enrollments, courses);
  const passedCourses = enrollments.filter(e => e.result === 'pass' || e.result === 'distinction');
  const inProgress = enrollments.filter(e => e.status === 'enrolled' && e.result === 'pending');
  const failedCourses = enrollments.filter(e => e.result === 'fail');

  const byYearSem = {};
  enrollments.forEach(e => {
    const key = `Year ${e.year_level || 1} — ${SEMESTER_LABELS[e.semester] || e.semester} (${e.academic_year || 'N/A'})`;
    if (!byYearSem[key]) byYearSem[key] = [];
    byYearSem[key].push(e);
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-4 text-center">
          <p className="text-xs text-muted-foreground">Passed</p>
          <p className="text-xl font-bold mt-1 text-emerald-600">{passedCourses.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <p className="text-xs text-muted-foreground">In Progress</p>
          <p className="text-xl font-bold mt-1 text-blue-600">{inProgress.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <p className="text-xs text-muted-foreground">Failed</p>
          <p className="text-xl font-bold mt-1 text-red-600">{failedCourses.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" /> Course History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No courses enrolled yet.</p>
          ) : (
            Object.entries(byYearSem).map(([group, enrs]) => {
              const groupCredits = enrs.reduce((sum, e) => {
                const course = courses.find(c => c.id === e.course_id);
                return sum + (course?.credits || 0);
              }, 0);
              return (
                <div key={group}>
                  <div className="px-4 py-2 bg-muted/40 border-y font-semibold text-xs uppercase tracking-wide text-muted-foreground flex justify-between">
                    <span>{group}</span>
                    <span>{groupCredits} credits</span>
                  </div>
                  {enrs.map(e => {
                    const course = courses.find(c => c.id === e.course_id);
                    return (
                      <div key={e.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{e.course_code} — {e.course_name}</p>
                          <p className="text-xs text-muted-foreground">{course?.credits || 0} credits{e.final_score != null ? ` · Score: ${e.final_score}%` : ''}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {e.grade && <span className="text-sm font-bold">{e.grade}</span>}
                          <StatusBadge status={e.result || e.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}