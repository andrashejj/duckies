import { signIn } from "auth-astro/client";

type Props = {
  next?: string;
  label?: string;
};

export default function GoogleSignInButton({
  next,
  label = "Sign in with Google",
}: Props) {
  function handleClick() {
    signIn("google", next ? { callbackUrl: next } : undefined);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="cta-primary w-full justify-center gap-3"
    >
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-cream-soft)] text-[0.78rem] font-black text-[var(--color-ink-950)]"
      >
        G
      </span>
      {label}
    </button>
  );
}
