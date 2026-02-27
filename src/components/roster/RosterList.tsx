interface Athlete {
  id: string
  email: string
  name?: string
  status: 'pending' | 'active'
  videoCount: number
  invitedAt: string
}

interface RosterListProps {
  athletes: Athlete[]
}

export function RosterList({ athletes }: RosterListProps) {
  if (athletes.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500 text-sm">No athletes yet.</p>
        <p className="text-gray-400 text-sm mt-1">Use the invite button to add your first athlete.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Athlete</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Videos</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Invited</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {athletes.map(a => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{a.name ?? a.email}</p>
                  {a.name && <p className="text-xs text-gray-500">{a.email}</p>}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  a.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {a.status === 'active' ? 'Active' : 'Invite sent'}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">{a.videoCount}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {new Date(a.invitedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export type { Athlete }
