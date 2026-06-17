export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 300 196"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="w-full max-w-[280px] mx-auto"
    >
      {/* drop shadow */}
      <ellipse cx="150" cy="191" rx="108" ry="5" fill="#DDD8D1" />

      {/* LEFT PAGE */}
      <rect x="12" y="16" width="126" height="166" rx="3" fill="white" stroke="#E4DDD6" strokeWidth="1" />

      {/* RIGHT PAGE */}
      <rect x="162" y="16" width="126" height="166" rx="3" fill="white" stroke="#E4DDD6" strokeWidth="1" />

      {/* SPINE */}
      <rect x="136" y="16" width="28" height="166" rx="2" fill="#EDE8E1" />
      <line x1="150" y1="16" x2="150" y2="182" stroke="#D8D2CB" strokeWidth="0.75" />

      {/* LEFT PAGE — text lines */}
      <rect x="26" y="36" width="82" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="26" y="46" width="98" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="26" y="56" width="74" height="2.5" rx="1.25" fill="#D8D2CB" />

      {/* LEFT PAGE — HIGHLIGHT */}
      <rect x="22" y="68" width="108" height="15" rx="2.5" fill="#FFF3B0" />
      <rect x="26" y="73" width="100" height="2.5" rx="1.25" fill="#8B8680" />
      {/* underline */}
      <rect x="26" y="83" width="100" height="2" rx="1" fill="#1E3A2F" />

      {/* LEFT PAGE — text lines below */}
      <rect x="26" y="96" width="90" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="26" y="106" width="78" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="26" y="116" width="94" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="26" y="126" width="66" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="26" y="136" width="86" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="26" y="146" width="58" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="26" y="156" width="76" height="2.5" rx="1.25" fill="#D8D2CB" />

      {/* RIGHT PAGE — text lines */}
      <rect x="176" y="36" width="96" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="46" width="80" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="56" width="100" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="66" width="84" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="76" width="94" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="86" width="70" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="96" width="90" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="106" width="76" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="116" width="98" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="126" width="62" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="136" width="82" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="146" width="72" height="2.5" rx="1.25" fill="#D8D2CB" />
      <rect x="176" y="156" width="88" height="2.5" rx="1.25" fill="#D8D2CB" />

      {/* READER A — left of book, at the highlighted line level */}
      <circle cx="4" cy="76" r="10" fill="#1E3A2F" />
      <circle cx="4" cy="72" r="3.5" fill="#2D5A3D" />
      <path d="M-3 82 Q4 78 11 82" fill="#2D5A3D" />

      {/* READER B — right of book */}
      <circle cx="296" cy="76" r="10" fill="#2D5A3D" />
      <circle cx="296" cy="72" r="3.5" fill="#3A7A54" />
      <path d="M289 82 Q296 78 303 82" fill="#3A7A54" />

      {/* subtle dotted connection from reader A to highlight */}
      <path d="M14 76 H22" stroke="#1E3A2F" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
      {/* subtle dotted connection from reader B to highlight */}
      <path d="M286 76 H130" stroke="#2D5A3D" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
    </svg>
  );
}
