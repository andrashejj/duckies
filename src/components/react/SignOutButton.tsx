import { signOut } from "auth-astro/client";

type Props = {
  label?: string;
  className?: string;
};

export default function SignOutButton({
  label = "Sign out",
  className = "font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-ink-950)]/70 underline-offset-4 hover:text-[var(--color-coral-500)] hover:underline",
}: Props) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={className}
    >
      {label}
    </button>
  );
}
