import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, FlaskConical, Sparkles, CheckCircle2, Clock, Plus, UserCheck, ShieldAlert, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function MITRegistrationIAPUROP({ student, onUpdate }) {
  const qc = useQueryClient();

  const [showUropModal, setShowUropModal] = useState(false);
  const [uropForm, setUropForm] = useState({
    title: '',
    faculty_supervisor: student?.departmental_advisor || 'Prof. Shafi Goldwasser',
    lab: 'CSAIL (Computer Science and Artificial Intelligence Lab)',
    department: 'EECS',
    type: 'Direct Funding ($2,100 / term)',
    term: 'Spring 2026',
    proposal_abstract: ''
  });

  const { data: urops = [] } = useQuery({
    queryKey: ['urops'],
    queryFn: () => base44.entities.UROPProject.list()
  });

  const studentUrops = urops.filter(u => u.student_id === student?.id);

  const createUropMutation = useMutation({
    mutationFn: async (data) => {
      if (!student) return;
      return base44.entities.UROPProject.create({
        ...data,
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        status: 'approved'
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(['urops']);
      toast.success('UROP Research Project approved and logged with UROP Office.');
      setShowUropModal(false);
      setUropForm({
        title: '',
        faculty_supervisor: student?.departmental_advisor || 'Prof. Shafi Goldwasser',
        lab: 'CSAIL',
        department: 'EECS',
        type: 'Direct Funding ($2,100 / term)',
        term: 'Spring 2026',
        proposal_abstract: ''
      });
      if (onUpdate) onUpdate();
    }
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-foreground">Phase 4: Registration, IAP & UROP Research</span>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
              WebSIS Academic Cycle
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            MIT's recurring term registration lifecycle includes Advisor Registration Sign-off, Add/Drop Date policies, the January Independent Activities Period (IAP), and the Undergraduate Research Opportunities Program (UROP).
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs py-1 px-2.5 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Term Registration Cleared
        </Badge>
      </div>

      {/* Grid: WebSIS Registration Calendar & IAP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration Workflow & Deadlines */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              WebSIS Term Registration & Drop Date Safeguards
            </CardTitle>
            <CardDescription className="text-xs">
              Official academic calendar milestones managed by the Registrar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <span className="font-semibold text-foreground block">Pre-Registration Status:</span>
                <span className="text-[11px] text-muted-foreground">Class schedule selection submitted</span>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>
            </div>

            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <span className="font-semibold text-foreground block">Registration Day Sign-off:</span>
                <span className="text-[11px] text-muted-foreground">Faculty Advisor conference & signature</span>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Signed Off</Badge>
            </div>

            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <span className="font-semibold text-foreground block">Add Date Deadline (Week 5):</span>
                <span className="text-[11px] text-muted-foreground">Last day to add subjects or change status</span>
              </div>
              <span className="font-mono text-muted-foreground">Passed</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <div>
                <span className="font-semibold text-foreground block">Drop Date Deadline (Week 10):</span>
                <span className="text-[11px] text-muted-foreground">MIT policy: dropped classes leave NO record</span>
              </div>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono">Protected</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Independent Activities Period (IAP) */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              January IAP (Independent Activities Period)
            </CardTitle>
            <CardDescription className="text-xs">
              4-week winter session for intensive sprint workshops, research, and non-credit explorations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-lg border bg-muted/40">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">MIT Autonomous Robotics Competition</span>
                <Badge variant="outline" className="text-[10px]">6.141 IAP Lab</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                4-week hardware build & autonomous navigation algorithm sprint at Johnson Athletics Center.
              </p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed & Awarded 6 IAP Units
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/40">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">Annual MIT Mystery Hunt</span>
                <Badge variant="outline" className="text-[10px]">Student Tradition</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Participated with Next House puzzle team across campus corridors and tunnels.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* UROP (Undergraduate Research Opportunities Program) */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              Undergraduate Research Opportunities Program (UROP)
            </CardTitle>
            <CardDescription className="text-xs">
              Over 90% of MIT undergraduates conduct faculty-mentored research for pay, credit, or fellowship
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowUropModal(!showUropModal)} className="text-xs h-8 gap-1">
            <Plus className="w-3.5 h-3.5" />
            {showUropModal ? 'Cancel' : 'New UROP Proposal'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showUropModal && (
            <div className="p-4 rounded-xl border bg-muted/30 space-y-3 text-xs mb-4">
              <h4 className="font-semibold text-sm text-foreground">Submit UROP Proposal to UROP Office</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium block mb-1">Project Title:</label>
                  <Input
                    value={uropForm.title}
                    onChange={e => setUropForm({ ...uropForm, title: e.target.value })}
                    placeholder="e.g. Distributed Cryptographic Verification"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium block mb-1">Faculty Supervisor:</label>
                  <Input
                    value={uropForm.faculty_supervisor}
                    onChange={e => setUropForm({ ...uropForm, faculty_supervisor: e.target.value })}
                    placeholder="e.g. Prof. Shafi Goldwasser"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium block mb-1">Laboratory / Center:</label>
                  <Input
                    value={uropForm.lab}
                    onChange={e => setUropForm({ ...uropForm, lab: e.target.value })}
                    placeholder="e.g. CSAIL, Media Lab, Koch Institute"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium block mb-1">Compensation / Credit:</label>
                  <Input
                    value={uropForm.type}
                    onChange={e => setUropForm({ ...uropForm, type: e.target.value })}
                    placeholder="e.g. Direct Funding ($2,100 / term)"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-muted-foreground font-medium block mb-1">Proposal Abstract:</label>
                  <Input
                    value={uropForm.proposal_abstract}
                    onChange={e => setUropForm({ ...uropForm, proposal_abstract: e.target.value })}
                    placeholder="Brief description of research hypothesis and experimental methods..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => createUropMutation.mutate(uropForm)}
                  disabled={createUropMutation.isPending || !uropForm.title.trim()}
                  className="h-8 text-xs gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Submit & Approve UROP
                </Button>
              </div>
            </div>
          )}

          {studentUrops.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              No active UROP projects logged for this student. Click "New UROP Proposal" to assign research.
            </div>
          ) : (
            <div className="space-y-3">
              {studentUrops.map(u => (
                <div key={u.id} className="p-3.5 rounded-xl border bg-muted/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground text-sm">{u.title}</h4>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                        {u.type}
                      </Badge>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                        {u.status || 'Active'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Lab: <strong className="text-foreground">{u.lab}</strong> &middot; Mentor: <strong className="text-foreground">{u.faculty_supervisor}</strong> &middot; Term: {u.term}
                    </p>
                    {u.proposal_abstract && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2 mt-1">
                        "{u.proposal_abstract}"
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Department</span>
                    <span className="font-mono text-xs font-semibold">{u.department || 'EECS'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
