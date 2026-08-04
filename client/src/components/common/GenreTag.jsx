const genreColors = {
  Action: 'bg-red-500/15 text-red-400',
  Adventure: 'bg-emerald-500/15 text-emerald-400',
  Comedy: 'bg-yellow-500/15 text-yellow-400',
  Drama: 'bg-purple-500/15 text-purple-400',
  Fantasy: 'bg-blue-500/15 text-blue-400',
  Horror: 'bg-rose-500/15 text-rose-400',
  Mystery: 'bg-indigo-500/15 text-indigo-400',
  Romance: 'bg-pink-500/15 text-pink-400',
  'Sci-Fi': 'bg-cyan-500/15 text-cyan-400',
  SliceofLife: 'bg-lime-500/15 text-lime-400',
  Sports: 'bg-orange-500/15 text-orange-400',
  Supernatural: 'bg-violet-500/15 text-violet-400',
  Thriller: 'bg-amber-500/15 text-amber-400',
};

// Returns Tailwind color classes for a genre name.
function getColor(name) {
  return genreColors[name] || 'bg-primary/15 text-primary';
}

// Renders a genre pill; clickable when an onClick handler is provided.
export default function GenreTag({ name, onClick }) {
  const classes = getColor(name);

  if (onClick) {
    return (
      <button
        onClick={() => onClick(name)}
        className={`badge px-2.5 py-1 text-xs font-medium rounded-full transition-all hover:brightness-110 ${classes}`}
      >
        {name}
      </button>
    );
  }

  return (
    <span className={`badge px-2.5 py-1 text-xs font-medium rounded-full ${classes}`}>
      {name}
    </span>
  );
}
