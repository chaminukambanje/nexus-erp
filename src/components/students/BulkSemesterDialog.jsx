import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import FormDialog from '@/components/shared/FormDialog';
import FormField from '@/components/shared/FormField';
import { useToast } from '@/components/ui/use-toast';

export default function BulkSemesterDialog({ open, onOpenChange, selectedStudents }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const updates = selectedStudents.map(s => {
        const payload = { id: s.id };
        if (year) payload.current_year = parseInt(year);
        if (semester) payload.current_semester = semester;
        return payload;
      });
      return base44.entities.Student.bulkUpdate(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']);
      toast({ title: `Updated ${selectedStudents.length} student(s)` });
      onOpenChange(false); setYear(''); setSemester('');
    }
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={`Update Semester for ${selectedStudents.length} Student(s)`} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Update" size="md">
      <p className="text-sm text-muted-foreground">Leave a field blank to keep existing values.</p>
      <FormField label="Year Level" type="number" value={year} onChange={setYear} />
      <FormField label="Semester" type="select" value={semester} onChange={setSemester} options={[{ value: '', label: 'Keep existing' }, ...['semester_1', 'semester_2', 'full_year'].map(s => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))]} />
    </FormDialog>
  );
}