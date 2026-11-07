import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-8 text-center">
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 shadow-lg shadow-rose-500/10">
            <AlertTriangle size={36} />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            Connection or Rendering Issue Detected
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            {this.state.error?.message || 'Unable to connect to the backend server. Please verify backend service and database status.'}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-colors"
            >
              <RefreshCw size={14} />
              <span>Retry Loading</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors"
            >
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
