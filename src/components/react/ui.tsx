import type { ComponentProps, ReactNode } from "react";
import { chipClass, ctaClass, kickerClass, stickerCardClass, type CtaSize, type CtaVariant, type StickerTone, type Tone } from "../../lib/ui";

// React twins of src/components/ui/*.astro, built from the same recipes.
export function Cta({ variant = "primary", size = "md", className, href, ...rest }: { variant?: CtaVariant; size?: CtaSize; className?: string; href?: string; children: ReactNode } & Omit<ComponentProps<"button">, "className"> & { target?: string; rel?: string }) {
  const classes = ctaClass(variant, size, className);
  if (href) { const { type: _type, disabled: _d, onClick: _o, ...anchor } = rest as ComponentProps<"button">; return <a href={href} className={classes} {...(anchor as ComponentProps<"a">)} />; }
  return <button type="button" className={classes} {...rest} />;
}
export const Kicker = ({ tone = "sticker", className, ...rest }: { tone?: Tone; className?: string } & Omit<ComponentProps<"p">, "className">) => <p className={kickerClass(tone, className)} {...rest} />;
export const Chip = ({ tone = "sticker", className, ...rest }: { tone?: Tone; className?: string } & Omit<ComponentProps<"span">, "className">) => <span className={chipClass(tone, className)} {...rest} />;
export const StickerCard = ({ tone = "none", dashed, tilt, hover = true, className, ...rest }: { tone?: StickerTone; dashed?: boolean; tilt?: "left" | "right"; hover?: boolean; className?: string } & Omit<ComponentProps<"div">, "className">) => <div className={stickerCardClass({ tone, dashed, tilt, hover }, className)} {...rest} />;
