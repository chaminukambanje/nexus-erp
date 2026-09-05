import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserCheck, ShieldCheck, Mail, Phone, Calendar, Compass, BookOpen, CheckCircle2, Award, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function MITMatriculationAdvising({ student, onUpdate }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [advisorName, setAdvisorName] = useState(student?.first_year_advisor || 'Prof. Gerald Sussman');
  const [associateAdvisor, setAssociateAdvisor] = useState(student?.associate_advisor || "Alex Chen '27");
  const [seminar, setSeminar] = useState(student?.uac_seminar || 'SP.210 - The Joy of Engineering');

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!student) return;
      return base44.entities.Student.update(student.id, {
        first_year_advisor: advisorName,
        associate_advisor: associateAdvisor,
        uac_seminar: seminar
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']);
      toast.success('UAC First-Year Advising details updated successfully.');
      setEditing(false);
      if (onUpdate) onUpdate();
    }
  });

  const mitId = student?.mit_id || student?.student_number || '928410293';
  const kerberos = student?.kerberos_id || (student?.first_name?.[0] + (student?.last_name || '')).toLowerCase();

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-red-500/10 via-primary/5 to-transparent p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">Phase 1: Matriculation & First-Year Advising (UAC)</span>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
              First-Year (Undeclared)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            All incoming undergraduates enter MIT undeclared and are supported by the Undergraduate Advising Center (UAC) with dedicated faculty and peer advising.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs py-1 px-2.5 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          Matriculated & Kerberos Active
        </Badge>
      </div>

      {/* Grid: Institute Identity & UAC Advising Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Institute Credentials */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Official MIT Institute Identity
            </CardTitle>
            <CardDescription className="text-xs">
              Registrar authenticated student credentials and Institute network access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">MIT ID Number:</span>
              <span className="font-mono font-bold text-foreground text-sm bg-muted/50 px-2 py-0.5 rounded">{mitId}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Kerberos Username:</span>
              <span className="font-mono text-primary font-semibold">{kerberos}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Institute Email:</span>
              <span className="font-mono text-foreground">{student?.email || `${kerberos}@mit.edu`}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Matriculation Cohort:</span>
              <span className="font-medium text-foreground">{student?.class_year || 'Class of 2030'} ({student?.cohort_year || '2026'})</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">First-Year Major Status:</span>
              <Badge variant="outline" className="text-[11px] font-mono">Course 0 (Undeclared)</Badge>
            </div>
          </CardContent>
        </Card>

        {/* UAC Advising Cohort */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                Undergraduate Advising Center (UAC)
              </CardTitle>
              <CardDescription className="text-xs">
                Assigned faculty advisor and upper-class associate advisor
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)} className="text-xs h-7">
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">Faculty Advisor:</label>
                  <Input value={advisorName} onChange={e => setAdvisorName(e.target.value)} className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">Associate Advisor (Peer):</label>
                  <Input value={associateAdvisor} onChange={e => setAssociateAdvisor(e.target.value)} className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium">Advising Seminar:</label>
                  <Input value={seminar} onChange={e => setSeminar(e.target.value)} className="h-8 text-xs mt-1" />
                </div>
                <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="w-full text-xs h-8 mt-2">
                  Save Advising Team
                </Button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Faculty Advisor:</span>
                  <div className="text-right">
                    <span className="font-semibold text-foreground block">{student?.first_year_advisor || advisorName}</span>
                    <span className="text-[10px] text-muted-foreground">Dept. of EECS (32-G492)</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Associate Advisor:</span>
                  <div className="text-right">
                    <span className="font-medium text-foreground block">{student?.associate_advisor || associateAdvisor}</span>
                    <span className="text-[10px] text-muted-foreground">Undergraduate Peer Mentor</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Advising Seminar:</span>
                  <span className="font-medium text-primary text-right max-w-[200px] truncate">{student?.uac_seminar || seminar}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Advising Check-ins:</span>
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Bi-weekly schedule active
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MIT First-Year Orientation & Readiness Checklist */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            First-Year Orientation & Academic Readiness Milestones
          </CardTitle>
          <CardDescription className="text-xs">
            Prerequisites and administrative clearances required prior to initial registration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg border bg-muted/30 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground block">Enrollment Deposit & Aid</span>
                <span className="text-muted-foreground text-[11px]">Financial aid package accepted and clearance granted.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground block">Advanced Standing (ASE)</span>
                <span className="text-muted-foreground text-[11px]">Math Diagnostic and 18.01 ASE placement evaluated.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground block">First-Year Residence</span>
                <span className="text-muted-foreground text-[11px]">Housing lottery completed (Maseeh Hall).</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground block">GIR Science Core Plan</span>
                <span className="text-muted-foreground text-[11px]">18.01, 8.01, 5.111 schedule reviewed with advisor.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground block">FEAST / Pre-Orientation</span>
                <span className="text-muted-foreground text-[11px]">FPOP academic pre-orientation program completed.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground block">Swim Test & PE Points</span>
                <span className="text-muted-foreground text-[11px]">{student?.swim_test_passed ? 'Swim test passed (Alumni Pool)' : 'Scheduled for Orientation Week'}.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
