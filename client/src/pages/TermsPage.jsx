import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import useSEO from '../hooks/useSEO';

const SECTIONS = [
  { title: '1. Acceptance of Terms', body: 'By accessing or using Anizil, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use the site.' },
  { title: '2. Description of Service', body: 'Anizil provides a platform for streaming anime content. We do not host, upload, or store any video files on our servers. All content is provided by third-party sources.' },
  { title: '3. Accounts', body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 13 years old to create an account.' },
  { title: '4. Acceptable Use', body: 'You agree not to misuse the service, attempt to gain unauthorized access, disrupt the platform, distribute malicious content, or engage in any activity that violates applicable laws.' },
  { title: '5. User Content', body: 'You retain ownership of content you post (comments, forum posts). By posting, you grant Anizil a non-exclusive license to display that content. You agree not to post illegal, offensive, or copyrighted content.' },
  { title: '6. Intellectual Property', body: 'All site branding, design, and original content belong to Anizil. Anime titles, images, and media belong to their respective copyright holders.' },
  { title: '7. Termination', body: 'We may suspend or terminate accounts that violate these terms, including spamming, harassment, or sharing malicious content. Banned users may not create new accounts.' },
  { title: '8. Limitation of Liability', body: 'Anizil is provided "as is" without warranties. We are not liable for any damages arising from the use of the site or from third-party content providers.' },
  { title: '9. Changes to Terms', body: 'We may update these terms periodically. Continued use of the site after changes constitutes acceptance of the new terms.' },
];

export default function TermsPage() {
  useSEO({ title: 'Terms of Service', description: 'Terms of Service for using the Anizil anime streaming platform.' });
  return (
    <div className="min-h-screen">
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9]/10 via-[#0f172a] to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <FileText className="w-12 h-12 text-[#0ea5e9] mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-[#f8fafc] mb-3">Terms of Service</h1>
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
            Questions about these terms? <Link to="/contact" className="text-[#0ea5e9] hover:underline">Contact us</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
