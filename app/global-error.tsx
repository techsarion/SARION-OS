'use client';

// Top-level error boundary — catches errors thrown in the root layout/render.
// Must render its own <html>/<body> because it replaces the root layout.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0b0d10', color: '#e6e8eb', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#9aa0a6', maxWidth: 420 }}>
            The application hit an unexpected error. Please try again.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: 8, padding: '8px 16px', borderRadius: 2, border: '1px solid #2f80f7', background: '#2f80f7', color: '#fff', cursor: 'pointer', fontSize: 14 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
