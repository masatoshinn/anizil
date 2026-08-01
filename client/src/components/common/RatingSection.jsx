import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Trash2, Loader2, Send } from 'lucide-react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { cn, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function RatingSection({ contentType = 'anime', contentId }) {
  const { user, isAuthenticated } = useAuthStore();
  const [aggregate, setAggregate] = useState({ avg: 0, count: 0 });
  const [distribution, setDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [reviews, setReviews] = useState([]);
  const [mine, setMine] = useState(null);
  const [hoverStar, setHoverStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!contentId) return;
    setLoading(true);
    try {
      const res = await api.get(`/ratings/${contentType}/${contentId}`);
      const data = res.data.data || {};
      setAggregate(data.aggregate || { avg: 0, count: 0 });
      setDistribution(data.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      setReviews(data.reviews || []);
    } catch {
      setAggregate({ avg: 0, count: 0 });
      setReviews([]);
    }
    if (isAuthenticated) {
      try {
        const res = await api.get(`/ratings/${contentType}/${contentId}/mine`);
        const mineData = res.data.data;
        setMine(mineData);
        if (mineData) {
          setSelectedStar(mineData.rating);
          setReviewText(mineData.review || '');
        }
      } catch {}
    }
    setLoading(false);
  }, [contentType, contentId, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    if (selectedStar === 0) {
      toast.error('Select a star rating first');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/ratings/${contentType}/${contentId}`, {
        rating: selectedStar,
        review: reviewText,
      });
      setMine(res.data.data.rating);
      if (user && res.data.data.xp_earned > 0) {
        useAuthStore.setState({ user: { ...user, xp: res.data.data.new_xp } });
        toast.success(`${res.data.message} +${res.data.data.xp_earned} XP`);
      } else {
        toast.success(res.data.message || 'Rating saved');
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rating');
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/ratings/${contentType}/${contentId}`);
      setMine(null);
      setSelectedStar(0);
      setReviewText('');
      toast.success('Rating removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove rating');
    }
    setDeleting(false);
  };

  const renderStars = (value, size = 'w-4 h-4') => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const filled = value >= i;
      stars.push(
        <Star
          key={i}
          className={cn(size, filled ? 'text-yellow-400 fill-yellow-400' : 'text-[#334155]')}
        />
      );
    }
    return stars;
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-text-primary mb-4">Ratings & Reviews</h2>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 mb-8">
        {/* Aggregate summary */}
        <div className="bg-panel border border-border-custom rounded-xl p-6 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold text-text-primary mb-1">
            {aggregate.avg ? Number(aggregate.avg).toFixed(1) : '—'}
          </div>
          <div className="flex items-center gap-0.5 mb-2">
            {renderStars(Math.round(aggregate.avg))}
          </div>
          <p className="text-sm text-text-muted">
            {aggregate.count} rating{aggregate.count !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Distribution */}
        <div className="bg-panel border border-border-custom rounded-xl p-6">
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-text-muted flex items-center gap-1">
                  {star} <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                </span>
                <div className="flex-1 h-2.5 bg-[#0f172a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${aggregate.count ? (distribution[star] / aggregate.count) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-right text-text-muted">{distribution[star] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rating form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="bg-panel border border-border-custom rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-text-primary">
              {mine ? 'Update your rating' : 'Rate this'}
            </p>
            {mine && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-xs text-danger hover:underline"
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Remove my rating
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 mb-4" onMouseLeave={() => setHoverStar(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setSelectedStar(star)}
                onMouseEnter={() => setHoverStar(star)}
                className="transition-transform hover:scale-110"
                aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              >
                <Star
                  className={cn(
                    'w-8 h-8',
                    (hoverStar || selectedStar) >= star
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-[#334155]'
                  )}
                />
              </button>
            ))}
          </div>

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Write your review (optional)..."
            rows={3}
            className="w-full bg-bg border border-border-custom rounded-lg px-4 py-2.5 text-text-primary placeholder-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]/50 text-sm resize-none"
          />

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-text-muted">
              {selectedStar ? `You selected ${selectedStar}/5 stars` : 'Select 1-5 stars'}
            </p>
            <button
              type="submit"
              disabled={selectedStar === 0 || submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {mine ? 'Update Rating' : 'Submit Rating'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-text-muted text-sm mb-8">
          <Link to="/login" className="text-[#0ea5e9] hover:underline">Login</Link> to rate and review
        </p>
      )}

      {/* Reviews list */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#0ea5e9] animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-text-muted text-center py-6">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-panel border border-border-custom rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <Link to={`/user/${review.user_id}`} className="relative flex-shrink-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden"
                    style={{
                      background: review.user_avatar ? 'transparent' : `${review.frame_color || '#0ea5e9'}20`,
                      color: review.frame_color || '#0ea5e9',
                      border: `1.5px solid ${review.frame_color || '#0ea5e9'}`,
                      boxShadow: review.frame_color ? `0 0 6px ${review.frame_color}50` : 'none',
                    }}
                  >
                    {review.user_avatar ? (
                      <img src={review.user_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (review.user_name || 'U')[0].toUpperCase()
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link
                      to={`/user/${review.user_id}`}
                      className="text-text-primary text-sm font-medium hover:text-primary transition-colors"
                      style={review.user_name_color
                        ? review.user_name_color.startsWith('linear-gradient')
                          ? { color: 'transparent', backgroundImage: review.user_name_color, WebkitBackgroundClip: 'text', backgroundClip: 'text' }
                          : { color: review.user_name_color }
                        : undefined}
                    >
                      {review.user_name || 'Anonymous'}
                    </Link>
                    {review.badges && review.badges.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {review.badges.slice(0, 3).map((badge) => (
                          <span key={badge.id} className="text-[11px]" title={badge.name}>
                            {badge.icon}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-0.5 ml-1">
                      {renderStars(review.rating, 'w-3 h-3')}
                    </div>
                  </div>
                  <p className="text-text-muted text-sm">{review.review}</p>
                  <p className="text-[10px] text-text-muted mt-1">
                    {formatDate(review.created_at)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
