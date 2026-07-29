"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Loader2, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  slug: string;
  /** 파일명·공유 문구에 사용 */
  title: string;
}

/** 파일명에 쓸 수 없는 문자 제거 */
function safeFileName(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, "_").trim() || "스테이지";
}

/**
 * 예매 페이지 링크를 QR로 만들어 보여주고, PNG 저장·공유를 제공한다.
 * QR 생성은 클릭 시점에 `qrcode`를 동적 import해서 처리한다(초기 번들 제외).
 */
export function EventQrShare({ slug, title }: Props) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  // 절대 URL은 브라우저에서만 알 수 있으므로 클릭 시점에 채운다.
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const fileName = `${safeFileName(title)}_예매QR.png`;

  async function openDialog() {
    setOpen(true);
    const url = `${window.location.origin}/e/${slug}`;
    setShareUrl(url);
    if (dataUrl || generating) return;

    setGenerating(true);
    try {
      const QRCode = (await import("qrcode")).default;
      // 인쇄·포스터에 써도 깨지지 않도록 넉넉한 해상도로 생성
      const png = await QRCode.toDataURL(url, {
        width: 720,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      setDataUrl(png);
    } catch (err) {
      console.error("[EventQrShare] qr generation", err);
      toast.error("QR 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setGenerating(false);
    }
  }

  async function share() {
    if (!dataUrl) return;
    const url = shareUrl ?? `${window.location.origin}/e/${slug}`;
    const text = `${title} 예매 페이지`;

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });

      // 이미지까지 공유할 수 있으면 QR 이미지를 함께 보낸다.
      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title, text });
        return;
      }
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("공유를 지원하지 않는 브라우저예요. 링크를 복사했습니다.");
    } catch (err) {
      // 사용자가 공유 시트를 닫은 경우는 오류가 아니다.
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[EventQrShare] share", err);
      toast.error("공유에 실패했습니다. 이미지 저장 후 직접 공유해 주세요.");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <QrCode className="size-4 mr-1.5" />
        예매 QR 공유
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>예매 페이지 QR</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="mx-auto flex aspect-square w-full max-w-64 items-center justify-center rounded-2xl border bg-white p-4">
              {dataUrl ? (
                <Image
                  src={dataUrl}
                  alt={`${title} 예매 페이지 QR 코드`}
                  width={720}
                  height={720}
                  unoptimized
                  className="h-auto w-full max-w-full"
                />
              ) : (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
              <p className="flex-1 truncate text-xs text-muted-foreground">
                {shareUrl ?? `/e/${slug}`}
              </p>
              <CopyButton value={shareUrl ?? `/e/${slug}`} label="링크복사" />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              포스터·SNS에 넣거나 현장에 붙여두면 참석자가 스캔해서 바로 예매
              페이지로 들어옵니다.
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={!dataUrl}
                asChild={!!dataUrl}
              >
                {dataUrl ? (
                  <a href={dataUrl} download={fileName}>
                    <Download className="size-4 mr-1.5" />
                    이미지 저장
                  </a>
                ) : (
                  <span>
                    <Download className="size-4 mr-1.5" />
                    이미지 저장
                  </span>
                )}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!dataUrl}
                onClick={share}
              >
                <Share2 className="size-4 mr-1.5" />
                공유하기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
