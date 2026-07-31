import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Play, ChevronRight } from 'lucide-react';
import useAnimeStore from '../store/animeStore';
import Skeleton from '../components/common/Skeleton';
import useSEO from '../hooks/useSEO';
import { cn } from '../lib/utils';
import api from '../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const fadeIn = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

export default function SchedulePage() {
  useSEO({ title: 'Schedule', description: 'Weekly anime release schedule - see which episodes air today and every day of the week.' });
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;
  const [activeDay, setActiveDay] = useState(DAYS[todayIndex]);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedule');
      setSchedule(res.data.schedule || res.data.data || {});
    } catch {}
    setLoading(false);
  };

  const daySchedule = schedule[activeDay] || [];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#f8fafc] mb-2">Weekly Schedule</h1>
          <p className="text-[#94a3b8]">Know when your favorite anime air</p>
        </motion.div>

        {/* Day Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={cn(
                'flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-medium transition-all border',
                activeDay === day
                  ? 'bg-[#0ea5e9] text-white border-[#0ea5e9] shadow-lg shadow-[#0ea5e9]/25'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155] border-[rgba(148,163,184,0.12)]'
              )}
            >
              {day.slice(0, 3)}
              {day === DAYS[todayIndex] && (
                <span className="ml-1.5 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">Today</span>
              )}
            </button>
          ))}
        </div>

        {/* Schedule Content */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : daySchedule.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Calendar className="w-16 h-16 text-[#94a3b8]/30 mx-auto mb-4" />
            <h3 className="text-[#f8fafc] text-xl font-semibold mb-2">No scheduled anime</h3>
            <p className="text-[#94a3b8]">Nothing is airing on {activeDay}</p>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            key={activeDay}
            className="space-y-3"
          >
            {daySchedule.map((item, i) => {
              const anime = item.anime || item;
              return (
                <motion.div
                  key={anime._id || anime.slug || i}
                  variants={fadeIn}
                >
                  <Link
                    to={`/anime/${anime.slug}`}
                    className="flex items-center gap-4 p-4 bg-[#1e293b] hover:bg-[#334155] rounded-xl border border-[rgba(148,163,184,0.12)] transition-all group"
                  >
                    <img
                      src={anime.image || anime.poster}
                      alt={anime.title}
                      className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[#f8fafc] font-semibold group-hover:text-[#0ea5e9] transition-colors truncate">
                        {anime.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        {item.time && (
                          <span className="flex items-center gap-1 text-[#0ea5e9] text-sm">
                            <Clock className="w-3.5 h-3.5" /> {item.time}
                          </span>
                        )}
                        {item.episode && (
                          <span className="text-[#94a3b8] text-sm">Episode {item.episode}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.time && (
                        <span className="hidden sm:flex items-center gap-1 text-[#94a3b8] text-xs bg-[#0f172a] px-2 py-1 rounded-full">
                          <Clock className="w-3 h-3" /> {item.time}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:text-[#0ea5e9] transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
