"use client";

import { useEffect, useState } from "react";
import {
  DEPARTMENT_CUSTOM_OPTION,
  DEPARTMENT_OPTIONS,
  GRADE_CUSTOM_OPTION,
  GRADE_OPTIONS,
  SCHOOL_CUSTOM_OPTION,
  SCHOOL_OPTIONS,
} from "@/lib/validation/authSchemas";
import type { MemberType } from "@/types/models";
import { Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/utils/cn";

export interface ProfileFieldValues {
  memberType: MemberType;
  school: string;
  department: string;
  grade: string;
  studentId: string;
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileFieldValues, string>>;

interface ProfileFieldsProps {
  values: ProfileFieldValues;
  onChange: <K extends keyof ProfileFieldValues>(key: K, value: ProfileFieldValues[K]) => void;
  errors?: ProfileFieldErrors;
}

export function ProfileFields({ values, onChange, errors }: ProfileFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-foreground">구분</span>
        <div className="flex gap-2 rounded-full bg-surface p-1">
          {(["student", "staff"] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-semibold transition",
                values.memberType === type ? "bg-white text-primary shadow-sm" : "text-muted"
              )}
              onClick={() => {
                onChange("memberType", type);
                onChange("studentId", "");
              }}
            >
              {type === "student" ? "학생" : "교직원"}
            </button>
          ))}
        </div>
      </div>

      <SelectOrCustom
        label="학교"
        value={values.school}
        onChange={(v) => onChange("school", v)}
        options={SCHOOL_OPTIONS}
        customOption={SCHOOL_CUSTOM_OPTION}
        customPlaceholder="학교명을 입력해주세요"
        error={errors?.school}
      />

      <SelectOrCustom
        label="학과"
        value={values.department}
        onChange={(v) => onChange("department", v)}
        options={DEPARTMENT_OPTIONS}
        customOption={DEPARTMENT_CUSTOM_OPTION}
        customPlaceholder="학과명을 입력해주세요"
        error={errors?.department}
      />

      <div className="grid grid-cols-2 gap-4">
        <SelectOrCustom
          label="학년"
          value={values.grade}
          onChange={(v) => onChange("grade", v)}
          options={GRADE_OPTIONS}
          customOption={GRADE_CUSTOM_OPTION}
          customPlaceholder="학년을 입력해주세요"
          error={errors?.grade}
        />
        <Input
          label={values.memberType === "student" ? "학번 (숫자 8자리)" : "사번 (선택)"}
          placeholder={values.memberType === "student" ? "20231234" : "자유 입력"}
          value={values.studentId}
          inputMode={values.memberType === "student" ? "numeric" : "text"}
          onChange={(e) => {
            const raw = e.target.value;
            onChange("studentId", values.memberType === "student" ? raw.replace(/\D/g, "").slice(0, 8) : raw);
          }}
          error={errors?.studentId}
        />
      </div>
    </div>
  );
}

function SelectOrCustom({
  label,
  value,
  onChange,
  options,
  customOption,
  customPlaceholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  customOption: string;
  customPlaceholder?: string;
  error?: string;
}) {
  // A single string can't tell "not yet chosen" apart from "chose 직접입력 and
  // hasn't typed anything yet" — both are "". Track custom-mode separately so
  // picking 직접입력 doesn't immediately bounce back to the placeholder once
  // the (intentionally cleared) value renders as "".
  const [customMode, setCustomMode] = useState(value !== "" && !options.includes(value));

  useEffect(() => {
    if (options.includes(value)) setCustomMode(false);
  }, [value, options]);

  const selectValue = customMode ? customOption : value;

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        label={label}
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === customOption) {
            setCustomMode(true);
            onChange("");
          } else {
            setCustomMode(false);
            onChange(v);
          }
        }}
        error={customMode ? undefined : error}
      >
        <option value="" disabled>
          선택하세요
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value={customOption}>{customOption}</option>
      </Select>
      {customMode && (
        <Input placeholder={customPlaceholder} value={value} onChange={(e) => onChange(e.target.value)} error={error} />
      )}
    </div>
  );
}
