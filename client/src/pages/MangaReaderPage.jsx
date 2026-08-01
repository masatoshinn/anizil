import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen, Loader2, List, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import useSEO from '../hooks/useSEO';
import { cn } from '../lib/utils';

export default function MangaReaderPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const chapterUuid = searchParams.get('chapter') || '';
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useSaver, setUseSaver] = useState(false);
  const [showList, setShowList] = useState(false);

  useSEO({ title: data?.chapter?.title || 'Manga Reader', description: 'Read manga chapters online' });

  useEffect(() => {
    if (!chapterUuid) return;
    setLoading(true);
    setError('');
    setData(null);
    api.get(`/manga/${id}/read`, { params: { chapter: chapterUuid } })
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load chapter'))
      .finally(() => setLoading(false));
  }, [id, chapterUuid]);

  const chapterList = data?.chapterList || [];
  const currentIndex = chapterList.findIndex((c) => c.chapter_uuid === chapterUuid);
  const prevChapter = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;
  const pages = useSaver && data?.chapter?.dataSaver?.length
    ? data.chapter.dataSaver
    : (data?.chapter?.pages || []);

  const goChapter = (uuid) => {
    if (!uuid) return;
    navigate(`/manga/${id}/read?chapter=${uuid}`);
    window.scrollTo(0, 0);
    setShowList(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#0ea5e9] animate-spin" />
          <p className="text-text-muted text-sm">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <h2 className="text-2xl font-bold text-text-primary mb-2">This chapter is unavailable</h2>
          <p className="text-text-muted mb-4">{error || 'Chapter not found'}</p>
          <Link to="/manga" className="text-[#0ea5e9] hover:underline">Back to Manga</Link>
        </div>
      </div>
    );
  }

  // Chapter hosted externally (e.g. on the scanlator's website)
  if (data.chapter?.external) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4 max-w-md">
          <div className="w-16 h-16 bg-primary/15 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Chapter hosted externally</h2>
          <p className="text-text-muted mb-2">{data.chapter.title}</p>
          <p className="text-text-muted text-sm mb-6">
            This chapter is published on an external website by the scanlation group
            {data.chapter.scanlation_group ? ` (${data.chapter.scanlation_group})` : ''}.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={data.chapter.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
            >
              <BookOpen className="w-4 h-4" /> Open Chapter
            </a>
            <Link to={`/manga/${data.manga.id}`} className="text-[#0ea5e9] hover:underline">
              Back to {data.manga.title}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1c]">
      {/* Reader header */}
      <div className="sticky top-0 z-40 glass-strong border-b border-border-custom">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-14 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link to={`/manga/${data.manga.id}`} className="p-2 rounded-lg hover:bg-panel-hover text-text-muted" title="Back to manga">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{data.manga.title}</p>
              <p className="text-xs text-text-muted truncate">{data.chapter.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowList(!showList)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel border border-border-custom text-text-muted hover:text-text-primary transition-colors text-sm"
              title="Chapter list"
            >
              <List className="w-4 h-4" /> Chapters
            </button>
            <button
              onClick={() => setUseSaver(!useSaver)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-sm transition-colors',
                useSaver ? 'bg-primary/15 text-primary border-primary/30' : 'bg-panel border-border-custom text-text-muted hover:text-text-primary'
              )}
              title="Toggle data saver (lower quality)"
            >
              Saver
            </button>
          </div>
        </div>

        {/* Chapter dropdown */}
        {showList && (
          <div className="max-w-4xl mx-auto px-4 pb-3">
            <div className="max-h-64 overflow-y-auto bg-panel border border-border-custom rounded-xl p-2 space-y-0.5">
              {chapterList.map((c) => (
                <button
                  key={c.chapter_uuid}
                  onClick={() => goChapter(c.chapter_uuid)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate',
                    c.chapter_uuid === chapterUuid
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-text-muted hover:bg-panel-hover hover:text-text-primary'
                  )}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pages */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {pages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-muted">No images available for this chapter</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {pages.map((src, i) => (
              <motion.img
                key={i}
                src={src}
                alt={`Page ${i + 1}`}
                loading="lazy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full rounded-lg shadow-lg bg-[#0f172a]"
              />
            ))}
          </div>
        )}

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between gap-3 mt-8 mb-4">
          <button
            onClick={() => goChapter(prevChapter?.chapter_uuid)}
            disabled={!prevChapter}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors',
              prevChapter
                ? 'bg-panel border-border-custom text-text-primary hover:bg-panel-hover'
                : 'bg-panel border-border-custom text-text-muted opacity-40 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>

          <span className="text-sm text-text-muted flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {data.chapter.chapter_number ? `Chapter ${data.chapter.chapter_number}` : 'Chapter'}
          </span>

          <button
            onClick={() => goChapter(nextChapter?.chapter_uuid)}
            disabled={!nextChapter}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors',
              nextChapter
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-panel border-border-custom text-text-muted opacity-40 cursor-not-allowed'
            )}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
