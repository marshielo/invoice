export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4">
          <span className="font-display text-lg font-bold text-foreground">
            Invoice<span style={{ color: 'hsl(158 68% 30%)' }}>in</span>
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
    </div>
  )
}
