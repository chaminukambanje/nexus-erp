import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  calculateGPA,
  calculateMITGPA,
  auditMITGIRProgress,
  evaluateMITCAPStanding,
  SEMESTER_LABELS,
  MIT_LIFECYCLE_STAGES
} from '@/lib/academicUtils';
import { importMITAcademicLifeCycleData } from '@/api/erpDataEngine';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  Search,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  RotateCcw,
  Award,
  FileText,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Compass,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  FlaskConical,
  TrendingUp,
  Landmark
} from 'lucide-react';
import { toast } from 'sonner';

// Standard Components
import EnrollmentBilling from '@/components/lifecycle/EnrollmentBilling';
import ProgressionStage from '@/components/lifecycle/ProgressionStage';
import RepeatStage from '@/components/lifecycle/RepeatStage';
import GraduationStage from '@/components/lifecycle/GraduationStage';
import TranscriptDocument from '@/components/lifecycle/TranscriptDocument';

// MIT Lifecycle Framework Components
import MITMatriculationAdvising from '@/components/lifecycle/mit/MITMatriculationAdvising';
import MITGIRGradingStage from '@/components/lifecycle/mit/MITGIRGradingStage';
import MITMajorDeclarationStage from '@/components/lifecycle/mit/MITMajorDeclarationStage';
import MITRegistrationIAPUROP from '@/components/lifecycle/mit/MITRegistrationIAPUROP';
import MITCAPAcademicStanding from '@/components/lifecycle/mit/MITCAPAcademicStanding';
import MITGPSDegreeAudit from '@/components/lifecycle/mit/MITGPSDegreeAudit';
import MITConferralAlumniStage from '@/components/lifecycle/mit/MITConferralAlumniStage';

export default function StudentLifecycle() {
  const qc = useQueryClient();
  const [lifecycleModel, setLifecycleModel] = useState('mit'); // 'mit' | 'standard'
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [mitStage, setMitStage] = useState('matriculation');
  const [standardStage, setStandardStage] = useState('enrollment');
  const [isImporting, setIsImporting] = useState(false);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list('-created_date', 500)
  });
  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes'],
    queryFn: () => base44.entities.Programme.list()
  });
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.list()
  });
  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => base44.entities.Enrollment.list('-created_date', 500)
  });
  const { data: programmeEnrollments = [] } = useQuery({
    queryKey: ['programmeEnrollments'],
    queryFn: () => base44.entities.ProgrammeEnrollment.list()
  });
  const { data: items = [] } = useQuery({
    queryKey: ['items'],
    queryFn: () => base44.entities.Item.list()
  });

  // Auto-select first student if none selected
  useEffect(() => {
    if (!selectedId && students.length > 0) {
      // Prefer student with MIT attributes if in MIT mode
      const mitStudent = students.find(s => s.kerberos_id || s.mit_id || s.email?.includes('mit.edu'));
      setSelectedId(mitStudent ? mitStudent.id : students[0].id);
    }
  }, [students, selectedId]);

  const selectedStudent = students.find(s => s.id === selectedId);
  const studentEnrollments = enrollments.filter(e => e.student_id === selectedId);

  // Sync stage tab when a student is selected
  useEffect(() => {
    if (selectedStudent) {
      if (lifecycleModel === 'mit') {
        const s = selectedStudent.academic_stage;
        if (s === 'matriculation') setMitStage('matriculation');
        else if (s === 'first_year_fall') setMitStage('gir_grading');
        else if (s === 'first_year_spring') setMitStage('major_declaration');
        else if (s === 'sophomore_major' || s === 'junior_iap_urop') setMitStage('term_registration');
        else if (s === 'cap_review') setMitStage('cap_standing');
        else if (s === 'degree_candidate') setMitStage('gps_audit');
        else if (s === 'senior_graduation' || selectedStudent.status === 'graduated') setMitStage('conferral_alumni');
      }
    }
  }, [selectedId, lifecycleModel]);

  const handleImportMITData = () => {
    setIsImporting(true);
    try {
      importMITAcademicLifeCycleData(null, true);
      qc.invalidateQueries(['students']);
      qc.invalidateQueries(['programmes']);
      qc.invalidateQueries(['courses']);
      qc.invalidateQueries(['enrollments']);
      qc.invalidateQueries(['urops']);
      toast.success('MIT Master Cohort and Academic Curriculum imported successfully!');
    } catch (err) {
      toast.error('Failed to import MIT data');
    } finally {
      setIsImporting(false);
    }
  };

  // Student filtering
  const filteredStudents = students.filter(s => {
    const matchesSearch = `${s.first_name} ${s.last_name} ${s.student_number || ''} ${s.mit_id || ''} ${s.kerberos_id || ''} ${s.email}`
      .toLowerCase()
      .includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (stageFilter === 'all') return true;
    if (stageFilter === 'first_year') return s.current_year === 1;
    if (stageFilter === 'upperclass') return s.current_year >= 2 && s.status !== 'graduated';
    if (stageFilter === 'cap_warning') return s.cap_standing === 'cap_warning';
    if (stageFilter === 'urop') return !!s.urop_active;
    if (stageFilter === 'graduated') return s.status === 'graduated';
    return true;
  });

  // MIT Metrics for selected student
  const mitGpa = calculateMITGPA(studentEnrollments);
  const girAudit = auditMITGIRProgress(studentEnrollments, courses);
  const capEvaluation = evaluateMITCAPStanding(selectedStudent, studentEnrollments);

  // Standard Lifecycle Stages definition
  const standardStages = [
    { id: 'enrollment', label: 'Enrollment', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: ClipboardCheck },
    { id: 'repeat', label: 'Repeats', icon: RotateCcw },
    { id: 'graduation', label: 'Graduation', icon: Award },
    { id: 'documents', label: 'Documents', icon: FileText }
  ];

  // Stage mapping helper for stepper
  const getStageIndex = (stageId) => {
    return MIT_LIFECYCLE_STAGES.findIndex(s => s.id === stageId);
  };
  const currentStageIndex = getStageIndex(mitStage);

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] space-y-6">
      {/* Page Header & Lifecycle Model Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading tracking-tight flex items-center gap-2">
                Student Lifecycle Management
                {lifecycleModel === 'mit' && (
                  <Badge className="bg-red-600/10 text-red-700 dark:text-red-400 border-red-500/20 text-xs font-semibold px-2">
                    MIT Academic Model (7 Phases)
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lifecycleModel === 'mit'
                  ? 'Integrated Massachusetts Institute of Technology academic life cycle (UAC Advising, GIRs, P/NR Grading, Major Declaration, IAP/UROP, CAP 5.0, GPS Audit, S.B. Conferral)'
                  : 'Standard university academic life cycle (Enrollment, Course Progression, Repeat Sessions, Degree Graduation, Transcript Generation)'}
              </p>
            </div>
          </div>
        </div>

        {/* Model Switcher & Load MIT Cohort Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex rounded-lg border bg-muted/40 p-1 text-xs">
            <button
              onClick={() => setLifecycleModel('mit')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors',
                lifecycleModel === 'mit'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              MIT 7-Phase Life Cycle
            </button>
            <button
              onClick={() => setLifecycleModel('standard')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors',
                lifecycleModel === 'standard'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Standard University Model
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleImportMITData}
            disabled={isImporting}
            className="text-xs h-8.5 gap-1.5 bg-background shadow-xs hover:bg-muted"
            title="Import MIT undergraduate sample cohort (Courses 6-3, 18, 8, 2, GIR enrollments, UROPs, Advisors)"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-primary", isImporting && "animate-spin")} />
            {isImporting ? 'Importing...' : 'Load MIT Cohort'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student Directory & Search */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="shadow-xs overflow-hidden">
            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={lifecycleModel === 'mit' ? "Search by name, MIT ID, Kerberos..." : "Search students..."}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              {/* Quick Filters for MIT Mode */}
              {lifecycleModel === 'mit' && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'first_year', label: 'First-Year (P/NR)' },
                    { id: 'upperclass', label: 'Upperclass' },
                    { id: 'urop', label: 'UROP' },
                    { id: 'cap_warning', label: 'CAP Review' },
                    { id: 'graduated', label: 'Alumni / S.B.' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setStageFilter(f.id)}
                      className={cn(
                        "px-2 py-1 rounded-md shrink-0 transition-colors border",
                        stageFilter === f.id
                          ? "bg-primary text-primary-foreground border-primary font-medium"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Students List */}
            <div className="max-h-[640px] overflow-y-auto divide-y">
              {isLoading && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading student roster...
                </div>
              )}

              {filteredStudents.map(s => {
                const isSelected = selectedId === s.id;
                const isMit = !!(s.kerberos_id || s.mit_id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "w-full text-left p-3.5 hover:bg-muted/50 transition-all text-xs relative",
                      isSelected && "bg-primary/10 border-l-4 border-l-primary"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground truncate">
                            {s.first_name} {s.last_name}
                          </p>
                          {s.urop_active && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-500/10 text-purple-600 border-purple-300">
                              UROP
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {isMit ? (
                            <span>
                              MIT ID: <span className="font-mono">{s.mit_id || s.student_number}</span> · {s.kerberos_id ? `@${s.kerberos_id}` : s.email}
                            </span>
                          ) : (
                            <span>{s.student_number} · Year {s.current_year} · {SEMESTER_LABELS[s.current_semester]}</span>
                          )}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground truncate max-w-[200px]">
                        {s.declared_major || s.programme_name || 'Undeclared'}
                      </span>
                      {s.cap_standing && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                          s.cap_standing === 'good_standing' && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                          s.cap_standing === 'dean_list' && "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
                          s.cap_standing === 'cap_warning' && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        )}>
                          {s.cap_standing === 'good_standing' ? 'Good Standing' : (s.cap_standing === 'dean_list' ? "Dean's List" : 'CAP Warning')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {!isLoading && filteredStudents.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <p>No students match your filter.</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleImportMITData}
                    className="text-xs text-primary mt-2"
                  >
                    Click to load MIT undergraduate cohort
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Active Lifecycle View & Controls */}
        <div className="lg:col-span-8 space-y-5">
          {selectedStudent ? (
            <>
              {/* Comprehensive Student Banner */}
              <Card className="shadow-xs border-primary/20 bg-gradient-to-r from-card via-muted/20 to-card">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-xl text-foreground">
                          {selectedStudent.first_name} {selectedStudent.last_name}
                        </h2>
                        {selectedStudent.kerberos_id && (
                          <Badge variant="outline" className="font-mono text-xs text-primary bg-primary/10 border-primary/20">
                            {selectedStudent.kerberos_id}@mit.edu
                          </Badge>
                        )}
                        <StatusBadge status={selectedStudent.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <span>MIT ID: <strong className="font-mono text-foreground">{selectedStudent.mit_id || selectedStudent.student_number}</strong></span>
                        <span>·</span>
                        <span>Major: <strong className="text-foreground">{selectedStudent.declared_major || selectedStudent.programme_name || 'Course 0 (Undeclared)'}</strong></span>
                        <span>·</span>
                        <span>{selectedStudent.class_year || `Year ${selectedStudent.current_year}`}</span>
                      </p>
                    </div>

                    {/* MIT Academic Indicators */}
                    {lifecycleModel === 'mit' ? (
                      <div className="flex items-center gap-4 text-xs shrink-0">
                        <div className="text-center px-3 py-1.5 rounded-lg border bg-card/60">
                          <span className="text-[10px] text-muted-foreground block uppercase font-medium">MIT 5.0 Rating</span>
                          <span className="text-base font-bold text-primary">{mitGpa}</span>
                        </div>
                        <div className="text-center px-3 py-1.5 rounded-lg border bg-card/60">
                          <span className="text-[10px] text-muted-foreground block uppercase font-medium">GIR Progress</span>
                          <span className="text-base font-bold text-emerald-600">{girAudit.completedGIRs}/17</span>
                        </div>
                        <div className="text-center px-3 py-1.5 rounded-lg border bg-card/60">
                          <span className="text-[10px] text-muted-foreground block uppercase font-medium">Units Passed</span>
                          <span className="text-base font-bold text-foreground">
                            {selectedStudent.total_units_passed || (studentEnrollments.filter(e => e.result === 'pass' || e.grade === 'P').length * 12)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-right text-xs">
                        <p className="font-semibold text-sm">Year {selectedStudent.current_year} · {SEMESTER_LABELS[selectedStudent.current_semester]}</p>
                        <p className="text-muted-foreground mt-0.5">Cumulative GPA: <strong>{calculateGPA(studentEnrollments)}</strong></p>
                      </div>
                    )}
                  </div>

                  {/* MIT 7-Phase Horizontal Stepper (Interactive) */}
                  {lifecycleModel === 'mit' && (
                    <div className="mt-5 pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          MIT Academic Progression Pipeline
                        </span>
                        <span className="text-[11px] text-primary font-medium">
                          {selectedStudent.stage_label || `Phase ${currentStageIndex + 1}: ${MIT_LIFECYCLE_STAGES[currentStageIndex]?.shortLabel}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                        {MIT_LIFECYCLE_STAGES.map((st, idx) => {
                          const isCurrent = mitStage === st.id;
                          const isPassed = idx < currentStageIndex;
                          return (
                            <button
                              key={st.id}
                              onClick={() => setMitStage(st.id)}
                              className={cn(
                                "p-2 rounded-lg text-left transition-all border text-[11px] flex flex-col justify-between min-h-[58px]",
                                isCurrent
                                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                                  : isPassed
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15"
                                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70 border-border"
                              )}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-mono text-[10px] opacity-80">Phase {st.step}</span>
                                {isPassed && !isCurrent && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              </div>
                              <span className="truncate block font-medium mt-1 leading-tight">
                                {st.shortLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* MIT Model Stages View */}
              {lifecycleModel === 'mit' ? (
                <Tabs value={mitStage} onValueChange={setMitStage} className="space-y-4">
                  <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/60">
                    <TabsTrigger value="matriculation" className="text-xs py-1.5 gap-1.5">
                      <Compass className="w-3.5 h-3.5" /> Phase 1: Matriculation & UAC
                    </TabsTrigger>
                    <TabsTrigger value="gir_grading" className="text-xs py-1.5 gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Phase 2: GIRs & P/NR
                    </TabsTrigger>
                    <TabsTrigger value="major_declaration" className="text-xs py-1.5 gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" /> Phase 3: Major Declaration
                    </TabsTrigger>
                    <TabsTrigger value="term_registration" className="text-xs py-1.5 gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Phase 4: Registration, IAP & UROP
                    </TabsTrigger>
                    <TabsTrigger value="cap_standing" className="text-xs py-1.5 gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Phase 5: CAP & Standing (5.0)
                    </TabsTrigger>
                    <TabsTrigger value="gps_audit" className="text-xs py-1.5 gap-1.5">
                      <ClipboardCheck className="w-3.5 h-3.5" /> Phase 6: GPS Degree Audit
                    </TabsTrigger>
                    <TabsTrigger value="conferral_alumni" className="text-xs py-1.5 gap-1.5">
                      <Award className="w-3.5 h-3.5" /> Phase 7: S.B. Conferral & Alumni
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="matriculation" className="mt-2">
                    <MITMatriculationAdvising
                      student={selectedStudent}
                      onUpdate={() => qc.invalidateQueries(['students'])}
                    />
                  </TabsContent>

                  <TabsContent value="gir_grading" className="mt-2">
                    <MITGIRGradingStage
                      student={selectedStudent}
                      courses={courses}
                      enrollments={enrollments}
                      onUpdate={() => {
                        qc.invalidateQueries(['enrollments']);
                        qc.invalidateQueries(['students']);
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="major_declaration" className="mt-2">
                    <MITMajorDeclarationStage
                      student={selectedStudent}
                      programmes={programmes}
                      onUpdate={() => qc.invalidateQueries(['students'])}
                    />
                  </TabsContent>

                  <TabsContent value="term_registration" className="mt-2">
                    <MITRegistrationIAPUROP
                      student={selectedStudent}
                      onUpdate={() => {
                        qc.invalidateQueries(['students']);
                        qc.invalidateQueries(['urops']);
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="cap_standing" className="mt-2">
                    <MITCAPAcademicStanding
                      student={selectedStudent}
                      enrollments={enrollments}
                      onUpdate={() => qc.invalidateQueries(['students'])}
                    />
                  </TabsContent>

                  <TabsContent value="gps_audit" className="mt-2">
                    <MITGPSDegreeAudit
                      student={selectedStudent}
                      courses={courses}
                      enrollments={enrollments}
                      onUpdate={() => qc.invalidateQueries(['students'])}
                    />
                  </TabsContent>

                  <TabsContent value="conferral_alumni" className="mt-2">
                    <MITConferralAlumniStage
                      student={selectedStudent}
                      programmes={programmes}
                      courses={courses}
                      enrollments={enrollments}
                      onUpdate={() => qc.invalidateQueries(['students'])}
                    />
                  </TabsContent>
                </Tabs>
              ) : (
                /* Standard University Model Stages View */
                <Tabs value={standardStage} onValueChange={setStandardStage} className="space-y-4">
                  <TabsList className="w-full justify-start overflow-x-auto">
                    {standardStages.map(s => {
                      const Icon = s.icon;
                      return (
                        <TabsTrigger key={s.id} value={s.id} className="text-xs py-1.5 gap-1.5">
                          <Icon className="w-3.5 h-3.5" />
                          {s.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  <TabsContent value="enrollment">
                    <EnrollmentBilling
                      student={selectedStudent}
                      programmes={programmes}
                      courses={courses}
                      enrollments={enrollments}
                      programmeEnrollments={programmeEnrollments}
                      items={items}
                    />
                  </TabsContent>

                  <TabsContent value="progress">
                    <ProgressionStage
                      student={selectedStudent}
                      programmes={programmes}
                      courses={courses}
                      enrollments={enrollments}
                    />
                  </TabsContent>

                  <TabsContent value="repeat">
                    <RepeatStage
                      student={selectedStudent}
                      programmes={programmes}
                      courses={courses}
                      enrollments={enrollments}
                      items={items}
                    />
                  </TabsContent>

                  <TabsContent value="graduation">
                    <GraduationStage
                      student={selectedStudent}
                      programmes={programmes}
                      courses={courses}
                      enrollments={enrollments}
                    />
                  </TabsContent>

                  <TabsContent value="documents">
                    <TranscriptDocument
                      student={selectedStudent}
                      programmes={programmes}
                      courses={courses}
                      enrollments={enrollments}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-20 text-center">
                <GraduationCap className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-semibold text-foreground text-base">Select a Student</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Choose an undergraduate from the roster to monitor and manage their academic progression through all MIT lifecycle phases.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button size="sm" variant="outline" onClick={handleImportMITData} className="text-xs">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Load MIT Cohort
                  </Button>
                  <Button size="sm" asChild className="text-xs">
                    <Link to="/university/admissions">
                      Admissions Portal <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}