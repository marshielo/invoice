export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-4 py-16">
      {/* Logo */}
      <div className="mb-8">
        <a href="/">
          <span className="font-display text-2xl font-bold text-foreground">
            Invoice<span style={{ color: 'hsl(158 68% 30%)' }}>in</span>
          </span>
        </a>
      </div>

      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
