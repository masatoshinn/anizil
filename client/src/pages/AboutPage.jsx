import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import useSEO from '../hooks/useSEO';
import {
  Tv, Shield, Zap, Heart, MessageSquare, Users, Globe, Send, Mail, ExternalLink,
} from 'lucide-react';

const fadeIn = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

const FEATURES = [
  { icon: Tv, title: 'HD Streaming', desc: 'Watch anime in full HD quality with adaptive streaming' },
  { icon: Shield, title: 'No Popunders', desc: 'Clean, ad-free browsing experience with no annoying popunders' },
  { icon: Zap, title: 'Fast Updates', desc: 'Episodes added within hours of Japanese broadcast' },
  { icon: Heart, title: 'Watchlist', desc: 'Track your progress and save anime for later' },
  { icon: MessageSquare, title: 'Community', desc: 'Join discussions and share your thoughts with fellow fans' },
  { icon: Users, title: 'Multi-Device', desc: 'Watch on desktop, tablet, or mobile seamlessly' },
];

const TEAM = [
  { name: 'Anizil Team', role: 'Core Development', url: '#' },
];

const SOCIALS = [
  { icon: Send, name: 'Twitter', url: '#' },
  { icon: Globe, name: 'GitHub', url: '#' },
  { icon: Mail, name: 'Email', url: 'mailto:contact@anizil.com' },
];

export default function AboutPage() {
  useSEO({ title: 'About', description: 'About Anizil - the free anime streaming portal with HD quality, watchlists, XP and a vibrant community.' });
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9]/10 via-[#0f172a] to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold text-[#f8fafc] mb-4">
              About Anizil
            </h1>
            <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto">
              Your go-to destination for streaming anime. We provide a clean, fast, and enjoyable way to watch your favorite shows.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* No Popunders Guarantee */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="bg-gradient-to-r from-[#22c55e]/10 to-[#22c55e]/5 border border-[#22c55e]/20 rounded-2xl p-8 text-center">
            <Shield className="w-12 h-12 text-[#22c55e] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-3">No Popunders. Ever.</h2>
            <p className="text-[#94a3b8] max-w-xl mx-auto">
              We guarantee a clean browsing experience. No popunders, no redirect ads, no malicious scripts. Just pure anime streaming.
            </p>
          </div>
        </motion.section>

        {/* Features */}
        <motion.section
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              variants={fadeIn}
              className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-6"
            >
              <f.icon className="w-8 h-8 text-[#0ea5e9] mb-4" />
              <h3 className="text-[#f8fafc] font-semibold mb-2">{f.title}</h3>
              <p className="text-[#94a3b8] text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* Team */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#f8fafc] text-center mb-8">Credits</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {TEAM.map((member, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-6 text-center min-w-[200px]"
              >
                <div className="w-16 h-16 rounded-full bg-[#0ea5e9]/20 flex items-center justify-center text-[#0ea5e9] text-xl font-bold mx-auto mb-3">
                  A
                </div>
                <h3 className="text-[#f8fafc] font-semibold">{member.name}</h3>
                <p className="text-[#94a3b8] text-sm">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Contact & Social */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact */}
            <div className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-8">
              <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Contact Us</h3>
              <p className="text-[#94a3b8] text-sm mb-4">
                Have questions, suggestions, or want to report an issue? We'd love to hear from you.
              </p>
              <a
                href="mailto:contact@anizil.com"
                className="inline-flex items-center gap-2 text-[#0ea5e9] hover:underline text-sm"
              >
                <Mail className="w-4 h-4" /> contact@anizil.com
              </a>
            </div>

            {/* Social Links */}
            <div className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-8">
              <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Follow Us</h3>
              <div className="flex gap-4">
                {SOCIALS.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0f172a] hover:bg-[#334155] text-[#94a3b8] hover:text-[#f8fafc] rounded-lg border border-[rgba(148,163,184,0.12)] transition-colors text-sm"
                  >
                    <social.icon className="w-4 h-4" />
                    {social.name}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Footer Note */}
        <section className="text-center pb-16">
          <p className="text-[#94a3b8] text-sm">
            Anizil does not store any files on our server. All content is provided by non-affiliated third parties.
          </p>
        </section>
      </div>
    </div>
  );
}
