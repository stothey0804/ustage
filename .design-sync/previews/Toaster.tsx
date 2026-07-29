import { Button, Card, CardContent, CardHeader, CardTitle, Toaster } from "ustage";

/** Mount `<Toaster />` once, at the app root — it is the host for every toast.
 *
 *  It is driven by sonner's `toast()` function, which the design system does
 *  NOT re-export: call `import { toast } from "sonner"` from wherever the
 *  event happens. That also means a static preview cannot show a live toast —
 *  the buttons below are the wiring pattern, and the panel underneath is what
 *  a rendered toast looks like with the ustage tokens applied. */
export function RootMount() {
  return (
    <div className="grid w-[360px] max-w-full gap-3">
      <Toaster position="top-center" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm">예매 완료 토스트</Button>
        <Button size="sm" variant="outline">
          입금 확인 토스트
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        onClick 에서 <code className="font-mono">toast.success(&quot;입금이 확인되었습니다&quot;)</code>
        를 호출하면 이 Toaster 가 렌더합니다.
      </p>
    </div>
  );
}

/** The tokens a toast inherits: popover surface, border and radius. */
export function ToastSurface() {
  return (
    <Card size="sm" className="w-[320px] max-w-full">
      <CardHeader>
        <CardTitle>입금이 확인되었습니다</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Toaster 는 --normal-bg / --normal-text / --normal-border 를 각각
        popover, popover-foreground, border 토큰으로 넘겨 이 표면을 만듭니다.
      </CardContent>
    </Card>
  );
}
