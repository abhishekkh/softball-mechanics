export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Softball Mechanics</h1>
          <p className="text-gray-500 text-sm mt-1">Coach smarter, throw harder</p>
        </div>
        {children}
      </div>
    </div>
  )
}
