import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { StudyTips } from "@/components/StudyTips";
import { SecretGate } from "@/components/SecretGate";
import { ChatRoom } from "@/components/ChatRoom";

type Stage = "tips" | "password" | "setup" | "chat";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Study Tips — Focus better, learn smarter" },
      { name: "description", content: "Practical study tips and focus techniques to help you learn smarter every day." },
      { property: "og:title", content: "Study Tips — Focus better, learn smarter" },
      { property: "og:description", content: "Practical study tips and focus techniques." },
    ],
  }),
  component: Index,
});

function Index() {
  const [stage, setStage] = useState<Stage>("tips");
  const [eightCount, setEightCount] = useState(0);
  const [profile, setProfile] = useState<{ name: string; language: string } | null>(null);

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

  if (stage === "chat" && profile) {
    return <ChatRoom name={profile.name} language={profile.language} onExit={() => setStage("tips")} />;
  }

  return (
    <>
      <StudyTips eightCount={eightCount} />
      {(stage === "password" || stage === "setup") && (
        <SecretGate
          stage={stage}
          onPasswordOk={() => setStage("setup")}
          onSetupComplete={(name, language) => {
            setProfile({ name, language });
            setStage("chat");
          }}
          onCancel={() => setStage("tips")}
        />
      )}
    </>
  );
}
