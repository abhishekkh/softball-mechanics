import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TranscodingStatus } from '@/components/upload/TranscodingStatus'

export default async function SubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, status, uploaded_at, thumbnail_url, hls_url')
    .eq('athlete_id', user.id)
    .order('uploaded_at', { ascending: false })

  const isEmpty = !videos || videos.length === 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Submissions</h1>
        <a
          href="/upload"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upload video
        </a>
      </div>

      {isEmpty ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-sm">No submissions yet.</p>
          <p className="text-gray-400 text-sm mt-1">Upload a video to get feedback from your coach.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((v) => (
            <div key={v.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
              <div className="w-20 h-14 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt="thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No preview</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{v.title ?? 'Untitled'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(v.uploaded_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
              <TranscodingStatus videoId={v.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
