import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { StudyTips } from "@/components/StudyTips";
import { Blocked } from "@/components/Blocked";
import { SecretGate } from "@/components/SecretGate";
import { ChatRoom } from "@/components/ChatRoom";
import { AppleBoot } from "@/components/AppleBoot";
import { applySavedCloak, maybeAutoLaunchCloak } from "@/components/SettingsPanel";
import { getSettings, useSettingsListener, applyTheme } from "@/lib/settings";
import { supabase } from "@/integrations/supabase/client";

type Stage = "tips" | "password" | "setup" | "boot" | "chat" | "panic";
const STORAGE_KEY = "studyroom_profile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Google Classroom" },
      { name: "description", content: "Practical study tips and focus techniques to help you learn smarter every day." },
    ],
  }),
  component: Index,
});

function Index() {
  const [stage, setStage] = useState<Stage>("tips");
  const [eightCount, setEightCount] = useState(0);
  const [profile, setProfile] = useState<{ name: string; language: string } | null>(null);
  const [prePanicStage, setPrePanicStage] = useState<Stage>("chat");
  const [panicKey, setPanicKey] = useState(getSettings().panicKey || "`");
  const [banned, setBanned] = useState<string | null>(null);

  // Apply tab cloak + restore saved chat session on mount
  useEffect(() => {
    applySavedCloak();
    maybeAutoLaunchCloak();
    applyTheme(getSettings().theme);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.name && p.language) {
          // Check ban list — if banned, stay on the landing & wipe profile.
          (async () => {
            const { data } = await (supabase as any)
              .from("hwid_bans")
              .select("banned_name,reason")
              .ilike("banned_name", p.name)
              .maybeSingle();
            if (data) {
              localStorage.removeItem(STORAGE_KEY);
              setBanned(data.reason || "You have been banned.");
              return;
            }
            setProfile(p);
            setStage("boot");
          })();
        }
      } catch {}
    }
    return useSettingsListener((s) => setPanicKey(s.panicKey || "`"));
  }, []);

  // Panic key listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const key = e.key === " " ? "Space" : e.key;
      if (key !== panicKey) return;
      e.preventDefault();
      setStage((cur) => {
        if (cur === "panic") return prePanicStage;
        if (cur === "chat" || cur === "boot") {
          setPrePanicStage(cur);
          return "panic";
        }
        return cur;
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [panicKey, prePanicStage]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (stage !== "tips") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "8") {
        setEightCount((c) => {
          const next = c + 1;
          if (next >= 4) {
            setStage("password");
            return 0;
          }
          return next;
        });
        setTimeout(() => setEightCount((c) => (c > 0 ? 0 : c)), 2000);
      }
    },
    [stage],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  function exitChat() {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setStage("tips");
  }

  if (stage === "panic") {
    return <StudyTips eightCount={0} />;
  }

  if (stage === "boot" && profile) {
    return <AppleBoot onDone={() => setStage("chat")} />;
  }

  if (stage === "chat" && profile) {
    return <ChatRoom name={profile.name} language={profile.language} onExit={exitChat} />;
  }

  return (
    <>
      <Blocked eightCount={eightCount} />
      {(stage === "password" || stage === "setup") && (
        <SecretGate
          stage={stage}
          onPasswordOk={() => setStage("setup")}
          onSetupComplete={(name, language) => {
            // also persist language as the active UI language
            try {
              const cur = JSON.parse(localStorage.getItem("studyroom_settings") || "{}");
              localStorage.setItem("studyroom_settings", JSON.stringify({ ...cur, language }));
              window.dispatchEvent(new CustomEvent("studyroom-settings-changed"));
            } catch {}
            const p = { name, language };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
            setProfile(p);
            setStage("boot");
          }}
          onCancel={() => setStage("tips")}
        />
      )}
      {banned && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "#b00000", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, fontFamily: "system-ui",
          textAlign: "center",
        }}>
          <div>
            <h1 style={{ fontSize: 72, fontWeight: 900, marginBottom: 16, letterSpacing: 2 }}>YOU ARE BANNED</h1>
            <p style={{ fontSize: 28, fontWeight: 600 }}>Reason: {banned}</p>
          </div>
        </div>
      )}
    </>
  );
}
