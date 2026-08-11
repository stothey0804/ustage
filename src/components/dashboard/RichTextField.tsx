"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";

import { Textarea } from "@/components/ui/textarea";

const RichTextEditor = dynamic(
  () => import("./RichTextEditor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 animate-pulse rounded-md border bg-muted" />
    ),
  }
);

/**
 * CKEditor 번들 로드·초기화 실패를 잡는 경계.
 * 배포 직후 옛 청크 요청, 오프라인, 사내망 차단 등으로 실패하면 에디터 하나 때문에
 * 작성 화면 전체가 에러 경계로 날아간다 — 여기서 막고 일반 입력창으로 대체한다.
 */
class EditorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[RichTextEditor] load failed", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** 대체 입력창의 placeholder */
  placeholder?: string;
}

/**
 * 리치텍스트 입력 — 에디터를 못 불러오면 같은 값에 연결된 textarea로 대체한다.
 * 저장 형식은 양쪽 모두 HTML 문자열이라 서버·표시 경로는 달라지지 않는다
 * (표시할 때 `sanitizeEventHtml`을 통과한다).
 */
export function RichTextField({
  value,
  onChange,
  disabled,
  placeholder,
}: RichTextFieldProps) {
  return (
    <EditorBoundary
      fallback={
        <div className="space-y-1.5">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            rows={8}
          />
          <p className="text-xs text-muted-foreground">
            서식 편집기를 불러오지 못해 일반 입력창으로 바꿨습니다. 입력한
            내용은 그대로 저장되며, 새로고침하면 편집기를 다시 불러옵니다.
          </p>
        </div>
      }
    >
      <RichTextEditor value={value} onChange={onChange} disabled={disabled} />
    </EditorBoundary>
  );
}
