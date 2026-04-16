"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomField } from "@/lib/validations/event";

interface CustomFieldEditorProps {
  value: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

const FIELD_TYPES = [
  { value: "text", label: "텍스트" },
  { value: "number", label: "숫자" },
  { value: "select", label: "선택" },
  { value: "checkbox", label: "체크박스" },
] as const;

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function CustomFieldEditor({ value, onChange }: CustomFieldEditorProps) {
  const addField = () => {
    onChange([
      ...value,
      {
        id: generateId(),
        label: "",
        type: "text",
        required: false,
      },
    ]);
  };

  const removeField = (id: string) => {
    onChange(value.filter((f) => f.id !== id));
  };

  const updateField = (id: string, patch: Partial<CustomField>) => {
    onChange(value.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const updateOption = (fieldId: string, idx: number, text: string) => {
    const field = value.find((f) => f.id === fieldId);
    if (!field) return;
    const options = [...(field.options ?? [])];
    options[idx] = text;
    updateField(fieldId, { options });
  };

  const addOption = (fieldId: string) => {
    const field = value.find((f) => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, { options: [...(field.options ?? []), ""] });
  };

  const removeOption = (fieldId: string, idx: number) => {
    const field = value.find((f) => f.id === fieldId);
    if (!field) return;
    const options = (field.options ?? []).filter((_, i) => i !== idx);
    updateField(fieldId, { options });
  };

  return (
    <div className="space-y-3">
      {value.map((field, index) => (
        <div
          key={field.id}
          className="rounded-lg border bg-muted/30 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="size-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              필드 {index + 1}
            </span>
            <div className="ml-auto">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => removeField(field.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">필드 이름</Label>
              <Input
                value={field.label}
                onChange={(e) =>
                  updateField(field.id, { label: e.target.value })
                }
                placeholder="예: 좌석 번호"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">타입</Label>
              <Select
                value={field.type}
                onValueChange={(v) =>
                  updateField(field.id, {
                    type: v as CustomField["type"],
                    options: v === "select" ? [""] : undefined,
                  })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) =>
                updateField(field.id, { required: e.target.checked })
              }
              className="accent-primary"
            />
            필수 입력
          </label>

          {field.type === "select" && (
            <div className="space-y-2">
              <Label className="text-xs">선택지</Label>
              {(field.options ?? []).map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) =>
                      updateOption(field.id, idx, e.target.value)
                    }
                    placeholder={`선택지 ${idx + 1}`}
                    className="h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => removeOption(field.id, idx)}
                    disabled={(field.options ?? []).length <= 1}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => addOption(field.id)}
              >
                <Plus className="size-3 mr-1" />
                선택지 추가
              </Button>
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addField}
        className="w-full"
      >
        <Plus className="size-4 mr-1" />
        커스텀 필드 추가
      </Button>
    </div>
  );
}
