import { Component, type CSSProperties, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';

const errorContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',

  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

const errorTextStyle: CSSProperties = {
  color: 'var(--color-error)',
  fontSize: '2em',
  marginBottom: 'var(--margin-small)',
  filter: 'drop-shadow(var(--error-text-shadow))',
};

const errorDetailsStyle: CSSProperties = {
  fontSize: '1em',
  margin: '0 var(--margin-huge) var(--margin-huge)',
  textAlign: 'center',
  maxHeight: 'var(--error-details-max-height)',
  overflowY: 'scroll',
};

const restartButtonStyle: CSSProperties = {
  cursor: 'pointer',
  fontSize: '1.5em',
  marginBottom: 'var(--margin-medium)',
  padding: 'var(--padding-tiny) var(--padding-small)',
};

const additionalActionsStyle: CSSProperties = {
  flex: 1,
  padding: 'var(--padding-tiny) var(--padding-small)',
};

const additionalActionsSummaryStyle: CSSProperties = {
  padding: 'var(--padding-tiny) var(--padding-small)',
  marginBottom: 'var(--margin-medium)',
  textAlign: 'center',
};

const stackTraceStyle: CSSProperties = {
  padding: 'var(--padding-tiny) var(--padding-small)',
};

const stackTraceDetailsStyle: CSSProperties = {
  fontSize: '1em',
  margin: '0 var(--margin-huge) var(--margin-huge)',
  width: 'var(--error-stack-width)',
  overflowY: 'scroll',
};

export class ErrorBoundary extends Component<
  PropsWithChildren<{ onError?: (error: Error, errorInfo: ErrorInfo) => void }>,
  { error: Error | null }
> {
  public state: { error: Error | null } = { error: null };

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error });
    this.props.onError?.(error, errorInfo);

    console.error(error);
  }

  private reset() {
    console.warn('Resetting error state');

    this.setState({ error: null });

    window.location.hash = '';
  }

  public render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div style={errorContainerStyle}>
          <div style={additionalActionsStyle} />
          <span style={errorTextStyle}>Unhandled Error</span>
          {this.state.error.message && (
            <span className="custom-scrollbar" style={errorDetailsStyle}>
              {this.state.error.message}
            </span>
          )}
          <button style={restartButtonStyle} type="button" onClick={() => this.reset()}>
            Restart
          </button>
          <br />
          {this.state.error.stack && (
            <details style={stackTraceStyle}>
              <summary style={additionalActionsSummaryStyle}>Stack Trace</summary>
              <textarea className="custom-scrollbar" style={stackTraceDetailsStyle} rows={30}>
                {this.state.error.stack}
              </textarea>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
