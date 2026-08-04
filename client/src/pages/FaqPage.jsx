import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSEO from '../hooks/useSEO';

const FAQS = [
  {
    q: 'Is Anizil free to use?',
    a: 'Yes, Anizil is completely free to use. You can watch anime, participate in the forum, and join the community without paying anything.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'You can browse anime without an account, but creating a free account lets you save a watchlist, track your progress, earn XP, unlock achievements, and join forum discussions.',
  },
  {
    q: 'What are XP and levels?',
    a: 'You earn XP by watching episodes, commenting, and adding anime to your watchlist. Your level increases every 1000 XP. Higher levels showcase your activity on your public profile.',
  },
  {
    q: 'How do badges work?',
    a: 'Badges are special recognitions awarded by our team to active and notable members. They appear on your profile, next to your comments, and in the community. The verified badge is reserved for official accounts.',
  },
  {
    q: 'What are profile frames?',
    a: 'Profile frames are decorative borders for your avatar. You can purchase them from the shop using XP and activate one at a time from your dashboard.',
  },
  {
    q: 'Why is some anime marked as Premium?',
    a: 'Premium anime requires a one-time unlock of 200 XP. This helps keep our servers running and rewards active community members.',
  },
  {
    q: 'Can I watch in HD?',
    a: 'Yes, most titles are available in HD quality. Video quality depends on the source provided by our third-party providers.',
  },
  {
    q: 'How do I reset my password?',
    a: 'Visit the Forgot Password page, enter your registered email, and we will send you a secure reset link that expires in 1 hour.',
  },
  {
    q: 'My video is buffering or not loading. What should I do?',
    a: 'Try refreshing the page, switching to a different server, or clearing your browser cache. Make sure you have a stable internet connection.',
  },
  {
    q: 'How do I report a problem or a bad comment?',
    a: 'You can report inappropriate comments directly using the report button on the comment, or visit the Contact page to send us a message.',
  },
];

// FaqItem: single expandable accordion entry for one Q&A pair
function FaqItem({ faq, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-[#f8fafc] font-medium text-sm sm:text-base">{faq.q}</span>
        <ChevronDown className={`w-5 h-5 text-[#0ea5e9] flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <p className="px-5 pb-4 text-[#94a3b8] text-sm leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// FaqPage: accordion-style frequently asked questions page
export default function FaqPage() {
  useSEO({ title: 'FAQ', description: 'Frequently asked questions about Anizil - how to use the platform, features, and more.' });
  return (
    <div className="min-h-screen">
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9]/10 via-[#0f172a] to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <HelpCircle className="w-12 h-12 text-[#0ea5e9] mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-[#f8fafc] mb-3">Frequently Asked Questions</h1>
          <p className="text-[#94a3b8]">Everything you need to know about Anizil</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-3">
        {FAQS.map((faq, i) => <FaqItem key={i} faq={faq} index={i} />)}
        <div className="text-center pt-8">
          <p className="text-[#94a3b8] text-sm mb-4">Still have questions?</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg font-medium transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
