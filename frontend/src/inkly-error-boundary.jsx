/* App-level error boundary — catches render errors in the routed page tree and
   shows a themed fallback instead of a blank screen. */
import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface the error for debugging; the fallback UI handles the user side.
    console.error("Inkly render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "60vh", padding: 32, textAlign: "center", color: "var(--text-1, var(--ink-1))",
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "var(--text-3, var(--ink-3))", fontSize: 14, margin: "0 0 6px", maxWidth: 460 }}>
            This page hit an unexpected error and couldn't finish rendering.
          </p>
          <pre style={{
            color: "var(--text-3, var(--ink-3))", fontSize: 12, fontFamily: "var(--font-mono, monospace)",
            background: "var(--bg-2, var(--paper-2))", border: "1px solid var(--line)", borderRadius: 8,
            padding: "8px 12px", margin: "0 0 16px", maxWidth: 460, overflowX: "auto", whiteSpace: "pre-wrap",
          }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            className="btn btn--primary"
            style={{ background: "var(--accent)", color: "#fff" }}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
