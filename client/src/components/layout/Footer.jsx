import { Link } from 'react-router-dom';
import { Heart, Globe, Send, PlayCircle, MessageCircle } from 'lucide-react';

const columns = [
  {
    title: 'About',
    links: [
      { label: 'Anizil is your one-stop destination for streaming anime. Watch thousands of titles in high quality with simulcast updates.', path: null },
    ],
  },
  {
    title: 'Quick Links',
    links: [
      { label: 'Home', path: '/' },
      { label: 'Genre', path: '/genres' },
      { label: 'Schedule', path: '/schedule' },
      { label: 'Forum', path: '/forum' },
      { label: 'Leaderboard', path: '/leaderboard' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ', path: '/faq' },
      { label: 'Contact', path: '/contact' },
      { label: 'Report Issue', path: '/report' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', path: '/terms' },
      { label: 'Privacy Policy', path: '/privacy' },
    ],
  },
];

const socials = [
  { icon: Send, label: 'Twitter', href: '#' },
  { icon: PlayCircle, label: 'YouTube', href: '#' },
  { icon: MessageCircle, label: 'Discord', href: '#' },
  { icon: Globe, label: 'GitHub', href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-panel border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider mb-4">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.path ? (
                      <Link
                        to={link.path}
                        className="text-sm text-muted hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <p className="text-sm text-muted leading-relaxed">{link.label}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-muted hover:text-primary hover:bg-surface transition-colors"
                aria-label={s.label}
              >
                <s.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
          <p className="text-xs text-muted flex items-center gap-1">
            &copy; {new Date().getFullYear()} Anizil. Made with
            <Heart className="w-3 h-3 text-danger fill-danger" /> for anime fans.
          </p>
        </div>
      </div>
    </footer>
  );
}
