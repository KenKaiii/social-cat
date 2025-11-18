'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Plus, Trash2, GripVertical, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';

export interface InputField {
  id: string;
  label: string;
  key: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select type
  defaultValue?: string;
}

interface ChatInputTriggerConfigProps {
  initialConfig?: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

export function ChatInputTriggerConfig({ initialConfig, onConfigChange }: ChatInputTriggerConfigProps) {
  const [fields, setFields] = useState<InputField[]>(
    (initialConfig?.fields as InputField[]) || [
      {
        id: '1',
        label: 'Message',
        key: 'message',
        type: 'text',
        required: true,
        placeholder: 'Enter your message...',
      },
    ]
  );
  const [openFields, setOpenFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    onConfigChange({ fields });
  }, [fields, onConfigChange]);

  const addField = () => {
    const newField: InputField = {
      id: Date.now().toString(),
      label: 'New Field',
      key: `field_${Date.now()}`,
      type: 'text',
      required: false,
      placeholder: '',
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<InputField>) => {
    setFields(fields.map(f => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    if (fields.length === 1) {
      toast.error('At least one field is required');
      return;
    }
    setFields(fields.filter(f => f.id !== id));
  };

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Select' },
    { value: 'checkbox', label: 'Checkbox' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Input Fields</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addField}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Field
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Define the fields users will fill when triggering this workflow. Access values using{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{trigger.fieldKey}}'}</code>
        </p>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-none">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="p-4 border rounded-lg bg-muted/30 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Field {index + 1}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeField(field.id)}
                disabled={fields.length === 1}
                title="Remove field"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`label-${field.id}`} className="text-xs">
                  Label
                </Label>
                <Input
                  id={`label-${field.id}`}
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                  placeholder="Field label"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`key-${field.id}`} className="text-xs">
                  Key
                </Label>
                <Input
                  id={`key-${field.id}`}
                  value={field.key}
                  onChange={(e) =>
                    updateField(field.id, {
                      key: e.target.value.replace(/[^a-zA-Z0-9_]/g, ''),
                    })
                  }
                  placeholder="field_key"
                  className="h-8 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`type-${field.id}`} className="text-xs">
                  Type
                </Label>
                <Popover open={openFields[field.id]} onOpenChange={(open) => setOpenFields({ ...openFields, [field.id]: open })} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openFields[field.id]}
                      className="w-full justify-between font-normal h-8 text-sm"
                    >
                      {fieldTypes.find((type) => type.value === field.type)?.label || 'Select type'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                      <CommandList className="max-h-[300px]">
                        <CommandGroup>
                          {fieldTypes.map((type) => (
                            <CommandItem
                              key={type.value}
                              value={type.value}
                              onSelect={() => {
                                updateField(field.id, { type: type.value as InputField['type'] });
                                setOpenFields({ ...openFields, [field.id]: false });
                              }}
                              className="text-sm"
                            >
                              <Check className={`mr-2 h-4 w-4 ${field.type === type.value ? 'opacity-100' : 'opacity-0'}`} />
                              {type.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`placeholder-${field.id}`} className="text-xs">
                  Placeholder
                </Label>
                <Input
                  id={`placeholder-${field.id}`}
                  value={field.placeholder || ''}
                  onChange={(e) =>
                    updateField(field.id, { placeholder: e.target.value })
                  }
                  placeholder="Optional placeholder"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {field.type === 'select' && (
              <div className="space-y-1.5">
                <Label htmlFor={`options-${field.id}`} className="text-xs">
                  Options (comma-separated)
                </Label>
                <Input
                  id={`options-${field.id}`}
                  value={(field.options || []).join(', ')}
                  onChange={(e) =>
                    updateField(field.id, {
                      options: e.target.value.split(',').map(o => o.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Option 1, Option 2, Option 3"
                  className="h-8 text-sm"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`required-${field.id}`}
                checked={field.required}
                onChange={(e) =>
                  updateField(field.id, { required: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor={`required-${field.id}`} className="text-xs font-normal">
                Required field
              </Label>
            </div>

            <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded">
              Access value: <code className="bg-muted px-1 py-0.5 rounded">{'{{trigger.' + field.key + '}}'}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
