import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudentProfileHeader from '@/components/student-portal/StudentProfileHeader';
import AcademicProgressTab from '@/components/student-portal/AcademicProgressTab';
import BillingStatementTab from '@/components/student-portal/BillingStatementTab';
import TranscriptDocument from '@/components/lifecycle/TranscriptDocument';
import { GraduationCap, FileText, DollarSign, BookOpen } from 'lucide-react';

export default function StudentPortal() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => {
      base44.entities.Student.filter({ email: user.email }).then(students => {
        setStudent(students[0] || null);
        setLoading(false);
      }).catch(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, []);

  const { data: enrollments = [] } = useQuery({ queryKey: ['enrollments'], queryFn: () => base44.entities.Enrollment.list('-created_date', 500), enabled: !!student });
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: () => base44.entities.Course.list(), enabled: !!student });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes'], queryFn: () => base44.entities.Programme.list(), enabled: !!student });
  const { data: invoices = [] } = useQuery({ queryKey: ['salesInvoices'], queryFn: () => base44.entities.SalesInvoice.list('-created_date', 200), enabled: !!student });

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading your portal...</div>;

  if (!student) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card><CardContent className="py-16 text-center">
          <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No student record found for your account.</p>
          <p className="text-xs text-muted-foreground mt-1">Please contact the registrar's office.</p>
        </CardContent></Card>
      </div>
    );
  }

  const studentEnrollments = enrollments.filter(e => e.student_id === student.id);
  const studentInvoices = invoices.filter(i => i.customer_id === student.customer_id);
  const programme = programmes.find(p => p.id === student.programme_id || p.id === student.undergraduate_programme_id);
  const totalBilled = studentInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPaid = studentInvoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const balance = totalBilled - totalPaid;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Student Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">Your academic record and billing — read only</p>
      </div>

      <StudentProfileHeader
        student={student}
        programme={programme}
        enrollments={studentEnrollments}
        courses={courses}
        balance={balance}
      />

      <Tabs defaultValue="academic">
        <TabsList>
          <TabsTrigger value="academic" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Academic Progress</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Billing Statement</TabsTrigger>
          <TabsTrigger value="transcript" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Transcript</TabsTrigger>
        </TabsList>

        <TabsContent value="academic" className="mt-4">
          <AcademicProgressTab enrollments={studentEnrollments} courses={courses} />
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <BillingStatementTab invoices={studentInvoices} />
        </TabsContent>

        <TabsContent value="transcript" className="mt-4">
          <TranscriptDocument student={student} programmes={programmes} courses={courses} enrollments={studentEnrollments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}