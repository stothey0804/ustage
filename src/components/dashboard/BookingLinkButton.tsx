"use client";

import { useState } from "react";
import { Link, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingLinkButtonProps {
  slug: string;
}

export function BookingLinkButton({ slug }: BookingLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}/e/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copyLink}>
      {copied ? (
        <>
          <Check className="size-4 mr-1.5 text-green-600" />
          복사됨
        </>
      ) : (
        <>
          <Link className="size-4 mr-1.5" />
          예매 링크 복사
        </>
      )}
    </Button>
  );
}
