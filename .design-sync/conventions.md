# ustage — how to build with this design system

어스테이지(us.tage) is a Korean small-venue ticketing app: performers publish a
private booking link, attendees book through it, payment is bank transfer, and
entry is a QR scan. Screens are mobile-first, in Korean, and quiet — one teal
accent on a near-white ground.

## Setup

**No provider is required.** Every component is a plain React component; there
is no ThemeProvider, no context root. Import from the package and render:

```jsx
import { Button, Card, CardHeader, CardTitle, CardContent } from "ustage";
```

Two things that do need mounting at the app root:

- `<Toaster />` — once, anywhere near the root. It is the host for every toast.
  It is driven by sonner's `toast()`, which this design system does **not**
  re-export: `import { toast } from "sonner"` at the call site.
- Dark mode is a `.dark` class on an ancestor (usually `<html>`), not a prop.
  Every token has a dark value already; nothing else is needed.

## Styling idiom: Tailwind v4 utilities over semantic tokens

This is a Tailwind v4 + shadcn system. **Style with utility classes, never with
raw hex or inline styles.** Colour utilities resolve to CSS variables, so the
same class is correct in light and dark. The full vocabulary:

| Family | Utilities | Use for |
|---|---|---|
| Surface | `bg-background` `bg-card` `bg-popover` `bg-muted` `bg-secondary` `bg-accent` `bg-sidebar` | page, cards, overlays, quiet fills |
| Text | `text-foreground` `text-muted-foreground` `text-card-foreground` `text-popover-foreground` `text-primary` `text-destructive` | body, secondary, on-surface, accent, danger |
| Accent | `bg-primary` `text-primary-foreground` | the ONE filled teal element per view — the main action |
| Line | `border-border` `ring-ring` `bg-input` `outline-ring` | hairlines, focus rings, field fills |
| Danger | `bg-destructive/10` `text-destructive` `ring-destructive/20` | destructive actions are tinted, never solid red |
| Chart | `bg-chart-1` … `bg-chart-5` | data series only |
| Radius | `rounded-3xl` (fields, badges, menus) `rounded-4xl` (buttons, cards, dialogs) `rounded-full` (pills, avatars) | this system is very round — do not use `rounded-md` |
| Type | `font-sans` (Inter) `font-heading` `font-mono` (Geist Mono) | headings use `font-heading text-base font-medium`, body `text-sm` |

Everything else — layout, spacing, sizing — is stock Tailwind (`flex`, `grid`,
`gap-2`, `px-6`, `size-8`). Spacing runs on a 4px scale; cards use `gap-6`
between sections, forms `gap-4` between fields and `gap-1.5` between a Label
and its control.

**One hard constraint: the stylesheet is pre-compiled.** Nothing re-runs
Tailwind on your markup, so only the utilities already in `styles.css` do
anything. The shipped set covers the semantic colours above (with `/5`–`/95`
opacity, plus `hover:`, `focus-visible:`, `dark:`, `group-hover:` and the
`sm:`–`xl:` breakpoints), the 0–32 spacing scale, sizing, flex/grid,
`grid-cols-1`–`12`, `text-xs`–`text-7xl`, the weight/leading/tracking scale,
radii, borders, `shadow-*`, positioning, `opacity-*` and the common transition
and interaction utilities. **Arbitrary values (`w-[437px]`, `bg-[#0d9488]`) and
anything outside that set will not resolve** — reach for an inline `style` if
you genuinely need a one-off number, and use the token variables
(`var(--primary)`) rather than a raw hex.

**The accent rule matters.** Solid `bg-primary` is reserved for the single
primary action. Status uses tinted badges (`EventStatusBadge`,
`BookingStatusBadge`), not filled teal.

## Where the truth lives

- `_ds/<folder>/styles.css` and its `@import` closure — the compiled stylesheet.
  Every token is defined in `:root` / `.dark` there (`--primary`, `--muted`,
  `--radius`, …), and the `@theme` block maps them onto the utility names above.
  Read it before inventing a class.
- `components/<group>/<Name>/<Name>.d.ts` — the prop contract.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage.

## Idiomatic example

Library components for the controls; plain Tailwind utilities for your own
layout glue. This is the shape most ustage screens take:

```jsx
import {
  Button, Card, CardHeader, CardTitle, CardDescription, CardContent,
  CardFooter, CardAction, EventStatusBadge, Separator,
} from "ustage";

export function EventSummary() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>겨울밤의 소극장 콘서트</CardTitle>
        <CardDescription>2026년 2월 14일 (토) 19:30 · 합정 살롱드유</CardDescription>
        <CardAction>
          <EventStatusBadge status="open" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">티켓 가격</span>
          <span className="font-medium">25,000원</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="text-muted-foreground">잔여 좌석</span>
          <span className="font-medium">18 / 40석</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button className="flex-1">예매하기</Button>
        <Button variant="outline">공유</Button>
      </CardFooter>
    </Card>
  );
}
```

## Composition rules worth knowing

- **`asChild` everywhere a trigger takes a control.** `DialogTrigger`,
  `PopoverTrigger`, `DropdownMenuTrigger`, `DialogClose` all wrap by default —
  pass `asChild` and give them a real `Button` instead of nesting buttons.
- **Compound parts only work inside their parent.** `CardAction` needs
  `CardHeader` (it switches the header to a 2-column grid); `SelectItem` needs
  an open `SelectContent`; `AvatarBadge` reads its size from `Avatar`.
- **Indicators are built in.** `SelectItem`, `DropdownMenuCheckboxItem`,
  `DropdownMenuRadioItem` and `SelectTrigger` render their own check/chevron.
  Don't add one.
- **Icons are `lucide-react`**, dropped in as bare children — the button and
  item styles size them (`size-4`, `size-3` at `xs`) and handle the gap.
- **Copy is Korean, plain, and says what happens.** Empty states name the next
  action ("첫 스테이지를 만들어 예매 링크를 공유해보세요"); destructive dialogs
  name the loss ("예매 명단과 발급된 QR 티켓이 모두 사라집니다").
