import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './Navbar';
import Footer from './Footer';

// App shell wrapping pages with navbar, footer and toast host.
export default function Layout() {
  return (
      <div className="min-h-screen flex flex-col bg-bg text-text-primary">
        <Navbar />
        <main className="flex-1 pt-16">
          <Outlet />
        </main>
        <Footer />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--panel)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--panel)' } },
            error: { iconTheme: { primary: 'var(--danger)', secondary: 'var(--panel)' } },
          }}
        />
      </div>
  );
}
