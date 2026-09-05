import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

/**
 * Searchable select for items and optionally courses.
 * value: item id or "course_<id>"
 */
export default function ItemSelect({ value, onChange, items = [], courses = [], placeholder = 'Select item', className = '', triggerClassName = '' }) {
  const [search, setSearch] = useState('');

  const q = search.toLowerCase();
  const filteredItems = items.filter(i => !q || i.name?.toLowerCase().includes(q) || i.item_number?.toLowerCase().includes(q));
  const filteredCourses = courses.filter(c => !q || c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q));

  return (
    <div className={className}>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className={triggerClassName || 'mt-1 h-8 text-xs'}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1.5 sticky top-0 bg-popover z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                className="h-7 pl-6 text-xs"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
              />
            </div>
          </div>
          {filteredItems.length === 0 && filteredCourses.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">No results</div>
          )}
          {filteredItems.map(i => (
            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
          ))}
          {courses.length > 0 && filteredCourses.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-t mt-1 pt-2">Courses</div>
              {filteredCourses.map(c => (
                <SelectItem key={c.id} value={`course_${c.id}`}>{c.code} — {c.name}</SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}