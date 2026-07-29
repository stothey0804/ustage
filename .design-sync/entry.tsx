// design-sync: the design-system export surface of the ustage app.
// The repo is a Next.js app, not a published library, so this barrel is the
// entry the converter bundles: the shadcn primitives under src/components/ui
// plus the four brand/display components. App-feature components (auth/,
// booking/, dashboard/) are deliberately out — they import server actions and
// Supabase clients that cannot run in a browser bundle.
export * from "../src/components/ui/avatar";
export * from "../src/components/ui/badge";
export * from "../src/components/ui/button";
export * from "../src/components/ui/calendar";
export * from "../src/components/ui/card";
export * from "../src/components/ui/copy-button";
export * from "../src/components/ui/date-time-picker";
export * from "../src/components/ui/dialog";
export * from "../src/components/ui/dropdown-menu";
export * from "../src/components/ui/input";
export * from "../src/components/ui/label";
export * from "../src/components/ui/popover";
export * from "../src/components/ui/select";
export * from "../src/components/ui/separator";
export * from "../src/components/ui/sonner";
export * from "../src/components/ui/tabs";
export * from "../src/components/ui/textarea";
export * from "../src/components/BrandMark";
export * from "../src/components/Wordmark";
export * from "../src/components/StatusBadge";
export * from "../src/components/RichTextView";
