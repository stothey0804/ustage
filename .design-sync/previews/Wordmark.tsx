import { BrandMark, Wordmark } from "ustage";

/** The wordmark scales off font-size, so a text utility is the size control. */
export function Sizes() {
  return (
    <div className="flex flex-col items-start gap-3">
      <Wordmark className="text-sm" />
      <Wordmark className="text-xl" />
      <Wordmark className="text-4xl" />
    </div>
  );
}

/** Colour is inherited — the centre dot uses bg-current, so recolouring the
 *  text recolours the whole mark. */
export function ColorInheritance() {
  return (
    <div className="flex flex-col items-start gap-3">
      <Wordmark className="text-2xl text-primary" />
      <Wordmark className="text-2xl text-foreground" />
      <Wordmark className="text-2xl text-muted-foreground" />
    </div>
  );
}

export function OnPrimarySurface() {
  return (
    <div className="flex items-center gap-2 rounded-4xl bg-primary px-5 py-4">
      <BrandMark className="size-7" />
      <Wordmark className="text-xl text-primary-foreground" />
    </div>
  );
}
