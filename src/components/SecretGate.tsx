import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isVerifiedName, checkVerifiedPassword } from "@/lib/verified";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LANGUAGES = ["English", "Spanish", "Russian", "French", "German", "Chinese"];

export function SecretGate({
  stage,
  onPasswordOk,
  onSetupComplete,
  onCancel,
}: {
  stage: "password" | "setup";
  onPasswordOk: () => void;
  onSetupComplete: (name: string, language: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<string | null>(null);
  const [verifyStage, setVerifyStage] = useState<"name" | "verifyPw">("name");
  const [verifyPw, setVerifyPw] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !language) return;
    // Check HWID ban list first
    const { data: ban } = await (supabase as any)
      .from("hwid_bans").select("banned_name,reason")
      .ilike("banned_name", name.trim()).maybeSingle();
    if (ban) {
      setVerifyError(`You're banned: ${ban.reason || "no reason given"}`);
      return;
    }
    if (verifyStage === "name") {
      setChecking(true);
      const verified = await isVerifiedName(name.trim());
      setChecking(false);
      if (verified) {
        setVerifyStage("verifyPw");
        return;
      }
      onSetupComplete(name.trim(), language);
      return;
    }
    // verifyPw stage
    setChecking(true);
    const ok = await checkVerifiedPassword(name.trim(), verifyPw);
    setChecking(false);
    if (!ok) {
      setVerifyError("Wrong verification password.");
      return;
    }
    onSetupComplete(name.trim(), language);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4">
      <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-md shadow-[var(--shadow-soft)] animate-in fade-in zoom-in duration-200">
        {stage === "password" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password === "88") {
                setError("");
                onPasswordOk();
              } else {
                setError("Wrong password.");
              }
            }}
          >
            <h2 className="text-2xl font-bold mb-2">Enter password</h2>
            <p className="text-sm text-muted-foreground mb-6">A secret door appeared.</p>
            <Input
              autoFocus
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••"
              className="text-center text-xl tracking-widest h-14"
            />
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1">Enter</Button>
            </div>
          </form>
        ) : verifyStage === "verifyPw" ? (
          <form onSubmit={handleSetupSubmit}>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <BadgeCheck className="w-6 h-6 text-primary" /> Verify {name}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              That name is reserved. Enter its password to continue.
            </p>
            <Input
              autoFocus
              type="password"
              value={verifyPw}
              onChange={(e) => setVerifyPw(e.target.value)}
              placeholder="Verification password"
              className="h-12 mb-2"
            />
            {verifyError && <p className="text-destructive text-sm mb-2">{verifyError}</p>}
            <div className="flex gap-3 mt-4">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setVerifyStage("name");
                  setVerifyPw("");
                  setVerifyError("");
                }}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={checking || !verifyPw}>
                {checking ? "Checking…" : "Verify →"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSetupSubmit}>
            <h2 className="text-2xl font-bold mb-2">What's your name?</h2>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={40}
              className="h-12 mb-6"
            />
            <p className="text-sm font-medium mb-3">Pick a language</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {LANGUAGES.map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                    language === l
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            {verifyError && <p className="text-destructive text-sm mb-3">{verifyError}</p>}
            <Button type="submit" disabled={!name.trim() || !language || checking} className="w-full">
              {checking ? "Checking…" : "Enter chat →"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
