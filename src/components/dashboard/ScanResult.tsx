"use client";

import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ScanResultType =
  | "success"
  | "pending"
  | "already_checked_in"
  | "cancelled"
  | "invalid";

export interface ScanResultData {
  result: ScanResultType;
  name?: string;
  message: string;
  checked_in_at?: string;
}

interface ScanResultProps {
  data: ScanResultData;
  onReset: () => void;
}

const RESULT_CONFIG: Record<
  ScanResultType,
  { icon: React.ElementType; bg: string; iconColor: string; title: string }
> = {
  success: {
    icon: CheckCircle,
    bg: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
    title: "입장 확인",
  },
  pending: {
    icon: AlertTriangle,
    bg: "bg-yellow-50 border-yellow-200",
    iconColor: "text-yellow-600",
    title: "입금 미확인",
  },
  already_checked_in: {
    icon: AlertTriangle,
    bg: "bg-orange-50 border-orange-200",
    iconColor: "text-orange-600",
    title: "재입장 시도",
  },
  cancelled: {
    icon: XCircle,
    bg: "bg-red-50 border-red-200",
    iconColor: "text-red-600",
    title: "취소된 예매",
  },
  invalid: {
    icon: XCircle,
    bg: "bg-red-50 border-red-200",
    iconColor: "text-red-600",
    title: "유효하지 않은 QR",
  },
};

export function ScanResult({ data, onReset }: ScanResultProps) {
  const config = RESULT_CONFIG[data.result];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border-2 p-6 space-y-4 ${config.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`size-8 shrink-0 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-lg font-semibold ${config.iconColor}`}>
            {config.title}
          </p>
          {data.name && (
            <p className="text-2xl font-bold mt-1 text-foreground">
              {data.name}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">{data.message}</p>
          {data.result === "already_checked_in" && data.checked_in_at && (
            <p className="text-xs text-muted-foreground mt-1">
              입장 시각:{" "}
              {new Date(data.checked_in_at).toLocaleString("ko-KR", {
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
      <Button
        onClick={onReset}
        variant="outline"
        className="w-full gap-2"
        size="sm"
      >
        <RefreshCw className="size-4" />
        다음 QR 스캔
      </Button>
    </div>
  );
}
