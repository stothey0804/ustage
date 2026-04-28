"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = "복사" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="size-3" />
          복사됨
        </>
      ) : (
        <>
          <Copy className="size-3" />
          {label}
        </>
      )}
    </Button>
  );
}
