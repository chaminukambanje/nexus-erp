import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import { useToast } from '@/components/ui/use-toast';

const UNDERGRAD_TYPES = ['certificate', 'diploma', 'bachelors', 'honours'];

export default function BulkProgrammeDialog({ open, onOpenChange, selectedStudents, programmes, progEnrollments }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [programmeId, setProgrammeId] = useState('');
  const [intakeYear, setIntakeYear] = useState(new Date().getFullYear().toString());
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().slice(0, 10));

  const selectedProgramme = programmes.find(p => p.id === programmeId);
  const isUndergrad = UNDERGRAD_TYPES.includes(selectedProgramme?.degree_type);

  const skippedStudents = programmeId ? selectedStudents.filter(s => {
    if (isUndergrad) {
      return progEnrollments.some(pe => pe.student_id === s.id && pe.programme_level === 'undergraduate' && pe.status === 'active');
    }
    return progEnrollments.some(pe => pe.student_id === s.id && pe.programme_id === programmeId && pe.status === 'active');
  }) : [];

  const mutation = useMutation({
    mutationFn: async () => {
      const eligible = selectedStudents.filter(s => !skippedStudents.includes(s));
      const prog = selectedProgramme;
      const isUg = UNDERGRAD_TYPES.includes(prog.degree_type);

      for (const student of eligible) {
        await base44.entities.ProgrammeEnrollment.create({
          student_id: student.id, student_name: `${student.first_name} ${student.last_name}`,
          student_number: student.student_number, programme_id: programmeId,
          programme_code: prog.code || '', programme_name: prog.name || '',
          programme_level: isUg ? 'undergraduate' : 'postgraduate',
          intake_year: intakeYear, enrollment_date: enrollmentDate, current_year: 1, status: 'active'
        });
        const payload = { programme_id: programmeId, programme_name: prog.name || '', status: 'enrolled' };
        if (isUg) {
          payload.undergraduate_programme_id = programmeId;
          payload.undergraduate_programme_name = prog.name || '';
          payload.intake_year = intakeYear;
        } else {
          payload.postgraduate_programme_ids = [...(student.postgraduate_programme_ids || []), programmeId];
          payload.postgraduate_programme_names = [...(student.postgraduate_programme_names || []), prog.name || ''];
        }
        await base44.entities.Student.update(student.id, { ...student, ...payload });
      }
      return eligible.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries(['programmeEnrollments']); qc.invalidateQueries(['students']);
      toast({ title: `Programme assigned to ${count} student(s)`, description: skippedStudents.length > 0 ? `${skippedStudents.length} skipped (already enrolled)` : undefined });
      onOpenChange(false); setProgrammeId('');
    }
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={`Assign Programme to ${selectedStudents.length} Student(s)`} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Assign" size="md">
      <FormField label="Programme" type="select" value={programmeId} onChange={setProgrammeId} options={programmes.map(p => ({ value: p.id, label: `${p.code} — ${p.name} (${p.degree_type.replace(/_/g, ' ')})` }))} required />
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Intake Year" value={intakeYear} onChange={setIntakeYear} />
        <FormField label="Enrollment Date" type="date" value={enrollmentDate} onChange={setEnrollmentDate} />
      </div>
      {skippedStudents.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <strong>{skippedStudents.length} student(s)</strong> will be skipped (already enrolled):
          <p className="mt-1">{skippedStudents.map(s => `${s.first_name} ${s.last_name}`).join(', ')}</p>
        </div>
      )}
    </FormDialog>
  );
}