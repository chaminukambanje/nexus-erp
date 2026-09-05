import React from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, Calendar, Receipt, X } from 'lucide-react';

export default function BulkActionsToolbar({ selectedCount, onAssignProgramme, onUpdateSemester, onProcessBilling, onClearSelection }) {
  if (selectedCount === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap p-3 bg-primary/5 border border-primary/20 rounded-lg">
      <span className="text-sm font-medium mr-2">{selectedCount} student(s) selected</span>
      <Button size="sm" onClick={onAssignProgramme}><GraduationCap className="w-3.5 h-3.5 mr-1" /> Assign Programme</Button>
      <Button size="sm" variant="outline" onClick={onUpdateSemester}><Calendar className="w-3.5 h-3.5 mr-1" /> Update Semester</Button>
      <Button size="sm" variant="outline" onClick={onProcessBilling}><Receipt className="w-3.5 h-3.5 mr-1" /> Process Billing</Button>
      <Button size="sm" variant="ghost" onClick={onClearSelection} className="ml-auto"><X className="w-3.5 h-3.5 mr-1" /> Clear</Button>
    </div>
  );
}