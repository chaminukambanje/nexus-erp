import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldAlert, TrendingUp, Award, CheckCircle2, AlertTriangle, FileText, Send, UserCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateMITGPA, evaluateMITCAPStanding } from '@/lib/academicUtils';

export default function MITCAPAcademicStanding({ student, enrollments = [], onUpdate }) {
  const qc = useQueryClient();
  const [showPetitionModal, setShowPetitionModal] = useState(false);
  const [petitionType, setPetitionType] = useState('Late Drop of Subject');
  const [petitionReason, setPetitionReason] = useState('');

  const studentEnrollments = enrollments.filter(e => e.student_id === student?.id);
  const mitGpa = calculateMITGPA(studentEnrollments);
  const capEvaluation = evaluateMITCAPStanding(student, studentEnrollments);

  const submitPetitionMutation = useMutation({
    mutationFn: async () => {
      if (!student) return;
      return base44.entities.Student.update(student.id, {
        cap_petition: `${petitionType}: ${petitionReason} (Pending CAP Review)`,
        cap_petition_status: 'pending_cap_review'
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']);
      toast.success('Academic petition formally submitted to the Committee on Academic Performance (CAP).');
      setShowPetitionModal(false);
      setPetitionReason('');
      if (onUpdate) onUpdate();
    }
  });

  const ruleOnStandingMutation = useMutation({
    mutationFn: async (newStanding) => {
      if (!student) return;
      return base44.entities.Student.update(student.id, {
        cap_standing: newStanding,
        cap_status_label: newStanding === 'good_standing' ? 'Good Standing' : (newStanding === 'dean_list' ? 'Dean\'s List / High Standing' : 'CAP Academic Warning')
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']);
      toast.success('CAP Standing decision updated and recorded.');
      if (onUpdate) onUpdate();
    }
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-foreground">Phase 5: Academic Standing & CAP Review</span>
            <Badge className={capEvaluation.badgeColor}>
              {capEvaluation.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {capEvaluation.description}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPetitionModal(!showPetitionModal)}
            className="text-xs h-8 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            File CAP Petition
          </Button>
        </div>
      </div>

      {/* KPI Cards: MIT 5.0 Rating */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Cumulative Rating (5.0 Scale)</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-primary">{mitGpa.toFixed(2)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              MIT Official Scale: A=5.0, B=4.0, C=3.0, D=2.0, F=0.0
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Term Units Load</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-foreground">
              {studentEnrollments.reduce((sum, e) => sum + (e.units || 12), 0)} Units
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Standard full-time load: &ge; 36 units (typically 48 units)
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>CAP Status Determination</span>
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-base font-bold text-foreground truncate mt-1">
              {capEvaluation.label}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              Required: {capEvaluation.actionRequired}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Petition Modal / Form */}
      {showPetitionModal && (
        <Card className="shadow-xs border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              Submit Formal Academic Petition to CAP
            </CardTitle>
            <CardDescription className="text-xs">
              Petitions are reviewed bi-weekly by the Committee on Academic Performance and Faculty Officers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">Petition Category:</label>
              <select
                value={petitionType}
                onChange={e => setPetitionType(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border text-xs bg-background text-foreground"
              >
                <option value="Late Drop of Subject">Late Drop of Subject (Post-Drop Date Exception)</option>
                <option value="Credit Overload Limit Waiver">Credit Overload Limit Waiver (&gt; 54/60 units)</option>
                <option value="Light Load Authorization">Light Load Authorization (&lt; 36 units)</option>
                <option value="General Institute Requirement Substitution">GIR Requirement Substitution Petition</option>
                <option value="Medical / Personal Leave of Absence">Medical / Personal Leave of Absence</option>
                <option value="Readmission after Required Withdrawal">Readmission after Required Withdrawal (RTW)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium block mb-1">Detailed Rationale & Advisor Endorsement:</label>
              <Input
                value={petitionReason}
                onChange={e => setPetitionReason(e.target.value)}
                placeholder="State academic justification and confirm consultation with your Faculty Advisor..."
                className="h-8 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowPetitionModal(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => submitPetitionMutation.mutate()}
                disabled={submitPetitionMutation.isPending || !petitionReason.trim()}
                className="h-8 text-xs gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Petition
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Petitions & Committee Review Records */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Committee on Academic Performance (CAP) Ledger
          </CardTitle>
          <CardDescription className="text-xs">
            Official record of standing evaluations, warnings, and approved petitions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {student?.cap_petition ? (
            <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Active Petition</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                    {student?.cap_petition_status || 'Under Review'}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-[11px]">{student.cap_petition}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => ruleOnStandingMutation.mutate('good_standing')}
                className="h-7 text-xs shrink-0"
              >
                Approve Petition
              </Button>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg border bg-muted/20 text-muted-foreground text-center text-xs">
              No active CAP petitions pending review. Student records in compliance.
            </div>
          )}

          <div className="pt-2 flex items-center justify-between border-t text-[11px] text-muted-foreground">
            <span>Advisor Check-in Requirement:</span>
            <span className="font-medium text-foreground">
              {capEvaluation.status === 'cap_warning' ? 'Mandatory Bi-Weekly (Active)' : 'Standard Term Registration'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
