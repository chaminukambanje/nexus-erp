import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import FormDialog from '@/components/shared/FormDialog';
import { useToast } from '@/components/ui/use-toast';

export default function BulkBillingDialog({ open, onOpenChange, selectedStudents, programmes }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const billable = selectedStudents.filter(s => {
    if (!s.customer_id) return false;
    const prog = programmes.find(p => p.id === s.programme_id || p.id === s.undergraduate_programme_id);
    return prog && prog.annual_fee > 0;
  });

  const totalAmount = billable.reduce((sum, s) => {
    const prog = programmes.find(p => p.id === s.programme_id || p.id === s.undergraduate_programme_id);
    return sum + (prog?.annual_fee || 0);
  }, 0);

  const skipped = selectedStudents.length - billable.length;

  const mutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const due = new Date(); due.setDate(due.getDate() + 30);

      for (const student of billable) {
        const prog = programmes.find(p => p.id === student.programme_id || p.id === student.undergraduate_programme_id);
        const invNum = `INV-${String(Date.now()).slice(-6)}-${student.student_number || student.id.slice(-4)}`;
        await base44.entities.SalesInvoice.create({
          invoice_number: invNum, customer_id: student.customer_id,
          customer_name: `${student.first_name} ${student.last_name}`,
          invoice_date: today, due_date: due.toISOString().slice(0, 10), status: 'sent',
          lines: [{ item_name: `Tuition — ${prog.name}`, description: `Annual tuition for ${prog.name} (${prog.code})`, quantity: 1, unit_price: prog.annual_fee, discount_percent: 0, tax_percent: 0, line_total: prog.annual_fee }],
          subtotal: prog.annual_fee, tax_amount: 0, discount_amount: 0,
          total_amount: prog.annual_fee, amount_paid: 0, balance_due: prog.annual_fee,
          currency: prog.currency || 'USD', notes: `Bulk billing for ${student.student_number || student.id}`
        });
        await base44.entities.Student.update(student.id, { ...student, outstanding_balance: (student.outstanding_balance || 0) + prog.annual_fee, fees_status: 'outstanding' });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['students']); qc.invalidateQueries(['salesInvoices']);
      toast({ title: `Invoices created for ${billable.length} student(s)`, description: `Total billed: $${totalAmount.toLocaleString()}` });
      onOpenChange(false);
    }
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={`Process Billing for ${selectedStudents.length} Student(s)`} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending} submitLabel="Create Invoices" size="md">
      {billable.length === 0 ? (
        <p className="text-sm text-muted-foreground">No billable students. Students need a customer record and a programme with an annual fee.</p>
      ) : (
        <>
          <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
            <div className="flex justify-between"><span>Billable students:</span><strong>{billable.length}</strong></div>
            <div className="flex justify-between"><span>Total amount:</span><strong>${totalAmount.toLocaleString()}</strong></div>
            {skipped > 0 && <div className="flex justify-between text-muted-foreground"><span>Skipped (no customer/fee):</span>{skipped}</div>}
          </div>
          <div className="max-h-48 overflow-y-auto">
            {billable.map(s => {
              const prog = programmes.find(p => p.id === s.programme_id || p.id === s.undergraduate_programme_id);
              return <div key={s.id} className="flex justify-between text-sm py-1 border-b"><span>{s.first_name} {s.last_name}</span><span className="text-muted-foreground">{prog?.name} — ${prog?.annual_fee?.toLocaleString()}</span></div>;
            })}
          </div>
        </>
      )}
    </FormDialog>
  );
}