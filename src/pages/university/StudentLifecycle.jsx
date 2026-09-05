import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/shared/StatusBadge';
import { calculateGPA, SEMESTER_LABELS } from '@/lib/academicUtils';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Search, GraduationCap, BookOpen, ClipboardCheck, RotateCcw, Award, FileText, ArrowRight } from 'lucide-react';
import EnrollmentBilling from '@/components/lifecycle/EnrollmentBilling';
import ProgressionStage from '@/components/lifecycle/ProgressionStage';
import RepeatStage from '@/components/lifecycle/RepeatStage';
import GraduationStage from '@/components/lifecycle/GraduationStage';
import TranscriptDocument from '@/components/lifecycle/TranscriptDocument';

export default function StudentLifecycle() {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('enrollment');

  const { data: students = [], isLoading } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list('-created_date', 500) });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes'], queryFn: () => base44.entities.Programme.list() });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list() });
  const { data: enrollments = [] } = useQuery({ queryKey: ['enrollments'], queryFn: () => base44.entities.Enrollment.list('-created_date', 500) });
  const { data: programmeEnrollments = [] } = useQuery({ queryKey: ['programmeEnrollments'], queryFn: () => base44.entities.ProgrammeEnrollment.list() });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: () => base44.entities.Item.list() });

  const selectedStudent = students.find(s => s.id === selectedId);
  const filtered = students.filter(s => `${s.first_name} ${s.last_name} ${s.student_number || ''} ${s.email}`.toLowerCase().includes(search.toLowerCase()));

  const stages = [
    { id: 'enrollment', label: 'Enrollment', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: ClipboardCheck },
    { id: 'repeat', label: 'Repeats', icon: RotateCcw },
    { id: 'graduation', label: 'Graduation', icon: Award },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1500px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading tracking-tight">Student Lifecycle</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage the full student journey from enrollment to graduation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <Card>
            <CardContent className="pt-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">Applicant enrollment happens in <Link to="/university/admissions" className="text-primary hover:underline">Admissions</Link></p>
            </CardContent>
            <div className="max-h-[600px] overflow-y-auto border-t">
              {isLoading && <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>}
              {filtered.map(s => (
                <button key={s.id} onClick={() => setSelectedId(s.id)} className={cn(
                  "w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors",
                  selectedId === s.id && "bg-primary/10 border-l-4 border-l-primary"
                )}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{s.first_name} {s.last_name}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{s.student_number} · Year {s.current_year} · {SEMESTER_LABELS[s.current_semester]}</p>
                </button>
              ))}
              {!isLoading && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No students found.</p>}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8">
          {selectedStudent ? (
            <>
              <Card className="mb-4">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedStudent.first_name} {selectedStudent.last_name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedStudent.student_number} · {selectedStudent.programme_name || 'No programme'}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>Year {selectedStudent.current_year} · {SEMESTER_LABELS[selectedStudent.current_semester]}</p>
                      <p className="text-muted-foreground">GPA: {calculateGPA(enrollments.filter(e => e.student_id === selectedStudent.id))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs value={stage} onValueChange={setStage}>
                <TabsList className="w-full justify-start overflow-x-auto mb-4">
                  {stages.map(s => { const Icon = s.icon; return <TabsTrigger key={s.id} value={s.id} className="gap-1.5"><Icon className="w-3.5 h-3.5" />{s.label}</TabsTrigger>; })}
                </TabsList>
                <TabsContent value="enrollment"><EnrollmentBilling student={selectedStudent} programmes={programmes} courses={courses} enrollments={enrollments} programmeEnrollments={programmeEnrollments} items={items} /></TabsContent>
                <TabsContent value="progress"><ProgressionStage student={selectedStudent} programmes={programmes} courses={courses} enrollments={enrollments} /></TabsContent>
                <TabsContent value="repeat"><RepeatStage student={selectedStudent} programmes={programmes} courses={courses} enrollments={enrollments} items={items} /></TabsContent>
                <TabsContent value="graduation"><GraduationStage student={selectedStudent} programmes={programmes} courses={courses} enrollments={enrollments} /></TabsContent>
                <TabsContent value="documents"><TranscriptDocument student={selectedStudent} programmes={programmes} courses={courses} enrollments={enrollments} /></TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a student to manage their lifecycle</p>
                <p className="text-xs text-muted-foreground mt-1">New students are enrolled from <Link to="/university/admissions" className="text-primary hover:underline inline-flex items-center gap-0.5">Admissions <ArrowRight className="w-3 h-3" /></Link></p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}