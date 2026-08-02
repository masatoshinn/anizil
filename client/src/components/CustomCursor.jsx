import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const arrowRef = useRef(null);
  const glowRef = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [label, setLabel] = useState('');

  useEffect(() => {
    // Only on devices with a real hover pointer (mouse/trackpad).
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    setEnabled(true);
    document.documentElement.classList.add('custom-cursor-active');

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let gx = mx;
    let gy = my;
    let raf;

    // The arrow follows the mouse 1:1 (like the real OS cursor) so it feels
    // precise. Only the soft glow trails behind it.
    const move = (e) => {
      mx = e.clientX;
      my = e.clientY;
      const target = e.target && e.target.closest
        ? e.target.closest('a,button,select,textarea,input,[role="button"],[data-cursor-label]')
        : null;
      setActive(!!target);
      setLabel(target?.dataset?.cursorLabel || '');
      if (arrowRef.current) {
        arrowRef.current.style.transform = `translate(${mx}px, ${my}px) translate(-5px, -3px)`;
      }
    };

    const loop = () => {
      gx += (mx - gx) * 0.12;
      gy += (my - gy) * 0.12;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(loop);
    };

    const down = () => setPressed(true);
    const up = () => setPressed(false);

    window.addEventListener('mousemove', move);
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    raf = requestAnimationFrame(loop);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Soft trailing glow, eases behind the arrow. */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className={`custom-cursor-glow ${active ? 'is-active' : ''} ${pressed ? 'is-pressed' : ''}`}
      />
      {/* The arrow itself — follows the exact pointer position (PC-like). */}
      <div
        ref={arrowRef}
        aria-hidden="true"
        className={`custom-cursor ${active ? 'is-active' : ''} ${pressed ? 'is-pressed' : ''} ${label ? 'has-label' : ''}`}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" className="cc-arrow-svg">
          <defs>
            <linearGradient id="anizil-cursor-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--primary)" />
              <stop offset="1" stopColor="var(--primary-hover)" />
            </linearGradient>
          </defs>
          <path
            d="M5 3 L21.5 17 L14.5 15.5 L20.5 24 L17 24.5 L11 16 L5 20 Z"
            fill="url(#anizil-cursor-grad)"
            stroke="white"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
        {label && <span className="cc-label">{label}</span>}
      </div>
    </>
  );
}