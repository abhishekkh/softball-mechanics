export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2L18 10L10 18L2 10L10 2Z" fill="currentColor" className="text-primary" />
            </svg>
            <span className="text-2xl font-extrabold text-gray-900">Diamond Mechanics</span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Coach smarter. Develop every athlete.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
