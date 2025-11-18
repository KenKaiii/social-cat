'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronsUpDown, Check } from 'lucide-react';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SchedulePickerProps {
  value: string;
  onChange: (cronExpression: string) => void;
}

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const [open, setOpen] = useState(false);

  const presets = [
    { label: 'Every 5 minutes', value: '*/5 * * * *' },
    { label: 'Every 15 minutes', value: '*/15 * * * *' },
    { label: 'Every 30 minutes', value: '*/30 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 4 hours', value: '0 */4 * * *' },
    { label: 'Daily at 9 AM', value: '0 9 * * *' },
    { label: 'Daily at 6 PM', value: '0 18 * * *' },
    { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  ];

  const currentPreset = presets.find((p) => p.value === value);

  return (
    <div className="space-y-2">
      <Label className="text-xs text-secondary">Schedule</Label>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 text-xs bg-background border-border w-full justify-between font-normal"
          >
            {currentPreset ? currentPreset.label : 'Select schedule'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
          <Command>
            <CommandList className="max-h-[300px]">
              <CommandGroup>
                {presets.map((preset) => (
                  <CommandItem
                    key={preset.value}
                    value={preset.value}
                    onSelect={() => {
                      onChange(preset.value);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <Check className={`mr-2 h-4 w-4 ${value === preset.value ? 'opacity-100' : 'opacity-0'}`} />
                    {preset.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
