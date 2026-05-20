import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logDiagnostic } from '@/lib/diagnostics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ALFA ErrorBoundary]', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-destructive/30 bg-card p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground tracking-wide">
              ALFA Module Error
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Moduł nie został załadowany poprawnie. Pipeline pozostaje bezpieczny — żadne dane nie zostały utracone.
            </p>
          </div>
          {this.state.error && (
            <pre className="text-[11px] text-left text-muted-foreground bg-secondary/40 border border-border rounded-md p-3 overflow-auto max-h-40 font-mono">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button onClick={this.handleRetry} variant="default" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Spróbuj ponownie
            </Button>
            <Button onClick={this.handleReload} variant="outline">
              Przeładuj stronę
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
