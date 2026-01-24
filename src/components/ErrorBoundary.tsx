import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  isOffline: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      isOffline: !navigator.onLine
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Check if error is network-related
    const isNetworkError = error.message.includes('fetch') || 
                          error.message.includes('network') ||
                          error.message.includes('Failed to load');
    
    if (isNetworkError) {
      this.setState({ isOffline: true });
    }
    
    // Log to external service in production
    if (import.meta.env.MODE === 'production') {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      console.log('Production error logged:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        isOffline: !navigator.onLine
      });
    }
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOffline: false });
  };

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearCache = async () => {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      
      // Reload page
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { isOffline, error } = this.state;

      return (
        <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-red-50/30 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-red-100">
            {/* Error Icon */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              isOffline 
                ? 'bg-gradient-to-br from-orange-100 to-orange-50 border-2 border-orange-200'
                : 'bg-gradient-to-br from-red-100 to-red-50 border-2 border-red-200'
            }`}>
              {isOffline ? (
                <WifiOff className="w-10 h-10 text-orange-600" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-red-600" />
              )}
            </div>
            
            {/* Error Message */}
            <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">
              {isOffline ? 'Connection Lost' : 'Something Went Wrong'}
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              {isOffline 
                ? "We couldn't connect to the server. Please check your internet connection and try again."
                : "We encountered an unexpected error. Don't worry, your data is safe."}
            </p>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={this.handleReset}
                className="w-full h-12 bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </Button>
              
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="w-full h-12 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
              >
                Reload Page
              </Button>

              {!isOffline && (
                <Button
                  onClick={this.handleClearCache}
                  variant="outline"
                  className="w-full h-12 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Clear Cache & Reload
                </Button>
              )}
            </div>
            
            {/* Offline Help */}
            {isOffline && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="text-sm text-orange-900 font-medium mb-2">
                  <strong>Troubleshooting:</strong>
                </p>
                <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                  <li>Check your WiFi or mobile data</li>
                  <li>Try turning airplane mode off</li>
                  <li>Restart your device</li>
                </ul>
              </div>
            )}
            
            {/* Development Error Details */}
            {import.meta.env.MODE === 'development' && error && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 font-medium">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-3 text-xs bg-gray-100 p-4 rounded-xl overflow-auto max-h-40 text-gray-800 border border-gray-200">
                  {error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;