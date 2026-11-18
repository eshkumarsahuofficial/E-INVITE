import React from 'react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application boundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-stone-200 rounded-2xl p-8">
            <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Capture Studio</p>
            <h1 className="text-2xl font-display-cormorant font-semibold text-stone-900 mb-3">
              Something interrupted this view
            </h1>
            <p className="text-sm text-stone-600 mb-6 leading-relaxed">
              We encountered a temporary issue loading this page. Please refresh or return to the main studio portal.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="px-4 py-2 text-sm font-medium border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Back to Studio
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
