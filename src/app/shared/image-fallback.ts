// Shared fallback used on every product <img>. If the real image file is
// missing (e.g. images/titan1.jpg not present in public/images), this swaps
// in a simple inline watch icon instead of showing a broken image icon.
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#f0f0f0"/>
      <circle cx="50" cy="50" r="26" fill="none" stroke="#bdbdbd" stroke-width="3"/>
      <line x1="50" y1="50" x2="50" y2="34" stroke="#bdbdbd" stroke-width="3" stroke-linecap="round"/>
      <line x1="50" y1="50" x2="60" y2="55" stroke="#bdbdbd" stroke-width="3" stroke-linecap="round"/>
      <rect x="46" y="18" width="8" height="8" fill="#bdbdbd"/>
      <rect x="46" y="74" width="8" height="8" fill="#bdbdbd"/>
    </svg>
  `);

export function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.onerror = null;
  img.src = PLACEHOLDER;
}
