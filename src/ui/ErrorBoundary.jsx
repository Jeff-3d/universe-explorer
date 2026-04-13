import { Component } from 'react'

/**
 * Error boundary for WebGL/rendering crashes.
 *
 * Catches errors in the 3D scene and shows a recovery UI
 * instead of a blank screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Universe Explorer error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black text-white">
          <div className="text-center max-w-md p-8">
            <h1 className="text-2xl font-light mb-4">Something went wrong</h1>
            <p className="text-white/50 text-sm mb-4">
              The 3D renderer encountered an error. This may be due to WebGL
              limitations or GPU memory.
            </p>
            <p className="text-white/30 text-xs mb-6 font-mono">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-sm transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
