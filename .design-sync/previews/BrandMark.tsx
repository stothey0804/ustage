import { BrandMark, Wordmark } from "ustage";

/** The app icon vector, inline. Decorative by default (aria-hidden) — pair it
 *  with the Wordmark or visible text for the accessible name. */
export function Sizes() {
  return (
    <div className="flex items-end gap-4">
      <BrandMark className="size-6" />
      <BrandMark className="size-10" />
      <BrandMark className="size-16" />
    </div>
  );
}

/** The canonical header lockup: mark + wordmark on one baseline. */
export function HeaderLockup() {
  return (
    <div className="flex items-center gap-2">
      <BrandMark className="size-8" />
      <Wordmark className="text-xl" />
    </div>
  );
}
