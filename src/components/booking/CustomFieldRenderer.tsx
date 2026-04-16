"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";

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
import type { BookingFormValues } from "@/lib/validations/booking";

interface CustomFieldRendererProps {
  fields: CustomField[];
  control: Control<BookingFormValues>;
  errors: FieldErrors<BookingFormValues>;
}

export function CustomFieldRenderer({
  fields,
  control,
  errors,
}: CustomFieldRendererProps) {
  if (!fields.length) return null;

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const key = `custom_answers.${field.id}` as const;
        const error = errors.custom_answers?.[field.id];

        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={key}>
              {field.label}
              {field.required && (
                <span className="ml-0.5 text-destructive">*</span>
              )}
            </Label>

            {field.type === "text" && (
              <Controller
                control={control}
                name={`custom_answers.${field.id}`}
                rules={{ required: field.required ? `${field.label}을(를) 입력해 주세요.` : false }}
                render={({ field: f }) => (
                  <Input
                    id={key}
                    {...f}
                    value={f.value ?? ""}
                    placeholder={field.label}
                  />
                )}
              />
            )}

            {field.type === "number" && (
              <Controller
                control={control}
                name={`custom_answers.${field.id}`}
                rules={{ required: field.required ? `${field.label}을(를) 입력해 주세요.` : false }}
                render={({ field: f }) => (
                  <Input
                    id={key}
                    type="number"
                    {...f}
                    value={f.value ?? ""}
                    placeholder="숫자 입력"
                  />
                )}
              />
            )}

            {field.type === "select" && (
              <Controller
                control={control}
                name={`custom_answers.${field.id}`}
                rules={{ required: field.required ? `${field.label}을(를) 선택해 주세요.` : false }}
                render={({ field: f }) => (
                  <Select value={f.value ?? ""} onValueChange={f.onChange}>
                    <SelectTrigger id={key}>
                      <SelectValue placeholder="선택해 주세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}

            {field.type === "checkbox" && (
              <Controller
                control={control}
                name={`custom_answers.${field.id}`}
                rules={{ required: field.required ? `${field.label}에 동의해 주세요.` : false }}
                render={({ field: f }) => (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      id={key}
                      type="checkbox"
                      checked={f.value === "true" || f.value === true as unknown as string}
                      onChange={(e) => f.onChange(e.target.checked ? "true" : "false")}
                      className="accent-primary"
                    />
                    {field.label}
                  </label>
                )}
              />
            )}

            {error && (
              <p className="text-xs text-destructive">{String(error.message)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
