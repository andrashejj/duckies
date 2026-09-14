import { useState } from "react";
import { authClient } from "../../lib/auth-client";

export default function SignOutButton({ label = "Sign out", className = "member-text-button underline" }: { label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <>
    <button type="button" disabled={busy} className={className} onClick={async () => {
      setBusy(true);
      setError("");
      try {
        const result = await authClient.signOut();
        if (result.error) throw new Error("Sign-out failed");
        window.location.replace("/");
      } catch { setError("Couldn't sign out. Please try again."); }
      finally { setBusy(false); }
    }}>{label}</button>
    {error && <p role="status">{error}</p>}
  </>;
}
