import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { StudyTips } from "@/components/StudyTips";
import { SecretGate } from "@/components/SecretGate";
import { ChatRoom } from "@/components/ChatRoom";
import { applySavedCloak, maybeAutoLaunchCloak } from "@/components/SettingsPanel";

type Stage = "tips" | "password" | "setup" | "chat";
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

  // Apply tab cloak + restore saved chat session on mount
  useEffect(() => {
    applySavedCloak();
    maybeAutoLaunchCloak();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.name && p.language) {
          setProfile(p);
          setStage("chat");
        }
      } catch {}
    }
  }, []);

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

  if (stage === "chat" && profile) {
    return <ChatRoom name={profile.name} language={profile.language} onExit={exitChat} />;
  }

  return (
    <>
      <StudyTips eightCount={eightCount} />
      {(stage === "password" || stage === "setup") && (
        <SecretGate
          stage={stage}
          onPasswordOk={() => setStage("setup")}
          onSetupComplete={(name, language) => {
            const p = { name, language };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
            setProfile(p);
            setStage("chat");
          }}
          onCancel={() => setStage("tips")}
        />
      )}
    </>
  );
}
