import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackLabel: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary:' + this.props.fallbackLabel + ']', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="editor-error" style={{ margin: 20 }}>
          <strong>{this.props.fallbackLabel} crashed.</strong>
          <p style={{ margin: '6px 0 0', fontFamily: 'monospace', fontSize: 11 }}>
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
