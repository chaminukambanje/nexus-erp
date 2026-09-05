import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/shared/StatusBadge';
import { useToast } from '@/components/ui/use-toast';
import { SEMESTER_LABELS, getCoursePrice } from '@/lib/academicUtils';
import { format } from 'date-fns';
import { RotateCcw, DollarSign, AlertTriangle } from 'lucide-react';

export default function RepeatStage({ student, programmes, courses, enrollments, items }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedFailedIds, setSelectedFailedIds] = useState([]);
  const [repeatSemester, setRepeatSemester] = useState('semester_1');
  const [repeatYear, setRepeatYear] = useState(new Date().getFullYear().toString());

  const progId = student?.programme_id || student?.undergraduate_programme_id;
  const programme = programmes.find(p => p.id === progId);
  const failedEnrollments = enrollments.filter(e => e.student_id === student?.id && (e.status === 'failed' || e.result === 'fail'));

  const toggleFailed = (id) => setSelectedFailedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const repeatCoursesMutation = useMutation({
    mutationFn: async () => {
      if (!student) return;
      const selected = failedEnrollments.filter(e => selectedFailedIds.includes(e.id));
      for (const enr of selected) {
        const course = courses.find(c => c.id === enr.course_id);
        await base44.entities.Enrollment.create({
          student_id: student.id, student_name: `${student.first_name} ${student.last_name}`, student_number: student.student_number,
          course_id: course.id, course_code: course.code, course_name: course.name,
          programme_id: progId, academic_year: repeatYear, semester: repeatSemester, year_level: student.current_year,
          status: 'enrolled',
        });
        const price = getCoursePrice(course, items);
        if (price > 0 && student.customer_id) {
          await base44.entities.SalesInvoice.create({
            invoice_number: `INV-${String(Date.now()).slice(-6)}-${course.code}`,
            customer_id: student.customer_id, customer_name: `${student.first_name} ${student.last_name}`,
            invoice_date: format(new Date(), 'yyyy-MM-dd'), due_date: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
            status: 'sent',
            lines: [{ item_id: course.id, item_name: `${course.code} — ${course.name} (Repeat)`, description: `Repeat course: ${SEMESTER_LABELS[repeatSemester]} ${repeatYear}`, quantity: 1, unit_price: price, discount_percent: 0, tax_percent: 0, line_total: price }],
            subtotal: price, tax_amount: 0, discount_amount: 0, total_amount: price, amount_paid: 0, balance_due: price,
            notes: `Repeat course: ${course.code}`, payment_terms: 'net_30', currency: programme?.currency || 'USD',
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['enrollments']); qc.invalidateQueries(['salesInvoices']);
      setSelectedFailedIds([]);
      toast({ title: 'Repeat courses enrolled & invoiced' });
    }
  });

  const repeatProgrammeMutation = useMutation({
    mutationFn: async () => {
      if (!student) return;
      await base44.entities.ProgrammeEnrollment.create({
        student_id: student.id, student_name: `${student.first_name} ${student.last_name}`, student_number: student.student_number,
        programme_id: programme.id, programme_code: programme.code, programme_name: programme.name, programme_level: programme.level,
        intake_year: new Date().getFullYear().toString(), enrollment_date: new Date().toISOString().slice(0, 10),
        current_year: 1, status: 'active', notes: 'Programme repeat',
      });
      await base44.entities.Student.update(student.id, { current_year: 1, current_semester: 'semester_1', status: 'enrolled' });
      if (programme.annual_fee > 0 && student.customer_id) {
        await base44.entities.SalesInvoice.create({
          invoice_number: `INV-${String(Date.now()).slice(-6)}-PROG`,
          customer_id: student.customer_id, customer_name: `${student.first_name} ${student.last_name}`,
          invoice_date: format(new Date(), 'yyyy-MM-dd'), due_date: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
          status: 'sent',
          lines: [{ item_name: `${programme.name} — Repeat Programme Fee`, description: 'Programme repeat enrollment fee', quantity: 1, unit_price: programme.annual_fee, discount_percent: 0, tax_percent: 0, line_total: programme.annual_fee }],
          subtotal: programme.annual_fee, tax_amount: 0, discount_amount: 0, total_amount: programme.annual_fee, amount_paid: 0, balance_due: programme.annual_fee,
          notes: 'Programme repeat fee', payment_terms: 'net_30', currency: programme.currency || 'USD',
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']); qc.invalidateQueries(['programmeEnrollments']); qc.invalidateQueries(['salesInvoices']);
      toast({ title: 'Programme repeat processed & invoiced' });
    }
  });

  if (!student) return <p className="text-sm text-muted-foreground">Select a student.</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Repeat Failed Courses</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {failedEnrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No failed courses. Great!</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Repeat Year</Label><Input value={repeatYear} onChange={e => setRepeatYear(e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs">Repeat Semester</Label><Select value={repeatSemester} onValueChange={setRepeatSemester}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SEMESTER_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="space-y-2">
                {failedEnrollments.map(e => {
                  const course = courses.find(c => c.id === e.course_id);
                  return (
                    <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50">
                      <Checkbox checked={selectedFailedIds.includes(e.id)} onCheckedChange={() => toggleFailed(e.id)} />
                      <div className="flex-1"><p className="text-sm font-medium">{e.course_code} — {e.course_name}</p><p className="text-xs text-muted-foreground">Score: {e.final_score || 0}% · Grade: {e.grade}</p></div>
                      <span className="text-sm font-medium">${getCoursePrice(course, items).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              {selectedFailedIds.length > 0 && (
                <Button onClick={() => repeatCoursesMutation.mutate()} disabled={repeatCoursesMutation.isPending}><DollarSign className="w-4 h-4 mr-1" /> Re-enroll & Bill {selectedFailedIds.length} Course(s)</Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Repeat Programme</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Reset the student to Year 1 and generate a programme repeat fee invoice. Use only when a student must restart the entire programme.</p>
          <Button variant="destructive" onClick={() => repeatProgrammeMutation.mutate()} disabled={repeatProgrammeMutation.isPending || !programme}><RotateCcw className="w-4 h-4 mr-1" /> Repeat Programme ({programme?.name})</Button>
          {programme?.annual_fee > 0 && <p className="text-xs text-muted-foreground mt-2">Programme fee: ${programme.annual_fee}</p>}
        </CardContent>
      </Card>
    </div>
  );
}