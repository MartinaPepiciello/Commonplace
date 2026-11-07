// Generates the app icon SVG: rainbow background with a white closed book,
// whose bookmark and page gap are cut out so the rainbow shows through.
// `rounded` = favicon with rounded corners; otherwise full-bleed (phones round it themselves).
export function iconSVG({ rounded = false, scale = 1 } = {}) {
  const r = rounded ? 116 : 0;
  // scale < 1 shrinks the artwork (for maskable icons that need a safe zone)
  const t = `translate(${256 - 256 * scale} ${256 - 256 * scale}) scale(${scale})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="rb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff3d7f"/>
      <stop offset="0.07" stop-color="#ff5470"/>
      <stop offset="0.24" stop-color="#ff9a4d"/>
      <stop offset="0.4" stop-color="#ffd84d"/>
      <stop offset="0.56" stop-color="#52d98a"/>
      <stop offset="0.72" stop-color="#33c3e6"/>
      <stop offset="0.86" stop-color="#5b7cff"/>
      <stop offset="1" stop-color="#a45cff"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.22" r="0.75">
      <stop offset="0" stop-color="#fff" stop-opacity="0.3"/>
      <stop offset="0.6" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
      <rect width="512" height="512" fill="#fff"/>
      <!-- gap between cover and pages, open on the right -->
      <rect x="196" y="334" width="220" height="20" rx="10" fill="#000"/>
      <!-- bookmark ribbon, open at the top edge -->
      <path d="M262 90 H326 V242 L294 214 L262 242 Z" fill="#000"/>
    </mask>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#2a0a4a" flood-opacity="0.28"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="${r}" fill="url(#rb)"/>
  <rect width="512" height="512" rx="${r}" fill="url(#glow)"/>
  <g transform="${t}" filter="url(#sh)">
    <g mask="url(#cut)">
      <!-- cover + pages: rounded top corners and spine side, square bottom-right -->
      <path fill="#fff" d="M182 106 H346 Q370 106 370 130 V392 Q370 406 356 406 H186 Q142 406 142 362 V146 Q142 106 182 106 Z"/>
    </g>
  </g>
</svg>`;
}
