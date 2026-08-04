import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Plus, ThumbsUp, ChevronRight, Clock, User, X, Send, ChevronDown,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import { timeAgo, cn } from '../lib/utils';
import api from '../lib/api';

const CATEGORIES = ['All', 'General', 'Recommendations', 'Discussion', 'Help'];
const CATEGORY_COLORS = {
  General: 'bg-blue-500/20 text-blue-400',
  Recommendations: 'bg-green-500/20 text-green-400',
  Discussion: 'bg-purple-500/20 text-purple-400',
  Help: 'bg-yellow-500/20 text-yellow-400',
};

const fadeIn = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };

// ForumPage: community forum with category tabs, thread list, thread creation, and replies
export default function ForumPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create Thread Modal
  const [showCreate, setShowCreate] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', content: '', category: 'General' });
  const [creating, setCreating] = useState(false);

  // Thread Detail
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadDetail, setThreadDetail] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    loadThreads();
  }, [activeCategory, page]);

  // Loads the paginated thread list for the active category
  const loadThreads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (activeCategory !== 'All') params.append('category', activeCategory);
      const res = await api.get(`/forum/threads?${params}`);
      setThreads(res.data.threads || res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch {}
    setLoading(false);
  };

  // Creates a new forum thread from the modal form
  const createThread = async (e) => {
    e.preventDefault();
    if (!newThread.title.trim() || !newThread.content.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/forum/threads', newThread);
      setThreads([res.data.thread || res.data, ...threads]);
      setShowCreate(false);
      setNewThread({ title: '', content: '', category: 'General' });
    } catch {}
    setCreating(false);
  };

  // Opens a thread and fetches its detail and replies
  const openThread = async (thread) => {
    setSelectedThread(thread);
    try {
      const res = await api.get(`/forum/threads/${thread._id}`);
      setThreadDetail(res.data.thread || res.data);
      setReplies(res.data.replies || []);
    } catch {}
  };

  // Posts a reply to the selected thread and appends it to the list
  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThread) return;
    setReplyLoading(true);
    try {
      const res = await api.post(`/forum/threads/${selectedThread._id}/replies`, { text: replyText });
      setReplies([...replies, res.data.reply || res.data]);
      setReplyText('');
    } catch {}
    setReplyLoading(false);
  };

  // Likes a forum thread and increments its local like count
  const likeThread = async (threadId) => {
    try {
      await api.post(`/forum/threads/${threadId}/like`);
      setThreads((prev) =>
        prev.map((t) =>
          t._id === threadId ? { ...t, likes: (t.likes || 0) + 1 } : t
        )
      );
    } catch {}
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#f8fafc]">Forum</h1>
            <p className="text-[#94a3b8] text-sm mt-1">Join the community discussion</p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-medium transition-colors shadow-lg shadow-[#0ea5e9]/25"
            >
              <Plus className="w-4 h-4" /> New Thread
            </button>
          )}
        </motion.div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setPage(1); }}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                activeCategory === cat
                  ? 'bg-[#0ea5e9] text-white border-[#0ea5e9]'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:text-[#f8fafc] border-[rgba(148,163,184,0.12)]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Thread List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-16 h-16 text-[#94a3b8]/30 mx-auto mb-4" />
            <h3 className="text-[#f8fafc] text-xl font-semibold mb-2">No threads yet</h3>
            <p className="text-[#94a3b8]">Be the first to start a discussion</p>
          </div>
        ) : (
          <>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {threads.map((thread) => (
                <motion.div
                  key={thread._id}
                  variants={fadeIn}
                  className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 hover:bg-[#334155] transition-colors cursor-pointer"
                  onClick={() => openThread(thread)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-[#0ea5e9]/20 flex items-center justify-center text-[#0ea5e9] text-sm font-bold flex-shrink-0">
                      {(thread.author?.name || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          CATEGORY_COLORS[thread.category] || 'bg-gray-500/20 text-gray-400'
                        )}>
                          {thread.category}
                        </span>
                      </div>
                      <h3 className="text-[#f8fafc] font-semibold mb-1 truncate">{thread.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-[#94a3b8]">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {thread.author?.name || 'Anonymous'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timeAgo(thread.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> {thread.replyCount || replies.length || 0}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); likeThread(thread._id); }}
                          className="flex items-center gap-1 hover:text-[#0ea5e9] transition-colors"
                        >
                          <ThumbsUp className="w-3 h-3" /> {thread.likes || 0}
                        </button>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#94a3b8] flex-shrink-0 mt-2" />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}

        {/* Create Thread Modal */}
        <AnimatePresence>
          {showCreate && (
            <Modal onClose={() => setShowCreate(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-2xl p-6 max-w-lg w-full mx-4"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[#f8fafc]">Create Thread</h2>
                  <button onClick={() => setShowCreate(false)} className="text-[#94a3b8] hover:text-[#f8fafc]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={createThread} className="space-y-4">
                  <div>
                    <label className="block text-[#94a3b8] text-sm mb-1">Category</label>
                    <select
                      value={newThread.category}
                      onChange={(e) => setNewThread({ ...newThread, category: e.target.value })}
                      className="w-full bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg px-4 py-2.5 text-[#f8fafc] text-sm focus:outline-none focus:border-[#0ea5e9]/50"
                    >
                      {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#94a3b8] text-sm mb-1">Title</label>
                    <input
                      type="text"
                      value={newThread.title}
                      onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                      placeholder="Thread title..."
                      className="w-full bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg px-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[#94a3b8] text-sm mb-1">Content</label>
                    <textarea
                      value={newThread.content}
                      onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                      placeholder="Write your thread content..."
                      rows={5}
                      className="w-full bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg px-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creating || !newThread.title.trim() || !newThread.content.trim()}
                    className="w-full py-2.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Thread'}
                  </button>
                </form>
              </motion.div>
            </Modal>
          )}
        </AnimatePresence>

        {/* Thread Detail Modal */}
        <AnimatePresence>
          {selectedThread && (
            <Modal onClose={() => { setSelectedThread(null); setThreadDetail(null); setReplies([]); }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
              >
                <div className="flex items-center justify-between p-6 pb-0">
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      CATEGORY_COLORS[threadDetail?.category || selectedThread.category] || 'bg-gray-500/20 text-gray-400'
                    )}>
                      {threadDetail?.category || selectedThread.category}
                    </span>
                    <h2 className="text-xl font-bold text-[#f8fafc] mt-2 truncate">
                      {threadDetail?.title || selectedThread.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => { setSelectedThread(null); setThreadDetail(null); setReplies([]); }}
                    className="text-[#94a3b8] hover:text-[#f8fafc] ml-4"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Original Post */}
                  <div className="bg-[#0f172a] rounded-xl p-4">
                    <p className="text-[#94a3b8] text-sm leading-relaxed whitespace-pre-wrap">
                      {threadDetail?.content || selectedThread.content}
                    </p>
                  </div>

                  {/* Replies */}
                  {replies.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-[#f8fafc]">
                        {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                      </h3>
                      {replies.map((reply) => (
                        <div key={reply._id} className="bg-[#0f172a] rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-full bg-[#0ea5e9]/20 flex items-center justify-center text-[#0ea5e9] text-xs font-bold">
                              {(reply.author?.name || 'U')[0].toUpperCase()}
                            </div>
                            <span className="text-[#f8fafc] text-xs font-medium">{reply.author?.name || 'Anonymous'}</span>
                            <span className="text-[#94a3b8] text-xs">{timeAgo(reply.createdAt)}</span>
                          </div>
                          <p className="text-[#94a3b8] text-sm ml-8">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {isAuthenticated ? (
                  <form onSubmit={submitReply} className="p-4 border-t border-[rgba(148,163,184,0.12)]">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg px-4 py-2.5 text-[#f8fafc] placeholder-[#94a3b8] text-sm focus:outline-none focus:border-[#0ea5e9]/50"
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim() || replyLoading}
                        className="px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-4 border-t border-[rgba(148,163,184,0.12)] text-center">
                    <Link to="/login" className="text-[#0ea5e9] text-sm hover:underline">Login to reply</Link>
                  </div>
                )}
              </motion.div>
            </Modal>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
