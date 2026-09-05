import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/shared/StatusBadge';
import { useToast } from '@/components/ui/use-toast';
import { SEMESTER_LABELS, getCoursePrice } from '@/lib/academicUtils';
import { format } from 'date-fns';
import { BookOpen, DollarSign, CheckCircle, GraduationCap } from 'lucide-react';

export default function EnrollmentBilling({ student, programmes, courses, enrollments, programmeEnrollments, items }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [semester, setSemester] = useState(student?.current_semester || 'semester_1');
  const [yearLevel, setYearLevel] = useState(student?.current_year || 1);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  const progId = student?.programme_id || student?.undergraduate_programme_id;
  const programme = programmes.find(p => p.id === progId);
  const hasProgrammeEnrollment = programmeEnrollments.some(pe => pe.student_id === student?.id && pe.status === 'active');
  const studentEnrollments = enrollments.filter(e => e.student_id === student?.id);

  const availableCourses = courses.filter(c => {
    if (c.programme_id !== progId) return false;
    if (c.year_level !== yearLevel) return false;
    if (c.status !== 'active') return false;
    return !studentEnrollments.some(e => e.course_id === c.id && e.academic_year === academicYear && e.semester === semester && e.status === 'enrolled');
  });

  const toggleCourse = (id) => setSelectedCourseIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const allocateProgrammeMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ProgrammeEnrollment.create({
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        student_number: student.student_number,
        programme_id: programme.id,
        programme_code: programme.code,
        programme_name: programme.name,
        programme_level: programme.level,
        intake_year: student.intake_year,
        enrollment_date: student.enrollment_date || new Date().toISOString().slice(0, 10),
        current_year: student.current_year || 1,
        status: 'active',
      });
      await base44.entities.Student.update(student.id, { status: 'enrolled' });
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']);
      qc.invalidateQueries(['programmeEnrollments']);
      toast({ title: 'Programme allocated', description: `${programme?.name} assigned to ${student.first_name}` });
    }
  });

  const enrollAndBillMutation = useMutation({
    mutationFn: async () => {
      const selectedCourses = courses.filter(c => selectedCourseIds.includes(c.id));
      for (const course of selectedCourses) {
        await base44.entities.Enrollment.create({
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          student_number: student.student_number,
          course_id: course.id,
          course_code: course.code,
          course_name: course.name,
          programme_id: progId,
          academic_year: academicYear,
          semester,
          year_level: yearLevel,
          status: 'enrolled',
        });
      }
      const lines = selectedCourses.map(c => {
        const price = getCoursePrice(c, items);
        return { item_id: c.id, item_name: `${c.code} — ${c.name}`, description: `Course enrollment: ${SEMESTER_LABELS[semester]} ${academicYear}, Year ${yearLevel}`, quantity: 1, unit_price: price, discount_percent: 0, tax_percent: 0, line_total: price };
      });
      const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
      if (subtotal > 0 && student.customer_id) {
        await base44.entities.SalesInvoice.create({
          invoice_number: `INV-${String(Date.now()).slice(-6)}`,
          customer_id: student.customer_id,
          customer_name: `${student.first_name} ${student.last_name}`,
          invoice_date: format(new Date(), 'yyyy-MM-dd'),
          due_date: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
          status: 'sent',
          lines, subtotal, tax_amount: 0, discount_amount: 0, total_amount: subtotal,
          amount_paid: 0, balance_due: subtotal,
          notes: `Course enrollment: ${SEMESTER_LABELS[semester]} ${academicYear}`,
          payment_terms: 'net_30', currency: programme?.currency || 'USD',
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['enrollments']);
      qc.invalidateQueries(['salesInvoices']);
      setSelectedCourseIds([]);
      toast({ title: `${selectedCourseIds.length} course(s) enrolled & invoiced` });
    }
  });

  if (!student) return <p className="text-sm text-muted-foreground">Select a student to manage enrollment.</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Programme Allocation</CardTitle></CardHeader>
        <CardContent>
          {programme ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{programme.name}</p>
                <p className="text-xs text-muted-foreground">{programme.code} · {programme.degree_type} · {programme.level}</p>
              </div>
              {hasProgrammeEnrollment ? <StatusBadge status="active" /> : (
                <Button size="sm" onClick={() => allocateProgrammeMutation.mutate()} disabled={allocateProgrammeMutation.isPending}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Allocate Programme
                </Button>
              )}
            </div>
          ) : <p className="text-sm text-muted-foreground">No programme assigned.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" /> Course Enrollment & Billing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Academic Year</Label><Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="mt-1" /></div>
            <div>
              <Label className="text-xs">Semester</Label>
              <Select value={semester} onValueChange={setSemester}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SEMESTER_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">Year Level</Label><Input type="number" value={yearLevel} onChange={e => setYearLevel(parseInt(e.target.value) || 1)} className="mt-1" /></div>
          </div>
          {availableCourses.length > 0 ? (
            <div className="space-y-2">
              {availableCourses.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50">
                  <Checkbox checked={selectedCourseIds.includes(c.id)} onCheckedChange={() => toggleCourse(c.id)} />
                  <div className="flex-1"><p className="text-sm font-medium">{c.code} — {c.name}</p><p className="text-xs text-muted-foreground">{c.credits} credits · {c.type}</p></div>
                  <span className="text-sm font-medium">${getCoursePrice(c, items).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-4">No courses available for this year/semester.</p>}
          {selectedCourseIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div><p className="text-sm font-medium">{selectedCourseIds.length} course(s) selected</p><p className="text-xs text-muted-foreground">Total: ${selectedCourseIds.reduce((s, id) => s + getCoursePrice(courses.find(c => c.id === id), items), 0).toFixed(2)}</p></div>
              <Button onClick={() => enrollAndBillMutation.mutate()} disabled={enrollAndBillMutation.isPending}><DollarSign className="w-4 h-4 mr-1" /> Enroll & Generate Invoice</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Current Enrollments</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {studentEnrollments.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No enrollments yet.</p> : studentEnrollments.map(e => (
              <div key={e.id} className="flex items-center justify-between px-4 py-2">
                <div><p className="text-sm font-medium">{e.course_code} — {e.course_name}</p><p className="text-xs text-muted-foreground">Year {e.year_level} · {SEMESTER_LABELS[e.semester] || e.semester} · {e.academic_year}</p></div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}