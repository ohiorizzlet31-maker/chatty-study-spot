const tips = [
  { n: "01", title: "The Pomodoro Rhythm", body: "Work for 25 focused minutes, then rest 5. Four cycles, then a longer break. Your brain loves the cadence." },
  { n: "02", title: "Active Recall", body: "Close the book and try to retrieve what you just read. Struggling to remember IS the learning." },
  { n: "03", title: "Spaced Repetition", body: "Review at increasing intervals — today, tomorrow, in 3 days, in a week. Memory thrives on spacing." },
  { n: "04", title: "Teach to Learn", body: "Explain a concept out loud as if to a curious friend. Gaps in your understanding will surface fast." },
  { n: "05", title: "One Tab Rule", body: "Close everything except what you're working on. Distraction is the silent thief of deep work." },
  { n: "06", title: "Sleep is Studying", body: "Memory consolidates while you sleep. An all-nighter is a tax on tomorrow's brain." },
];

export function StudyTips({ eightCount }: { eightCount: number }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-soft)" }}>
      <header className="container mx-auto px-6 pt-16 pb-12 max-w-5xl">
        <div className="flex items-center justify-between mb-16">
          <span className="font-display text-xl font-bold tracking-tight">studyroom.</span>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vol. 01</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black leading-[0.95] mb-6">
          Focus better.<br />
          <span className="italic" style={{ color: "var(--primary)" }}>Learn smarter.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          Six small habits that quietly transform how your brain holds onto everything you study.
        </p>
      </header>

      <main className="container mx-auto px-6 pb-24 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-6">
          {tips.map((t) => (
            <article
              key={t.n}
              className="bg-card rounded-2xl p-8 border border-border transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-baseline justify-between mb-4">
                <span className="font-display text-3xl font-black" style={{ color: "var(--accent)" }}>
                  {t.n}
                </span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">tip</span>
              </div>
              <h2 className="text-2xl font-bold mb-3">{t.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{t.body}</p>
            </article>
          ))}
        </div>

        <footer className="mt-20 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>Made for late-night learners ☕</p>
        </footer>
      </main>

      {eightCount > 0 && (
        <div className="fixed bottom-6 right-6 bg-foreground text-background px-4 py-2 rounded-full text-sm font-mono shadow-lg">
          {"8".repeat(eightCount)}
        </div>
      )}
    </div>
  );
}
