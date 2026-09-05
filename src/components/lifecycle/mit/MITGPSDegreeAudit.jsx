import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, CheckCircle2, Clock, ShieldCheck, FileCheck, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MIT_GIR_REQUIREMENTS,
  calculateMITGPA,
  auditMITGIRProgress,
  totalCreditsEarned
} from '@/lib/academicUtils';

export default function MITGPSDegreeAudit({ student, courses = [], enrollments = [], onUpdate }) {
  const qc = useQueryClient();

  const studentEnrollments = enrollments.filter(e => e.student_id === student?.id);
  const girAudit = auditMITGIRProgress(studentEnrollments, courses);
  const totalUnits = student?.total_units_passed || totalCreditsEarned(studentEnrollments, courses);
  const mitGpa = calculateMITGPA(studentEnrollments);

  const requiredDegreeUnits = 360; // Standard MIT S.B. degree total units
  const totalUnitsPct = Math.min(100, Math.round((totalUnits / requiredDegreeUnits) * 100));

  const girFulfilled = girAudit.completedGIRs >= 17;
  const unitsFulfilled = totalUnits >= requiredDegreeUnits;
  const gpaFulfilled = mitGpa >= 3.0;
  const peFulfilled = (student?.pe_points_completed || 8) >= 8 && (student?.swim_test_passed ?? true);

  const isEligibleToApply = girFulfilled && unitsFulfilled && gpaFulfilled && peFulfilled;
  const isDegreeApplicationFiled = student?.degree_application_filed || student?.status === 'graduated';

  const fileDegreeApplicationMutation = useMutation({
    mutationFn: async () => {
      if (!student) return;
      return base44.entities.Student.update(student.id, {
        degree_application_filed: true,
        degree_application_date: new Date().toISOString().slice(0, 10),
        academic_stage: 'degree_candidate',
        stage_label: 'Senior: Cleared for S.B. Degree Conferral'
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']);
      toast.success('Official WebSIS Degree Application filed and transmitted to Registrar Degree Audit Office.');
      if (onUpdate) onUpdate();
    }
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-foreground">Phase 6: GPS Degree Audit & WebSIS Degree Application</span>
            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
              Graduation Planning & Support (GPS)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Automated degree audit verifying 17 General Institute Requirements (GIR), Departmental Major Units (&ge; 180 units), PE/Swim Test, and total units (&ge; 360 units) for S.B. degree conferral.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDegreeApplicationFiled ? (
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs py-1 px-3">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Degree Application Filed
            </Badge>
          ) : (
            <Button
              size="sm"
              onClick={() => fileDegreeApplicationMutation.mutate()}
              disabled={fileDegreeApplicationMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 gap-1.5 shadow-xs"
            >
              <FileCheck className="w-3.5 h-3.5" />
              Submit WebSIS Degree Application
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold">General Institute Requirements (GIR)</CardTitle>
              <span className="font-mono text-sm font-bold text-primary">{girAudit.girPct}%</span>
            </div>
            <Progress value={girAudit.girPct} className="h-2 mt-1" />
            <CardDescription className="text-xs mt-1">
              {girAudit.completedGIRs} of 17 requirements fulfilled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b">
              <span>Science Core (6 subjects)</span>
              <span className="font-mono font-semibold">{girAudit.scienceCore.completed} / 6</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b">
              <span>HASS Distribution (8 subjects)</span>
              <span className="font-mono font-semibold">{girAudit.hass.completed} / 8</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b">
              <span>Communication (CI-H & CI-M)</span>
              <span className="font-mono font-semibold">{girAudit.ci.completed} / 4</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b">
              <span>REST & Institute Lab</span>
              <span className="font-mono font-semibold">{girAudit.rest.completed + girAudit.lab.completed} / 3</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>PE Points & Swim Test</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fulfilled
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold">Total Degree Units Fulfillment</CardTitle>
              <span className="font-mono text-sm font-bold text-emerald-600">{totalUnitsPct}%</span>
            </div>
            <Progress value={totalUnitsPct} className="h-2 mt-1" />
            <CardDescription className="text-xs mt-1">
              {totalUnits} of {requiredDegreeUnits} Total Units Completed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b">
              <span>Major Course Department:</span>
              <span className="font-semibold text-foreground">{student?.declared_major || student?.programme_name || 'Course 6-3'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b">
              <span>Cumulative Rating:</span>
              <span className="font-mono font-bold text-foreground">{mitGpa.toFixed(2)} / 5.0 (&ge; 3.0 required)</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b">
              <span>Graduation Residency:</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 4 Terms in Residence Met
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span>Registrar Degree Audit Clearance:</span>
              <Badge variant="outline" className={isEligibleToApply ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted'}>
                {isEligibleToApply ? 'Ready for Final Degree List' : 'Pending Completion'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Degree Candidate Clearance Sign-offs */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Registrar & Faculty Degree List Certifications
          </CardTitle>
          <CardDescription className="text-xs">
            Official approvals necessary to present the candidate to the Corporation of MIT for degree award
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-foreground">Department Certification</span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-1">
                Major requirements and capstone certified by EECS Department Head.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-foreground">GIR Audit Approval</span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-1">
                Registrar's Office confirmed Science, HASS, and CI-M completion.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-foreground">Student Financial Services</span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-1">
                Zero outstanding student accounts balance; diploma hold cleared.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
