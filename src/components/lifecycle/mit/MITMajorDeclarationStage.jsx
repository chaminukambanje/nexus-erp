import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { GraduationCap, Award, CheckCircle2, Building, UserCheck, ArrowRight, BookOpenCheck } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MIT_COURSES } from '@/lib/academicUtils';

export default function MITMajorDeclarationStage({ student, programmes = [], onUpdate }) {
  const qc = useQueryClient();

  const [selectedCourseCode, setSelectedCourseCode] = useState(
    student?.declared_major || student?.programme_name || 'Course 6-3'
  );
  const [declaredMinor, setDeclaredMinor] = useState(student?.declared_minor || 'None');
  const [hassConcentration, setHassConcentration] = useState('Economics (Course 14)');
  const [departmentalAdvisor, setDepartmentalAdvisor] = useState(
    student?.departmental_advisor || 'Prof. Shafi Goldwasser'
  );

  const declareMajorMutation = useMutation({
    mutationFn: async () => {
      if (!student) return;
      const matchedProg = programmes.find(p => p.code === selectedCourseCode || selectedCourseCode.includes(p.code));
      return base44.entities.Student.update(student.id, {
        declared_major: selectedCourseCode,
        programme_id: matchedProg?.id || student.programme_id,
        programme_name: selectedCourseCode,
        declared_minor: declaredMinor,
        departmental_advisor: departmentalAdvisor,
        academic_stage: 'sophomore_major',
        stage_label: `Major Declared: ${selectedCourseCode}`
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']);
      toast.success(`Major Declaration officially recorded: ${selectedCourseCode}`);
      if (onUpdate) onUpdate();
    }
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-foreground">Phase 3: Major & Minor Declaration (Sophomore Standing)</span>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
              Course Major Selection
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            At the end of the first year, undergraduates formally declare their department affiliation (Course 1–24), transition to a Departmental Faculty Advisor, and plan their HASS Concentration.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Active Major Status</span>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs py-0.5">
            {student?.declared_major || 'Pending Declaration'}
          </Badge>
        </div>
      </div>

      {/* Major Declaration Selector */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            Select MIT Academic Course / Department
          </CardTitle>
          <CardDescription className="text-xs">
            Choose your primary major. All degrees culminate in an official S.B. (Bachelor of Science) degree.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MIT_COURSES.map(course => {
              const isSelected = selectedCourseCode.includes(course.code) || selectedCourseCode.includes(course.name);
              return (
                <div
                  key={course.code}
                  onClick={() => setSelectedCourseCode(`${course.code}: ${course.name}`)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold text-xs text-primary">{course.code}</span>
                    <Badge variant="outline" className="text-[10px] py-0">{course.degree}</Badge>
                  </div>
                  <h4 className="font-semibold text-xs text-foreground mt-1.5 line-clamp-1">{course.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Dept: {course.department} &middot; {course.required_major_units} Units
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t text-xs">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                Secondary Major or Minor:
              </label>
              <Input
                value={declaredMinor}
                onChange={e => setDeclaredMinor(e.target.value)}
                placeholder="e.g. Course 18 Mathematics Minor"
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                HASS Concentration (3-4 Subjects):
              </label>
              <Input
                value={hassConcentration}
                onChange={e => setHassConcentration(e.target.value)}
                placeholder="e.g. Economics (Course 14)"
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">
                Departmental Faculty Advisor:
              </label>
              <Input
                value={departmentalAdvisor}
                onChange={e => setDepartmentalAdvisor(e.target.value)}
                placeholder="e.g. Prof. Shafi Goldwasser"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => declareMajorMutation.mutate()}
              disabled={declareMajorMutation.isPending}
              className="text-xs h-9 gap-1.5 shadow-xs"
            >
              <BookOpenCheck className="w-3.5 h-3.5" />
              File Official Major Declaration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
