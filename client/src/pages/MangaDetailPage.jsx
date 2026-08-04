import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, ChevronRight, Calendar, User as UserIcon, Palette, Star,
} from 'lucide-react';
import api from '../lib/api';
import MangaCard from '../components/common/MangaCard';
import Skeleton from '../components/common/Skeleton';
import GenreTag from '../components/common/GenreTag';
import RatingSection from '../components/common/RatingSection';
import useSEO from '../hooks/useSEO';
import { cn, formatNumber, getStatusColor, mangaImage } from '../lib/utils';

const fadeIn = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

// MangaDetailPage: renders a single manga's details, chapters, ratings, and similar manga
export default function MangaDetailPage() {
  const { slug } = useParams();
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useSEO({
    title: manga?.title || 'Manga Details',
    description: manga?.description ? `${manga.description.slice(0, 160)}...` : undefined,
    image: mangaImage(manga?.poster) || undefined,
  });

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api.get(`/manga/${slug}`)
      .then((res) => setManga(res.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="h-[350px] w-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-40 w-full" />
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !manga) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Manga not found</h2>
          <p className="text-text-muted mb-4">This manga might not be imported yet.</p>
          <Link to="/manga" className="text-[#0ea5e9] hover:underline">Browse Manga</Link>
        </div>
      </div>
    );
  }

  const genres = typeof manga.genres === 'string'
    ? manga.genres.split(',').filter(Boolean).map((g) => g.trim())
    : (Array.isArray(manga.genres) ? manga.genres : []);
  const chapters = manga.chapters || [];
  const similar = manga.similar || [];

  return (
    <div className="min-h-screen">
      <div className="relative h-[300px] md:h-[400px]">
        <img
          src={mangaImage(manga.poster)}
          alt={manga.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/70 to-[#0f172a]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28 relative z-10">
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-text-muted mb-6"
        >
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/manga" className="hover:text-primary transition-colors">Manga</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-primary">{manga.title}</span>
        </motion.nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }}>
            <div className="flex flex-col sm:flex-row gap-6 mb-8">
              <motion.img
                variants={fadeIn}
                src={mangaImage(manga.poster)}
                alt={manga.title}
                className="w-48 sm:w-56 flex-shrink-0 rounded-xl shadow-2xl mx-auto sm:mx-0 object-cover aspect-[3/4]"
              />
              <motion.div variants={fadeIn} className="flex-1 space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-text-primary">{manga.title}</h1>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn('px-3 py-1 rounded-full text-sm font-medium border', getStatusColor(manga.status === 'completed' ? 'finished' : manga.status === 'ongoing' ? 'airing' : manga.status))}>
                    {manga.status}
                  </span>
                  {(manga.user_rating || manga.rating) > 0 && (
                    <span className="flex items-center gap-1 text-yellow-400 text-sm">
                      <Star className="w-4 h-4 fill-yellow-400" /> {manga.user_rating || manga.rating}
                    </span>
                  )}
                  {manga.year && (
                    <span className="text-text-muted text-sm flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {manga.year}
                    </span>
                  )}
                  <span className="text-text-muted text-sm flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> {chapters.length} Chapters
                  </span>
                </div>

                {manga.author && (
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <UserIcon className="w-3.5 h-3.5" /> Author: <span className="text-text-primary">{manga.author}</span>
                  </div>
                )}
                {manga.artist && (
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Palette className="w-3.5 h-3.5" /> Artist: <span className="text-text-primary">{manga.artist}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {genres.map((g, i) => <GenreTag key={i} genre={g} />)}
                </div>

                <p className="text-text-muted leading-relaxed text-sm">
                  {manga.description || 'No description available.'}
                </p>
              </motion.div>
            </div>

            {/* Chapters */}
            <motion.section variants={fadeIn} className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-text-primary">
                  Chapters <span className="text-text-muted text-sm font-normal">({chapters.length})</span>
                </h2>
              </div>

              {chapters.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-muted">No chapters imported yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapters.map((ch, i) => ch.external_url ? (
                    <a
                      key={ch.id || ch.chapter_uuid || i}
                      href={ch.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-3 rounded-lg border border-border-custom bg-panel hover:bg-panel-hover hover:border-[#0ea5e9]/50 transition-all"
                    >
                      <div className="w-9 h-9 rounded bg-bg flex items-center justify-center text-sm text-text-muted font-medium flex-shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">
                          {ch.title || `Chapter ${ch.chapter_number || '?'}`}
                        </p>
                        {ch.scanlation_group && (
                          <p className="text-xs text-text-muted truncate">{ch.scanlation_group}</p>
                        )}
                      </div>
                      <span className="text-xs text-text-muted flex-shrink-0">
                        {ch.chapter_number ? `Ch. ${ch.chapter_number}` : ''}
                      </span>
                    </a>
                  ) : (
                    <Link
                      key={ch.id || ch.chapter_uuid || i}
                      to={`/manga/${manga.id}/read?chapter=${ch.chapter_uuid}`}
                      className="flex items-center gap-4 p-3 rounded-lg border border-border-custom bg-panel hover:bg-panel-hover hover:border-[#0ea5e9]/50 transition-all"
                    >
                      <div className="w-9 h-9 rounded bg-bg flex items-center justify-center text-sm text-text-muted font-medium flex-shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">
                          {ch.title || `Chapter ${ch.chapter_number || '?'}`}
                        </p>
                        {ch.scanlation_group && (
                          <p className="text-xs text-text-muted truncate">{ch.scanlation_group}</p>
                        )}
                      </div>
                      <span className="text-xs text-text-muted flex-shrink-0">
                        {ch.chapter_number ? `Ch. ${ch.chapter_number}` : ''}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </motion.section>

            {/* Ratings & Reviews */}
            <motion.section variants={fadeIn}>
              <RatingSection contentType="manga" contentId={manga.id} />
            </motion.section>
          </motion.div>

          {/* Sidebar */}
          <motion.aside
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
            className="space-y-4"
          >
            <motion.div variants={fadeIn} className="bg-panel border border-border-custom rounded-xl p-5 space-y-3 sticky top-24">
              <Link
                to={chapters.length > 0 && !chapters[chapters.length - 1].external_url ? `/manga/${manga.id}/read?chapter=${chapters[chapters.length - 1].chapter_uuid}` : '#'}
                onClick={chapters.length > 0 && chapters[chapters.length - 1].external_url ? () => window.open(chapters[chapters.length - 1].external_url, '_blank', 'noopener,noreferrer') : undefined}
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-[#0ea5e9]/70 text-white py-3 rounded-lg font-semibold transition-all shadow-lg shadow-[#0ea5e9]/25"
              >
                <BookOpen className="w-5 h-5" /> {chapters.length > 0 ? 'Read Latest' : 'Coming Soon'}
              </Link>

              <div className="border-t border-border-custom pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">Information</h3>
                {manga.year && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Year</span>
                    <span className="text-text-primary">{manga.year}</span>
                  </div>
                )}
                {manga.demography && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Demography</span>
                    <span className="text-text-primary">{manga.demography}</span>
                  </div>
                )}
                {manga.content_rating && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Content Rating</span>
                    <span className="text-text-primary capitalize">{manga.content_rating}</span>
                  </div>
                )}
                {manga.author && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Author</span>
                    <span className="text-text-primary">{manga.author}</span>
                  </div>
                )}
                {manga.follow_count > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Followers</span>
                    <span className="text-text-primary">{formatNumber(manga.follow_count)}</span>
                  </div>
                )}
                {manga.views > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Views</span>
                    <span className="text-text-primary">{formatNumber(manga.views)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Rating Count</span>
                  <span className="text-text-primary">{manga.rating_count || 0}</span>
                </div>
              </div>
            </motion.div>
          </motion.aside>
        </div>

        {/* Similar manga */}
        {similar.length > 0 && (
          <motion.section
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            className="mt-12 mb-16"
          >
            <h2 className="text-xl font-bold text-text-primary mb-6">Similar Manga</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {similar.slice(0, 5).map((m, i) => (
                <motion.div key={m.id || m.slug || i} variants={fadeIn}>
                  <MangaCard manga={m} />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
