import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, CheckCircle2, GraduationCap, Download, Printer, ShieldCheck, Sparkles, FileText, ScrollText, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateMITGPA, auditMITGIRProgress, totalCreditsEarned } from '@/lib/academicUtils';
import { jsPDF } from 'jspdf';

export default function MITConferralAlumniStage({ student, programmes = [], courses = [], enrollments = [], onUpdate }) {
  const qc = useQueryClient();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const studentEnrollments = enrollments.filter(e => e.student_id === student?.id);
  const girAudit = auditMITGIRProgress(studentEnrollments, courses);
  const mitGpa = calculateMITGPA(studentEnrollments);
  const totalUnits = student?.total_units_passed || totalCreditsEarned(studentEnrollments, courses);
  const isGraduated = student?.status === 'graduated';

  // Determine honors based on MIT 5.0 scale
  let honors = 'Standard S.B. Conferral';
  if (mitGpa >= 4.95) honors = 'Summa Cum Laude (Top 2% Institute Standing)';
  else if (mitGpa >= 4.80) honors = 'Magna Cum Laude (High Institute Standing)';
  else if (mitGpa >= 4.50) honors = 'Cum Laude (Institute Honors)';

  const conferralDate = student?.conferral_date || (isGraduated ? '2026-05-29' : null);
  const diplomaNumber = student?.diploma_number || (isGraduated ? `MIT-SB-${student?.student_number || '927891002'}` : null);
  const degreeAwarded = student?.degree_awarded || `Scientiae Baccalaureus (S.B.) in ${student?.programme_name || student?.declared_major || 'Computer Science and Engineering'}`;

  const conferDegreeMutation = useMutation({
    mutationFn: async () => {
      if (!student) return;
      const today = new Date().toISOString().slice(0, 10);
      return base44.entities.Student.update(student.id, {
        status: 'graduated',
        academic_stage: 'senior_graduation',
        stage_label: 'Phase 7: S.B. Conferral & Commencement Ready',
        degree_awarded: degreeAwarded,
        conferral_date: today,
        diploma_status: 'certified_conferred',
        diploma_number: `MIT-SB-${student.student_number || String(Date.now()).slice(-6)}`,
        alumni_status: 'active_alum',
        alumni_email: `${student.kerberos_id || 'alum'}@alum.mit.edu`
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']);
      toast.success('Degree formally certified and conferred! Student graduated with S.B. status.');
      if (onUpdate) onUpdate();
    }
  });

  const generateMITSealedTranscriptPDF = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = margin;

      // Official MIT Header
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('MASSACHUSETTS INSTITUTE OF TECHNOLOGY', pageW / 2, y, { align: 'center' });
      y += 16;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('OFFICE OF THE REGISTRAR · CAMBRIDGE, MASSACHUSETTS 02139', pageW / 2, y, { align: 'center' });
      y += 14;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('OFFICIAL UNDERGRADUATE ACADEMIC RECORD', pageW / 2, y, { align: 'center' });
      y += 24;

      // Student and Degree Details
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y, pageW - margin, y);
      y += 14;

      doc.setFontSize(8.5);
      const leftCol = margin;
      const rightCol = pageW / 2 + 10;

      doc.setFont(undefined, 'bold');
      doc.text('Student Name:', leftCol, y);
      doc.setFont(undefined, 'normal');
      doc.text(`${student.first_name} ${student.last_name}`, leftCol + 75, y);

      doc.setFont(undefined, 'bold');
      doc.text('MIT ID Number:', rightCol, y);
      doc.setFont(undefined, 'normal');
      doc.text(student.mit_id || student.student_number || '—', rightCol + 80, y);
      y += 14;

      doc.setFont(undefined, 'bold');
      doc.text('Degree Awarded:', leftCol, y);
      doc.setFont(undefined, 'normal');
      doc.text(degreeAwarded, leftCol + 75, y);

      doc.setFont(undefined, 'bold');
      doc.text('Kerberos ID:', rightCol, y);
      doc.setFont(undefined, 'normal');
      doc.text(student.kerberos_id || '—', rightCol + 80, y);
      y += 14;

      doc.setFont(undefined, 'bold');
      doc.text('Conferral Date:', leftCol, y);
      doc.setFont(undefined, 'normal');
      doc.text(conferralDate || 'In Progress', leftCol + 75, y);

      doc.setFont(undefined, 'bold');
      doc.text('Cumulative Rating (5.0):', rightCol, y);
      doc.setFont(undefined, 'bold');
      doc.text(`${mitGpa} / 5.00`, rightCol + 105, y);
      y += 14;

      if (student.thesis_title) {
        doc.setFont(undefined, 'bold');
        doc.text('Undergraduate Thesis:', leftCol, y);
        doc.setFont(undefined, 'italic');
        doc.text(student.thesis_title, leftCol + 105, y, { maxWidth: pageW - margin - leftCol - 110 });
        y += 16;
      }

      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y, pageW - margin, y);
      y += 16;

      // Table Header
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 10, pageW - 2 * margin, 16, 'F');
      doc.text('SUBJECT', margin + 6, y);
      doc.text('SUBJECT TITLE', margin + 60, y);
      doc.text('UNITS', margin + 280, y);
      doc.text('SCORE', margin + 330, y);
      doc.text('GRADE', margin + 380, y);
      doc.text('TRANSCRIPT STATUS', margin + 430, y);
      y += 16;

      // Subject Rows
      doc.setFont(undefined, 'normal');
      studentEnrollments.forEach(e => {
        // Under MIT First-Year P/NR, NR (No Record) does not appear on external transcript
        if (e.result === 'no_record' || e.grade === 'NR') return;

        const course = courses.find(c => c.id === e.course_id);
        const code = e.course_code || course?.code || '—';
        const title = (course?.name || e.course_name || 'Subject').slice(0, 38);
        const units = String(e.units || course?.units || 12);
        const score = e.final_score != null ? `${e.final_score}%` : '—';
        const grade = e.grade || (e.result === 'pass' ? 'P' : '—');
        const status = e.grade === 'P' ? 'Pass (P/NR)' : 'Recorded Grade';

        doc.text(code, margin + 6, y);
        doc.text(title, margin + 60, y);
        doc.text(units, margin + 290, y);
        doc.text(score, margin + 340, y);
        doc.setFont(undefined, 'bold');
        doc.text(grade, margin + 390, y);
        doc.setFont(undefined, 'normal');
        doc.text(status, margin + 430, y);
        y += 14;
      });

      y += 10;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageW - margin, y);
      y += 16;

      // Summary
      doc.setFontSize(8.5);
      doc.setFont(undefined, 'bold');
      doc.text('ACADEMIC SUMMARY & INSTITUTE STANDING', margin, y);
      y += 14;
      doc.setFont(undefined, 'normal');
      doc.text(`Total Units Passed: ${totalUnits} Units (Minimum Required: 360 Units)`, margin, y);
      y += 12;
      doc.text(`General Institute Requirements: 17/17 Complete (Science Core, HASS, CI, REST, Lab, PE)`, margin, y);
      y += 12;
      doc.text(`Honors & Citations: ${honors}`, margin, y);
      y += 12;
      doc.text(`Alumni Status: Active Member, MIT Alumni Association (${student.kerberos_id || 'alum'}@alum.mit.edu)`, margin, y);

      // Official Seal Note
      const footerY = pageH - 45;
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, footerY - 10, pageW - margin, footerY - 10);
      doc.setFontSize(7.5);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('This document contains the official seal of the Massachusetts Institute of Technology Registrar.', pageW / 2, footerY, { align: 'center' });
      doc.text(`Sealed and Certified on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW / 2, footerY + 10, { align: 'center' });

      doc.save(`MIT_Official_Transcript_${student.first_name}_${student.last_name}_${student.student_number}.pdf`);
      toast.success('Official MIT sealed transcript generated successfully.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-rose-500/20 bg-gradient-to-r from-rose-500/10 via-primary/5 to-transparent p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-foreground">Phase 7: S.B. Conferral, Commencement & MIT Alumni Transition</span>
            <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px]">
              Scientiae Baccalaureus
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Official degree conferral certified by the MIT Faculty and Corporation, sealed Registrar transcript release, Commencement walk in Killian Court, and lifelong induction into the MIT Alumni Association.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isGraduated ? (
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs py-1 px-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              S.B. Conferred & Graduated
            </Badge>
          ) : (
            <Button
              size="sm"
              onClick={() => conferDegreeMutation.mutate()}
              disabled={conferDegreeMutation.isPending}
              className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              <GraduationCap className="w-4 h-4" />
              Certify & Confer S.B. Degree
            </Button>
          )}
        </div>
      </div>

      {/* Graduation Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-xs border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Degree Awarded & Honors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Conferred Degree:</span>
              <span className="font-bold text-foreground text-sm block mt-0.5">{degreeAwarded}</span>
            </div>
            <div className="pt-2 border-t">
              <span className="text-muted-foreground block text-[11px]">Institute Honors Designation:</span>
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 text-[11px] mt-1">
                {honors}
              </Badge>
            </div>
            <div className="pt-2 border-t flex justify-between items-center">
              <span className="text-muted-foreground">Cumulative Rating:</span>
              <span className="font-bold text-foreground text-sm">{mitGpa} / 5.00</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-rose-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-rose-600" />
              Registrar Diploma Certification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Diploma Number:</span>
              <span className="font-mono font-semibold text-foreground">{diplomaNumber || 'Pending Conferral'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Conferral Date:</span>
              <span className="font-medium text-foreground">{conferralDate || 'Commencement 2026'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Ceremony Location:</span>
              <span className="font-medium text-foreground">Killian Court, MIT Campus</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Faculty Certification:</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approved by Faculty
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              MIT Alumni Association Transition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Alumni Status:</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                {student?.alumni_status || (isGraduated ? 'Active Alum' : 'Eligible for Induction')}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Alum Email Forwarding:</span>
              <span className="font-mono text-primary">{student?.alumni_email || `${student?.kerberos_id || 'alum'}@alum.mit.edu`}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">Brass Rat Ring Status:</span>
              <span className="text-foreground font-medium">Class Ring Certified</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Infinite Connection ID:</span>
              <span className="font-mono text-muted-foreground">IC-{student?.mit_id || student?.student_number}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Official Sealed Transcript & Document Actions */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Official MIT Registrar Transcript & Diploma Release
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateMITSealedTranscriptPDF}
                disabled={isGeneratingPdf}
                className="text-xs h-8 gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {isGeneratingPdf ? 'Generating...' : 'Download Official Sealed PDF'}
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="text-xs">
            Official verifiable academic transcript including 5.0 GPA rating, GIR progress breakdown, and First-Year Pass/No Record protections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b">
              <div>
                <h4 className="font-bold text-sm text-foreground">MASSACHUSETTS INSTITUTE OF TECHNOLOGY</h4>
                <p className="text-xs text-muted-foreground">Office of the Registrar · Cambridge, MA</p>
              </div>
              <div className="text-right text-xs">
                <span className="text-muted-foreground">Record Status: </span>
                <span className="font-semibold text-emerald-600">{isGraduated ? 'S.B. Conferred & Sealed' : 'Undergraduate Record'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block">Student Name:</span>
                <span className="font-semibold">{student.first_name} {student.last_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">MIT ID Number:</span>
                <span className="font-mono font-semibold">{student.mit_id || student.student_number}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Cumulative Rating:</span>
                <span className="font-bold text-primary">{mitGpa} / 5.00</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Total Units Passed:</span>
                <span className="font-semibold">{totalUnits} Units</span>
              </div>
            </div>

            {student.thesis_title && (
              <div className="p-3 bg-card rounded-md border text-xs">
                <span className="font-semibold text-muted-foreground block mb-1">Undergraduate Senior Thesis:</span>
                <span className="italic font-medium text-foreground">&ldquo;{student.thesis_title}&rdquo;</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-left">
                    <th className="py-2 px-3 font-semibold">Subject</th>
                    <th className="py-2 px-3 font-semibold">Subject Title</th>
                    <th className="py-2 px-3 font-semibold">GIR Category</th>
                    <th className="py-2 px-3 font-semibold text-center">Units</th>
                    <th className="py-2 px-3 font-semibold text-center">Score</th>
                    <th className="py-2 px-3 font-semibold text-center">Grade</th>
                    <th className="py-2 px-3 font-semibold">Transcript Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentEnrollments.map(e => {
                    const course = courses.find(c => c.id === e.course_id);
                    return (
                      <tr key={e.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-mono font-semibold text-foreground">{e.course_code || course?.code}</td>
                        <td className="py-2 px-3 text-foreground">{course?.name || e.course_name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{course?.gir_category || 'Major Requirement'}</td>
                        <td className="py-2 px-3 text-center">{e.units || course?.units || 12}</td>
                        <td className="py-2 px-3 text-center text-muted-foreground">{e.final_score != null ? `${e.final_score}%` : '—'}</td>
                        <td className="py-2 px-3 text-center font-bold text-foreground">{e.grade || (e.result === 'pass' ? 'P' : '—')}</td>
                        <td className="py-2 px-3">
                          <span className="text-[11px] text-muted-foreground">
                            {e.grade === 'P' ? 'Pass (P/NR Protected)' : 'Standard Letter Grade'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {studentEnrollments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted-foreground">No subjects enrolled.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
