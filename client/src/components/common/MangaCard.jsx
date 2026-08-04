import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, Star } from 'lucide-react';
import { mangaImage } from '../../lib/utils';

// Displays a manga card with poster, status and rating info.
export default function MangaCard({ manga }) {
  const {
    title,
    slug,
    poster,
    status,
    user_rating,
    rating,
    rating_count,
    genres,
  } = manga;

  const genreList = typeof genres === 'string'
    ? genres.split(',').filter(Boolean).map((g) => g.trim())
    : (Array.isArray(genres) ? genres : []);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Link to={`/manga/${slug}`} className="group block card-anime overflow-hidden">
        <div className="relative aspect-[3/4] overflow-hidden rounded-t-xl bg-panel">
          <img
            src={mangaImage(poster) || '/placeholder-poster.png'}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-75 group-hover:scale-100">
              <div className="w-12 h-12 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {status && (
            <div
              className={`absolute top-2 left-2 badge text-[10px] px-1.5 py-0.5 font-semibold ${
                status === 'ongoing' || status === 'Ongoing'
                  ? 'bg-success/20 text-success'
                  : 'bg-primary/20 text-primary'
              }`}
            >
              {status}
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className="text-sm font-medium text-text line-clamp-2 mb-1.5 leading-tight">
            {title}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(user_rating || rating) > 0 && (
                <>
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="text-xs text-muted font-medium">
                    {user_rating || rating}
                  </span>
                </>
              )}
              {rating_count > 0 && (
                <span className="text-[10px] text-muted">({rating_count})</span>
              )}
            </div>
            {genreList.length > 0 && (
              <span className="text-[10px] text-muted truncate max-w-[80px]">
                {genreList[0]}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
