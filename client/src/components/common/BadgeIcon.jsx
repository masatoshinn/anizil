// Renders a badge icon. If `icon` is a FontAwesome class name (e.g.
// "fa-solid fa-crown", "fa-crown", "fas fa-user"), it renders the FA icon;
// otherwise it falls back to showing the raw text (legacy emoji icons).
const FA_STYLE = /(fa-solid|fa-regular|fa-brands|fas|far|fab)\b/;

// Detects whether an icon string is a FontAwesome class name.
function isFontAwesome(icon) {
  return FA_STYLE.test(icon) || /^fa-/.test(String(icon).trim());
}

// Prepends a default "fa-solid" style prefix when missing.
function normalizeFa(icon) {
  const t = String(icon).trim();
  return FA_STYLE.test(t) ? t : `fa-solid ${t}`;
}

// Renders a FontAwesome icon, or raw text fallback for legacy icons.
export default function BadgeIcon({ icon, className = '' }) {
  if (!icon) return null;
  if (isFontAwesome(icon)) {
    return <i className={`${normalizeFa(icon)} ${className}`.trim()} aria-hidden="true" />;
  }
  return <span className={className}>{icon}</span>;
}