import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Star, Crown } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore';

// Displays an anime card with poster, status, rating and premium badge.
export default function AnimeCard({ anime }) {
  const { premiumEnabled, fetched, fetchSettings } = useSettingsStore();
  useEffect(() => { if (!fetched) fetchSettings(); }, []);
  const {
    title,
    slug,
    poster,
    episode_count,
    status,
    rating,
    genres,
    is_premium,
  } = anime;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Link to={`/anime/${slug}`} className="group block card-anime overflow-hidden">
        <div className="relative aspect-[3/4] overflow-hidden rounded-t-xl bg-panel">
          <img
            src={poster || '/placeholder-poster.png'}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-75 group-hover:scale-100">
              <div className="w-12 h-12 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>

          {/* Episode badge */}
          {episode_count > 0 && (
            <div className="absolute top-2 right-2 badge-primary text-[10px] px-1.5 py-0.5 font-semibold">
              EP {episode_count}
            </div>
          )}

          {/* Status badge */}
          {status && (
            <div
              className={`absolute top-2 left-2 badge text-[10px] px-1.5 py-0.5 font-semibold ${
                status === 'Ongoing'
                  ? 'bg-success/20 text-success'
                  : 'bg-primary/20 text-primary'
              }`}
            >
              {status}
            </div>
          )}

          {/* Premium crown badge */}
          {is_premium && premiumEnabled ? (
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-yellow-500/20 backdrop-blur-sm flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[10px] font-bold text-yellow-400">PREMIUM</span>
            </div>
          ) : null}
        </div>

        <div className="p-3">
          <h3 className="text-sm font-medium text-text line-clamp-2 mb-1.5 leading-tight">
            {title}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {rating != null && (
                <>
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="text-xs text-muted font-medium">{rating}</span>
                </>
              )}
            </div>
            {genres?.length > 0 && (
              <span className="text-[10px] text-muted truncate max-w-[80px]">
                {genres[0]}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
