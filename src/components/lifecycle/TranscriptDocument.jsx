import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import { calculateGPA, totalCreditsEarned, SEMESTER_LABELS } from '@/lib/academicUtils';
import { FileText, Printer, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function TranscriptDocument({ student, programmes, courses, enrollments }) {
  const [generating, setGenerating] = useState(false);

  if (!student) return <p className="text-sm text-muted-foreground">Select a student.</p>;

  const programme = programmes.find(p => p.id === student.programme_id || p.id === student.undergraduate_programme_id);
  const studentEnrollments = enrollments.filter(e => e.student_id === student.id);
  const gpa = calculateGPA(studentEnrollments);
  const credits = totalCreditsEarned(studentEnrollments, courses);

  const byYearSem = {};
  studentEnrollments.forEach(e => {
    const key = `Year ${e.year_level || 1} — ${SEMESTER_LABELS[e.semester] || e.semester} (${e.academic_year || 'N/A'})`;
    if (!byYearSem[key]) byYearSem[key] = [];
    byYearSem[key].push(e);
  });

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handlePrint = (docType) => {
    const win = window.open('', '', 'width=900,height=700');
    win.document.write(generateHTML(docType));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const handleDownloadPDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = margin;

      // Header
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('OFFICIAL ACADEMIC TRANSCRIPT', pageW / 2, y, { align: 'center' });
      y += 18;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('Office of the Registrar', pageW / 2, y, { align: 'center' });
      y += 24;

      // Student info box
      doc.setFontSize(9);
      const infoLines = [
        [`Student Name:`, `${student.first_name} ${student.last_name}`, `Student ID:`, `${student.student_number || '—'}`],
        [`Programme:`, `${programme?.name || '—'}`, `Degree:`, `${(programme?.degree_type || '—').replace(/_/g, ' ')}`],
        [`Faculty:`, `${programme?.faculty || '—'}`, `Department:`, `${programme?.department || '—'}`],
        [`Status:`, `${student.status}`, `Date Issued:`, `${today}`],
      ];
      infoLines.forEach(row => {
        doc.setFont(undefined, 'bold');
        doc.text(row[0], margin, y);
        doc.setFont(undefined, 'normal');
        doc.text(row[1], margin + 80, y);
        doc.setFont(undefined, 'bold');
        doc.text(row[2], pageW / 2, y);
        doc.setFont(undefined, 'normal');
        doc.text(row[3], pageW / 2 + 70, y);
        y += 16;
      });
      y += 10;

      // Table header
      const cols = [
        { label: 'Code', x: margin, w: 50 },
        { label: 'Course Name', x: margin + 50, w: 220 },
        { label: 'Credits', x: margin + 270, w: 45, align: 'center' },
        { label: 'Score', x: margin + 315, w: 40, align: 'center' },
        { label: 'Grade', x: margin + 355, w: 40, align: 'center' },
        { label: 'Result', x: margin + 395, w: 75, align: 'center' },
      ];
      const drawTableHeader = () => {
        doc.setFillColor(230, 230, 230);
        doc.rect(margin, y - 12, pageW - margin * 2, 18, 'F');
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        cols.forEach(c => {
          doc.text(c.label.toUpperCase(), c.align === 'center' ? c.x + c.w / 2 : c.x, y, { align: c.align === 'center' ? 'center' : 'left' });
        });
        y += 16;
        doc.setFont(undefined, 'normal');
      };
      drawTableHeader();

      // Course rows grouped by year/semester
      Object.entries(byYearSem).forEach(([group, enrs]) => {
        if (y > pageH - 80) { doc.addPage(); y = margin; drawTableHeader(); }
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 11, pageW - margin * 2, 16, 'F');
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.text(group, margin + 4, y);
        y += 16;
        doc.setFont(undefined, 'normal');

        enrs.forEach(e => {
          if (y > pageH - 60) { doc.addPage(); y = margin; drawTableHeader(); }
          doc.setFontSize(8);
          doc.text(e.course_code || '', cols[0].x, y);
          doc.text((e.course_name || '').substring(0, 38), cols[1].x, y);
          const course = courses.find(c => c.id === e.course_id);
          doc.text(String(course?.credits || ''), cols[2].x + cols[2].w / 2, y, { align: 'center' });
          doc.text(e.final_score != null ? `${e.final_score}%` : '—', cols[3].x + cols[3].w / 2, y, { align: 'center' });
          doc.text(e.grade || '—', cols[4].x + cols[4].w / 2, y, { align: 'center' });
          doc.text((e.result || 'pending').replace(/_/g, ' '), cols[5].x + cols[5].w / 2, y, { align: 'center' });
          y += 15;
          doc.setDrawColor(238, 238, 238);
          doc.line(margin, y - 4, pageW - margin, y - 4);
        });
      });

      if (studentEnrollments.length === 0) {
        doc.text('No academic records found.', pageW / 2, y, { align: 'center' });
        y += 20;
      }

      // Summary
      if (y > pageH - 120) { doc.addPage(); y = margin; }
      y += 16;
      doc.setFillColor(249, 249, 249);
      doc.rect(margin, y - 12, pageW - margin * 2, 70, 'F');
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('ACADEMIC SUMMARY', margin + 10, y);
      y += 18;
      doc.setFont(undefined, 'normal');
      const summaryLines = [
        [`Cumulative GPA:`, `${gpa}`],
        [`Total Credits Earned:`, `${credits} / ${programme?.total_credits || 120}`],
        [`Courses Completed:`, `${studentEnrollments.filter(e => e.status !== 'enrolled').length}`],
      ];
      summaryLines.forEach(([label, val]) => {
        doc.text(label, margin + 10, y);
        doc.setFont(undefined, 'bold');
        doc.text(val, margin + 150, y);
        doc.setFont(undefined, 'normal');
        y += 14;
      });

      if (student.status === 'graduated') {
        y += 6;
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 128, 0);
        doc.text('STATUS: GRADUATED', margin + 10, y);
        doc.setTextColor(0, 0, 0);
      }

      // Footer
      const footerY = pageH - 50;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, footerY, pageW - margin, footerY);
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('This is an official computer-generated transcript and is valid without a signature.', pageW / 2, footerY + 12, { align: 'center' });
      doc.text(`Generated on ${today}`, pageW / 2, footerY + 22, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      const fileName = `Transcript_${student.first_name}_${student.last_name}_${student.student_number || student.id}.pdf`;
      doc.save(fileName);
    } finally {
      setGenerating(false);
    }
  };

  const generateHTML = (docType) => {
    const isTranscript = docType === 'transcript';
    const title = isTranscript ? 'ACADEMIC TRANSCRIPT' : 'ACADEMIC PROGRESS REPORT';
    const rows = Object.entries(byYearSem).map(([group, enrs]) => {
      const courseRows = enrs.map(e => {
        const course = courses.find(c => c.id === e.course_id);
        return `<tr><td>${e.course_code || ''}</td><td>${e.course_name || ''}</td><td style="text-align:center">${course?.credits || ''}</td><td style="text-align:center">${e.final_score != null ? e.final_score : '—'}</td><td style="text-align:center">${e.grade || '—'}</td><td style="text-align:center">${e.result || 'pending'}</td></tr>`;
      }).join('');
      return `<tr><td colspan="6" style="background:#f5f5f5;font-weight:bold;padding:6px 8px">${group}</td></tr>${courseRows}`;
    }).join('');

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return `<html><head><title>${title}</title><style>
      body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a;max-width:800px;margin:0 auto}
      h1{text-align:center;font-size:20px;margin:0 0 4px}
      .subtitle{text-align:center;font-size:13px;color:#666;margin-bottom:24px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;font-size:13px}
      .info-grid div{padding:2px 0}
      .label{color:#666;display:inline-block;width:100px}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{background:#e8e8e8;padding:8px;text-align:left;font-size:11px;text-transform:uppercase}
      td{padding:6px 8px;font-size:12px;border-bottom:1px solid #eee}
      .summary{margin-top:24px;padding:16px;background:#f9f9f9;border-radius:6px;font-size:13px}
      .summary div{display:flex;justify-content:space-between;padding:3px 0}
      .footer{margin-top:48px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:16px}
      .seal{text-align:center;margin-top:32px;font-size:12px;color:#666}
    </style></head><body>
      <h1>${title}</h1>
      <div class="subtitle">${programme?.name || ''} ${programme?.code ? `(${programme.code})` : ''}</div>
      <div class="info-grid">
        <div><span class="label">Name:</span> ${student.first_name} ${student.last_name}</div>
        <div><span class="label">Student ID:</span> ${student.student_number || '—'}</div>
        <div><span class="label">Programme:</span> ${programme?.name || '—'}</div>
        <div><span class="label">Degree:</span> ${programme?.degree_type || '—'}</div>
        <div><span class="label">Status:</span> ${student.status}</div>
        <div><span class="label">Date:</span> ${today}</div>
      </div>
      <table>
        <thead><tr><th>Code</th><th>Course Name</th><th>Credits</th><th>Score</th><th>Grade</th><th>Result</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px">No academic records</td></tr>'}</tbody>
      </table>
      <div class="summary">
        <div><span><strong>Cumulative GPA:</strong></span><strong>${gpa}</strong></div>
        <div><span>Total Credits Earned:</span><span>${credits} / ${programme?.total_credits || 120}</span></div>
        <div><span>Courses Completed:</span><span>${studentEnrollments.filter(e => e.status !== 'enrolled').length}</span></div>
        ${student.status === 'graduated' ? '<div><span>Graduation Status:</span><strong style="color:green">GRADUATED</strong></div>' : ''}
      </div>
      <div class="seal">This document is computer-generated and valid without signature.</div>
      <div class="footer">Generated on ${today} · ${programme?.name || 'University'}</div>
    </body></html>`;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleDownloadPDF} size="sm" disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
          {generating ? 'Generating...' : 'Download PDF'}
        </Button>
        <Button onClick={() => handlePrint('transcript')} variant="outline" size="sm"><Printer className="w-4 h-4 mr-1" /> Print Transcript</Button>
        <Button onClick={() => handlePrint('progress')} variant="outline" size="sm"><Printer className="w-4 h-4 mr-1" /> Print Progress Report</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold font-heading">ACADEMIC TRANSCRIPT</h2>
            <p className="text-sm text-muted-foreground">{programme?.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div><p><span className="text-muted-foreground">Name:</span> {student.first_name} {student.last_name}</p><p><span className="text-muted-foreground">Student ID:</span> {student.student_number}</p></div>
            <div><p><span className="text-muted-foreground">Programme:</span> {programme?.name}</p><p><span className="text-muted-foreground">Status:</span> <StatusBadge status={student.status} /></p></div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr className="text-xs uppercase text-muted-foreground">
                <th className="text-left p-2">Code</th><th className="text-left p-2">Course</th><th className="text-center p-2">Credits</th><th className="text-center p-2">Score</th><th className="text-center p-2">Grade</th><th className="text-center p-2">Result</th>
              </tr></thead>
              <tbody>
                {Object.entries(byYearSem).map(([group, enrs]) => (
                  <React.Fragment key={group}>
                    <tr className="bg-muted/30"><td colSpan={6} className="font-semibold text-xs p-2">{group}</td></tr>
                    {enrs.map(e => {
                      const course = courses.find(c => c.id === e.course_id);
                      return (
                        <tr key={e.id} className="border-t">
                          <td className="p-2 font-mono text-xs">{e.course_code}</td><td className="p-2">{e.course_name}</td>
                          <td className="p-2 text-center">{course?.credits || ''}</td>
                          <td className="p-2 text-center">{e.final_score != null ? `${e.final_score}%` : '—'}</td>
                          <td className="p-2 text-center font-bold">{e.grade || '—'}</td>
                          <td className="p-2 text-center"><StatusBadge status={e.result || 'pending'} /></td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
                {studentEnrollments.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground py-6">No academic records</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-1 text-sm">
            <div className="flex justify-between"><span>Cumulative GPA:</span><strong>{gpa}</strong></div>
            <div className="flex justify-between"><span>Total Credits Earned:</span><span>{credits} / {programme?.total_credits || 120}</span></div>
            <div className="flex justify-between"><span>Courses Completed:</span><span>{studentEnrollments.filter(e => e.status !== 'enrolled').length}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}