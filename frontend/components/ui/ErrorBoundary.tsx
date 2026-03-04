'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg bg-surface p-8">
          <div className="text-lg font-semibold text-red">Something went wrong</div>
          <p className="text-sm text-text-muted">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-teal/80"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
