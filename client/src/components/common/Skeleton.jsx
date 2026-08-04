import { motion } from 'framer-motion';

const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent';

// Base shimmering placeholder box used by all skeletons.
function SkeletonBox({ className = '' }) {
  return (
    <div className={`bg-panel rounded-lg ${shimmer} ${className}`} />
  );
}

// Loading placeholder mimicking the anime card layout.
export function AnimeCardSkeleton() {
  return (
    <div className="card-anime overflow-hidden">
      <SkeletonBox className="aspect-[3/4] rounded-t-xl" />
      <div className="p-3 space-y-2">
        <SkeletonBox className="h-4 w-3/4 rounded" />
        <SkeletonBox className="h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

// Loading placeholder mimicking the episode card layout.
export function EpisodeCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface">
      <SkeletonBox className="w-24 h-14 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBox className="h-4 w-1/3 rounded" />
        <SkeletonBox className="h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

// Loading placeholder for the public user profile section.
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <SkeletonBox className="w-24 h-24 rounded-full" />
      <SkeletonBox className="h-5 w-32 rounded" />
      <SkeletonBox className="h-3 w-48 rounded" />
      <div className="flex gap-4 mt-2">
        <SkeletonBox className="h-8 w-20 rounded-lg" />
        <SkeletonBox className="h-8 w-20 rounded-lg" />
        <SkeletonBox className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

// Loading placeholder rendering a given number of text lines.
export function TextSkeleton({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          className={`h-3.5 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

// Loading placeholder for a title/heading bar.
export function TitleSkeleton({ className = '' }) {
  return (
    <SkeletonBox className={`h-6 w-48 rounded ${className}`} />
  );
}

// Dispatcher rendering the appropriate skeleton by type.
export default function Skeleton({ type = 'text', ...props }) {
  switch (type) {
    case 'anime-card':
      return <AnimeCardSkeleton {...props} />;
    case 'episode-card':
      return <EpisodeCardSkeleton {...props} />;
    case 'profile':
      return <ProfileSkeleton {...props} />;
    case 'title':
      return <TitleSkeleton {...props} />;
    case 'text':
    default:
      return <TextSkeleton {...props} />;
  }
}
