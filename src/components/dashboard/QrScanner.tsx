"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ScanResult, type ScanResultData } from "./ScanResult";

interface QrScannerProps {
  eventId: string;
}

type ScannerState = "init" | "scanning" | "processing" | "result" | "error";

export function QrScanner({ eventId }: QrScannerProps) {
  const [state, setState] = useState<ScannerState>("init");
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const isStopping = useRef(false);

  const stopScanner = async () => {
    if (
      scannerRef.current &&
      !isStopping.current
    ) {
      try {
        isStopping.current = true;
        const s = scannerRef.current.getState();
        // 2 = SCANNING, 3 = PAUSED
        if (s === 2 || s === 3) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore stop errors
      } finally {
        isStopping.current = false;
      }
    }
  };

  const startScanner = async () => {
    setState("scanning");
    setScanResult(null);
    isStopping.current = false;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (scannerRef.current) {
        await stopScanner();
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (isStopping.current) return;
          isStopping.current = true;
          setState("processing");

          try {
            await scanner.stop();
          } catch {
            // ignore
          }

          try {
            const res = await fetch("/api/check-in", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ qr_token: decodedText, event_id: eventId }),
            });
            const json = await res.json();

            if (!res.ok) {
              setScanResult({
                result: "invalid",
                message: json.error ?? "처리 중 오류가 발생했습니다.",
              });
            } else {
              setScanResult(json as ScanResultData);
            }
          } catch {
            setScanResult({
              result: "invalid",
              message: "서버 연결 오류가 발생했습니다.",
            });
          }
          setState("result");
          isStopping.current = false;
        },
        () => {
          // QR scan failure callback — ignore frame-level errors
        }
      );
    } catch (err) {
      console.error("[QrScanner]", err);
      setErrorMsg(
        "카메라에 접근할 수 없습니다. 브라우저 권한을 확인해 주세요."
      );
      setState("error");
    }
  };

  // 컴포넌트 마운트 시 자동 시작
  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    startScanner();
  };

  return (
    <div className="space-y-4">
      {/* 카메라 뷰 — scanning/processing 상태에서만 DOM 존재 */}
      <div
        id="qr-reader"
        className={
          state === "scanning" || state === "processing"
            ? "w-full overflow-hidden rounded-lg"
            : "hidden"
        }
      />

      {state === "init" && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {state === "processing" && (
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">확인 중...</span>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">{errorMsg}</p>
        </div>
      )}

      {state === "result" && scanResult && (
        <ScanResult data={scanResult} onReset={handleReset} />
      )}
    </div>
  );
}
