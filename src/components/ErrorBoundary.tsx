'use client'

import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Component error:', {
      message: error.message,
      stack: info.componentStack?.slice(0, 200),
    })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-center">
          <p className="text-sm text-red-600 font-medium">Something went wrong loading this page.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
