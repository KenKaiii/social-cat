'use client';

import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
import { Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { InputField } from './chat-input-trigger-config';
import { logger } from '@/lib/logger';

interface ChatInputExecuteProps {
  workflowId: string;
  fields: InputField[];
  onExecute: (inputData: Record<string, unknown>) => Promise<void>;
  executing?: boolean;
  onReady?: (executeFunction: () => Promise<void>) => void;
}

export function ChatInputExecute({ fields, onExecute, executing = false, onReady }: ChatInputExecuteProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    fields.forEach(field => {
      if (field.type === 'checkbox') {
        initial[field.key] = false;
      } else if (field.defaultValue) {
        initial[field.key] = field.defaultValue;
      } else {
        initial[field.key] = '';
      }
    });
    return initial;
  });
  const [openSelects, setOpenSelects] = useState<Record<string, boolean>>({});

  const handleExecute = useCallback(async () => {
    // Validate required fields
    for (const field of fields) {
      if (field.required && !values[field.key]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    try {
      await onExecute(values);
    } catch (error) {
      logger.error({ error }, 'Execution error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute workflow';
      toast.error(errorMessage);
    }
  }, [fields, values, onExecute]);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !executing) {
      // Don't trigger on textarea or when shift is pressed
      if ((e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleExecute();
      }
    }
  };

  const renderField = (field: InputField) => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.key}
            value={String(values[field.key] || '')}
            onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
            placeholder={field.placeholder}
            rows={4}
            className="resize-none"
            disabled={executing}
          />
        );

      case 'number':
        return (
          <Input
            id={field.key}
            type="number"
            value={String(values[field.key] || '')}
            onChange={(e) => setValues({ ...values, [field.key]: parseFloat(e.target.value) || 0 })}
            placeholder={field.placeholder}
            disabled={executing}
            onKeyDown={handleKeyDown}
          />
        );

      case 'date':
        return (
          <Input
            id={field.key}
            type="date"
            value={String(values[field.key] || '')}
            onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
            disabled={executing}
          />
        );

      case 'select':
        return (
          <Popover open={openSelects[field.key]} onOpenChange={(open) => setOpenSelects({ ...openSelects, [field.key]: open })} modal={true}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openSelects[field.key]}
                className="w-full justify-between font-normal text-sm"
                disabled={executing}
              >
                {String(values[field.key] || '') || field.placeholder || 'Select an option'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
              <Command>
                <CommandList className="max-h-[300px]">
                  <CommandGroup>
                    {(field.options || []).map((option, index) => (
                      <CommandItem
                        key={`${field.key}-${option}-${index}`}
                        value={option}
                        onSelect={() => {
                          setValues({ ...values, [field.key]: option });
                          setOpenSelects({ ...openSelects, [field.key]: false });
                        }}
                        className="text-sm"
                      >
                        <Check className={`mr-2 h-4 w-4 ${values[field.key] === option ? 'opacity-100' : 'opacity-0'}`} />
                        {option}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={field.key}
              checked={Boolean(values[field.key])}
              onChange={(e) => setValues({ ...values, [field.key]: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
              disabled={executing}
            />
            <Label htmlFor={field.key} className="font-normal">
              {field.placeholder || field.label}
            </Label>
          </div>
        );

      case 'text':
      default:
        return (
          <Input
            id={field.key}
            type="text"
            value={String(values[field.key] || '')}
            onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
            placeholder={field.placeholder}
            disabled={executing}
            onKeyDown={handleKeyDown}
          />
        );
    }
  };

  // Expose handleExecute to parent
  useEffect(() => {
    onReady?.(handleExecute);
  }, [handleExecute, onReady]);

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          {field.type !== 'checkbox' && (
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          )}
          {renderField(field)}
        </div>
      ))}
    </div>
  );
}
