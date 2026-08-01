import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, MessageSquare, ThumbsUp, Flag, Reply, Loader2, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const REACTIONS = ['👍', '❤️', '😂', '😢', '🔥'];

export default function CommentsSection({ animeId, episodeId }) {
  const { user, isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState({});

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (episodeId) params.episode_id = episodeId;
      else if (animeId) params.anime_id = animeId;
      if (Object.keys(params).length === 0) return;
      const res = await api.get('/comments', { params });
      setComments(res.data.data?.comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }, [animeId, episodeId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await api.post('/comments', {
        content: content.trim(),
        episodeId: episodeId || null,
        animeId: animeId || null
      });
      setContent('');
      toast.success('Comment posted!');
      fetchComments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post comment');
    }
    setPosting(false);
  };

  const handleReply = async (parentId) => {
    const text = (replyContent[parentId] || '').trim();
    if (!text) return;
    try {
      await api.post('/comments', {
        content: text,
        episodeId: episodeId || null,
        animeId: animeId || null,
        parentId
      });
      setReplyContent({ ...replyContent, [parentId]: '' });
      setReplyTo(null);
      toast.success('Reply posted!');
      fetchComments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post reply');
    }
  };

  const handleLike = async (id) => {
    try {
      await api.post(`/comments/${id}/like`);
      fetchComments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login to like');
    }
  };

  const handleReaction = async (commentId, emoji) => {
    if (!isAuthenticated) {
      toast.error('Login to react');
      return;
    }
    try {
      const res = await api.post(`/comments/${commentId}/reaction`, { reaction: emoji });
      const { reactions, my_reaction } = res.data.data;
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, reactions, my_reaction } : c))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to react');
    }
  };

  const handleReport = async (id) => {
    const reason = window.prompt('Reason for reporting this comment:');
    if (!reason) return;
    try {
      await api.post(`/comments/${id}/report`, { reason });
      toast.success('Report submitted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report');
    }
  };

  const nameStyle = (color) => {
    if (!color) return undefined;
    if (color.startsWith('linear-gradient')) {
      return { color: 'transparent', backgroundImage: color, WebkitBackgroundClip: 'text', backgroundClip: 'text' };
    }
    return { color };
  };

  const Avatar = ({ comment }) => (
    <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-[rgba(148,163,184,0.2)]"
      style={{ borderColor: comment.frame_color || '#0ea5e9', borderWidth: comment.frame_image ? 2 : 1 }}>
      {comment.user_avatar ? (
        <img src={comment.user_avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-[#1e293b] flex items-center justify-center text-xs font-bold text-[#0ea5e9]">
          {(comment.user_name || 'U')[0].toUpperCase()}
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-[#0ea5e9]" />
        Comments ({loading ? '...' : comments.length})
      </h3>

      {/* Comment form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="flex items-start gap-3 mb-6">
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-[rgba(148,163,184,0.2)]">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#1e293b] flex items-center justify-center text-xs font-bold text-[#0ea5e9]">
                {(user?.name || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]/50 transition-colors"
            />
            <button
              type="submit"
              disabled={posting || !content.trim()}
              className="px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-[#1e293b] border border-[rgba(148,163,184,0.12)] rounded-xl p-4 text-center mb-6">
          <p className="text-sm text-text-muted mb-2">
            <Link to="/login" className="text-[#0ea5e9] hover:underline">Login</Link> or{' '}
            <Link to="/register" className="text-[#0ea5e9] hover:underline">Register</Link> to join the discussion
          </p>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1e293b]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-[#1e293b] rounded" />
                <div className="h-3 w-full bg-[#1e293b] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8">No comments yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1e293b]/60 border border-[rgba(148,163,184,0.1)] rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <Avatar comment={comment} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {comment.user_id ? (
                      <Link
                        to={`/user/${comment.user_id}`}
                        className="text-text-primary text-sm font-medium hover:text-[#0ea5e9] transition-colors"
                        style={nameStyle(comment.user_name_color)}
                      >
                        {comment.user_name || 'Anonymous'}
                      </Link>
                    ) : (
                      <span className="text-text-primary text-sm font-medium" style={nameStyle(comment.user_name_color)}>
                        {comment.user_name || 'Anonymous'}
                      </span>
                    )}
                    {comment.badges && comment.badges.slice(0, 3).map((badge) =>
                      badge.is_verified ? (
                        <span key={badge.id} className="inline-flex items-center justify-center w-4 h-4 rounded-full" style={{ backgroundColor: badge.color }} title={badge.name}>
                          <CheckCircle className="w-3 h-3 text-white" />
                        </span>
                      ) : (
                        <span key={badge.id} className="text-sm" style={{ color: badge.color }} title={badge.name}>{badge.icon}</span>
                      )
                    )}
                    <span className="text-xs text-text-muted">{new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <p className="text-text-primary text-sm leading-relaxed">{comment.content}</p>

                  {/* Emoji reactions */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {REACTIONS.map((emoji) => {
                      const count = comment.reactions?.find((r) => r.reaction === emoji)?.count || 0;
                      const active = comment.my_reaction === emoji;
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(comment.id, emoji)}
                          disabled={!isAuthenticated}
                          title={!isAuthenticated ? 'Login to react' : undefined}
                          className={`flex items-center gap-1 text-sm leading-none px-2 py-1 rounded-lg border transition-colors disabled:cursor-not-allowed ${
                            active
                              ? 'bg-[#0ea5e9]/10 border-[#0ea5e9]/40'
                              : 'border-[rgba(148,163,184,0.12)] bg-[#0f172a] hover:border-[#0ea5e9]/40'
                          }`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span className="text-xs text-text-muted">{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4 mt-2">
                    <button onClick={() => handleLike(comment.id)} className="flex items-center gap-1 text-xs text-text-muted hover:text-[#0ea5e9] transition-colors">
                      <ThumbsUp className="w-3.5 h-3.5" /> {comment.likes || 0}
                    </button>
                    <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="flex items-center gap-1 text-xs text-text-muted hover:text-[#0ea5e9] transition-colors">
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                    {isAuthenticated && (
                      <button onClick={() => handleReport(comment.id)} className="flex items-center gap-1 text-xs text-text-muted hover:text-[#ef4444] transition-colors">
                        <Flag className="w-3.5 h-3.5" /> Report
                      </button>
                    )}
                  </div>

                  {/* Reply form */}
                  {replyTo === comment.id && isAuthenticated && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={replyContent[comment.id] || ''}
                        onChange={(e) => setReplyContent({ ...replyContent, [comment.id]: e.target.value })}
                        placeholder="Write a reply..."
                        className="flex-1 bg-[#0f172a] border border-[rgba(148,163,184,0.12)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]/50 transition-colors"
                      />
                      <button onClick={() => handleReply(comment.id)} className="px-3 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg text-sm transition-colors">
                        Reply
                      </button>
                    </div>
                  )}

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 space-y-3 border-l-2 border-[rgba(148,163,184,0.15)] pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-3">
                          <Avatar comment={reply} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              {reply.user_id ? (
                                <Link
                                  to={`/user/${reply.user_id}`}
                                  className="text-text-primary text-xs font-medium hover:text-[#0ea5e9] transition-colors"
                                  style={nameStyle(reply.user_name_color)}
                                >
                                  {reply.user_name || 'Anonymous'}
                                </Link>
                              ) : (
                                <span className="text-text-primary text-xs font-medium" style={nameStyle(reply.user_name_color)}>
                                  {reply.user_name || 'Anonymous'}
                                </span>
                              )}
                              {reply.badges && reply.badges.slice(0, 2).map((badge) =>
                                badge.is_verified ? (
                                  <span key={badge.id} className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full" style={{ backgroundColor: badge.color }} title={badge.name}>
                                    <CheckCircle className="w-2.5 h-2.5 text-white" />
                                  </span>
                                ) : (
                                  <span key={badge.id} className="text-xs" style={{ color: badge.color }} title={badge.name}>{badge.icon}</span>
                                )
                              )}
                            </div>
                            <p className="text-text-primary text-sm">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                      {comment.reply_count > comment.replies.length && (
                        <button onClick={fetchComments} className="text-xs text-[#0ea5e9] hover:underline">
                          View all {comment.reply_count} replies
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
