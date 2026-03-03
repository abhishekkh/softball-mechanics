import { Video, ScanLine, Flag, Mail } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Standalone header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <span className="font-extrabold text-xl text-gray-900">Diamond Mechanics</span>
          <a href="/login" className="text-sm font-medium text-primary hover:underline">
            Sign in
          </a>
        </div>
      </header>

      {/* Hero section */}
      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Diamond Mechanics
          </h1>
          <p className="mt-4 text-xl sm:text-2xl font-medium text-gray-600">
            Help every athlete reach their potential.
          </p>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-gray-500">
            AI-powered mechanics coaching for baseball and softball coaches. Upload a short
            clip, get instant pose analysis and mechanics flags, and send your athlete a
            clear breakdown — from anywhere.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/signup"
              className="inline-block rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              Start free
            </a>
            <a href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-700">
              Already have an account? Sign in
            </a>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Everything you need to coach mechanics remotely
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Built for youth rec, high school, travel, and collegiate coaches — baseball and softball.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-4">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Upload from any device</h3>
              <p className="text-sm text-gray-500">
                As a coach, you can receive video from athletes on any phone or tablet — no special app required. Drag-and-drop or select from camera roll.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-4">
                <ScanLine className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI pose skeleton overlay</h3>
              <p className="text-sm text-gray-500">
                As a coach, you can see a full-body skeleton drawn over every frame — joint positions tracked automatically so you can focus on teaching, not measurement.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-4">
                <Flag className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Mechanics flags</h3>
              <p className="text-sm text-gray-500">
                As a coach, you get instant flags for common mechanics issues — bat casting, early hip rotation, elbow drop — with joint angles at the key moment.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-4">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Send targeted feedback</h3>
              <p className="text-sm text-gray-500">
                As a coach, you can email your athlete a direct link to their analysis with a personalized note — one click from the review page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            How it works
          </h2>
          <p className="text-center text-gray-500 mb-10">
            From raw video to targeted feedback in minutes.
          </p>
          <div className="flex flex-col md:flex-row gap-8 md:gap-4">
            {/* Step 1 */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-extrabold text-xl mb-4">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Upload a clip</h3>
              <p className="text-sm text-gray-500">
                Athlete sends you a short video from their phone. You upload it from any device — drag-and-drop or camera roll. Clips are capped at 5 seconds to keep analysis sharp.
              </p>
            </div>

            {/* Connector */}
            <div className="hidden md:flex items-center justify-center px-2">
              <div className="w-8 h-px bg-gray-300" />
            </div>

            {/* Step 2 */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-extrabold text-xl mb-4">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Get instant AI analysis</h3>
              <p className="text-sm text-gray-500">
                AI automatically draws a pose skeleton on every frame, computes joint angles at key moments, and flags common mechanics issues for hitting and pitching.
              </p>
            </div>

            {/* Connector */}
            <div className="hidden md:flex items-center justify-center px-2">
              <div className="w-8 h-px bg-gray-300" />
            </div>

            {/* Step 3 */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-extrabold text-xl mb-4">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Send targeted feedback</h3>
              <p className="text-sm text-gray-500">
                Email your athlete a clear breakdown with a direct link to their analysis. They see exactly what you see — no login required on their end.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Ready to coach smarter?
          </h2>
          <p className="text-gray-500 mb-8">
            Free to start. No credit card required. Built for baseball and softball coaches.
          </p>
          <a
            href="/signup"
            className="inline-block rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            Start free — no credit card required
          </a>
          <p className="mt-6 text-sm text-gray-400">
            Early access?{' '}
            <a
              href="mailto:feedback@diamondmechanics.app?subject=Diamond%20Mechanics%20Feedback"
              className="text-primary hover:underline"
            >
              Share feedback
            </a>{' '}
            — we read every message.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Diamond Mechanics. Built for coaches who care.
        </div>
      </footer>
    </div>
  )
}
