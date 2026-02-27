import { headers } from 'next/headers'
import { signOut } from '@/actions/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const role = headersList.get('x-user-role') ?? 'coach'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-gray-900">Softball Mechanics</span>
          <div className="flex items-center gap-6">
            {role === 'coach' ? (
              <>
                <a href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</a>
                <a href="/upload" className="text-sm text-gray-600 hover:text-gray-900">Upload</a>
                <a href="/roster" className="text-sm text-gray-600 hover:text-gray-900">Roster</a>
              </>
            ) : (
              <>
                <a href="/submissions" className="text-sm text-gray-600 hover:text-gray-900">My Submissions</a>
                <a href="/upload" className="text-sm text-gray-600 hover:text-gray-900">Upload</a>
              </>
            )}
            <form action={signOut}>
              <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
