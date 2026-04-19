import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LANGUAGES = ["English", "Spanish", "Russian"];

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
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && language) onSetupComplete(name.trim(), language);
            }}
          >
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
            <Button type="submit" disabled={!name.trim() || !language} className="w-full">
              Enter chat →
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
