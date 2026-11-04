export function Mascot({ size = 120, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      className={className}
      role="img"
      aria-label="小满记词吉祥物"
    >
      <defs>
        <linearGradient id="mascot-body" x1="20" y1="18" x2="140" y2="142" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF4F8" />
          <stop offset="1" stopColor="#FFD7E4" />
        </linearGradient>
        <linearGradient id="mascot-book" x1="42" y1="96" x2="118" y2="138" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7CC7FF" />
          <stop offset="1" stopColor="#B79CFF" />
        </linearGradient>
        <radialGradient id="mascot-blush" cx="0" cy="0" r="1" gradientTransform="translate(0 0) rotate(90) scale(1)">
          <stop stopColor="#FF9FBD" stopOpacity="0.7" />
          <stop offset="1" stopColor="#FF9FBD" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="143" rx="43" ry="8" fill="#E7D7EE" opacity="0.55" />
      <path
        d="M80 22c30 0 52 20 52 50 0 25-12 42-27 51-7 4-16 6-25 6s-18-2-25-6c-15-9-27-26-27-51 0-30 22-50 52-50Z"
        fill="url(#mascot-body)"
        stroke="#F4BFD2"
        strokeWidth="2"
      />
      <path d="M57 24c-4-10 5-18 13-12 5-9 17-6 17 3 7-5 15 3 11 12" fill="#FFE5EE" stroke="#F4BFD2" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="62" cy="73" r="5.5" fill="#4A425C" />
      <circle cx="99" cy="73" r="5.5" fill="#4A425C" />
      <circle cx="63.8" cy="71.2" r="1.8" fill="white" />
      <circle cx="100.8" cy="71.2" r="1.8" fill="white" />
      <ellipse cx="50" cy="86" rx="10" ry="6" fill="url(#mascot-blush)" />
      <ellipse cx="111" cy="86" rx="10" ry="6" fill="url(#mascot-blush)" />
      <path d="M72 88c2.8 3.6 5.5 5.3 8 5.3s5.2-1.7 8-5.3" fill="none" stroke="#4A425C" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M48 108c10-6 21-8 32-8s22 2 32 8l-8 23c-8-3-16-5-24-5s-16 2-24 5l-8-23Z" fill="url(#mascot-book)" stroke="#6DAEEA" strokeWidth="2" />
      <path d="M80 101v26" stroke="#FFF8FD" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M56 111c6-2 12-2.5 18-2" stroke="#FFF8FD" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <path d="M104 111c-6-2-12-2.5-18-2" stroke="#FFF8FD" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <path d="M123 44l4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#FFD86B" />
      <path d="M36 54l2.5 5.5 5.5 2.5-5.5 2.5L36 70l-2.5-5.5L28 62l5.5-2.5L36 54Z" fill="#8FE3C0" />
    </svg>
  );
}
