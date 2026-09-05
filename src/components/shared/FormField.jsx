import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function FormField({ label, type = 'text', value, onChange, options, placeholder, required, className }) {
  const id = label?.toLowerCase().replace(/\s+/g, '_');

  if (type === 'select') {
    return (
      <div className={className}>
        <Label htmlFor={id} className="text-xs font-medium">{label}{required && ' *'}</Label>
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder={placeholder || `Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {options?.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <div className={className}>
        <Label htmlFor={id} className="text-xs font-medium">{label}{required && ' *'}</Label>
        <Textarea
          id={id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1.5"
          rows={3}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Label htmlFor={id} className="text-xs font-medium">{label}{required && ' *'}</Label>
      <Input
        id={id}
        type={type}
        value={value || ''}
        onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1.5"
      />
    </div>
  );
}