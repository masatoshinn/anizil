import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import useSEO from '../hooks/useSEO';

const SECTIONS = [
  { title: '1. Information We Collect', body: 'When you create an account, we collect your name, email address, and avatar. We also store data about your activity such as watchlists, watch history, comments, and forum posts.' },
  { title: '2. How We Use Your Information', body: 'We use your information to provide and improve our service, personalize your experience, track XP and achievements, and communicate important account-related updates.' },
  { title: '3. Cookies', body: 'We use cookies and similar technologies to keep you logged in and remember your preferences. You can disable cookies in your browser, but some features may not work properly.' },
  { title: '4. Data Sharing', body: 'We do not sell your personal data. Public information such as your username, avatar, and public activity is visible to other users. Your email address is never shared with third parties.' },
  { title: '5. Data Security', body: 'Passwords are securely hashed. We take reasonable measures to protect your data, but no method of transmission over the internet is 100% secure.' },
  { title: '6. Third-Party Content', body: 'Our site links to third-party services (video providers, image APIs). Their privacy policies govern how they handle data. We are not responsible for their practices.' },
  { title: '7. Your Rights', body: 'You can edit your profile, clear your watch history, or delete your account data by contacting us. You may also request a copy of the data we hold about you.' },
  { title: '8. Children\'s Privacy', body: 'Anizil is not directed at children under 13. We do not knowingly collect personal information from children under 13.' },
  { title: '9. Changes to This Policy', body: 'We may update this privacy policy from time to time. We will notify you of material changes by posting the new policy on this page.' },
];

export default function PrivacyPage() {
  useSEO({ title: 'Privacy Policy', description: 'Privacy policy explaining what data Anizil collects and how it is used.' });
  return (
    <div className="min-h-screen">
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9]/10 via-[#0f172a] to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <ShieldCheck className="w-12 h-12 text-[#0ea5e9] mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-[#f8fafc] mb-3">Privacy Policy</h1>
          <p className="text-[#94a3b8] text-sm">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-6">
        {SECTIONS.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-6"
          >
            <h2 className="text-[#f8fafc] font-semibold mb-2">{s.title}</h2>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{s.body}</p>
          </motion.div>
        ))}
        <div className="text-center pt-4">
          <p className="text-[#94a3b8] text-sm">
            Questions about your privacy? <Link to="/contact" className="text-[#0ea5e9] hover:underline">Contact us</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
