import React from 'react';

export const CyberGlobe: React.FC = () => {
  return (
    <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] lg:w-[480px] lg:h-[480px] pointer-events-none select-none opacity-85">
      {/* Ambient Radial Blue Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/25 via-cyan-500/15 to-indigo-600/10 rounded-full blur-3xl" />

      {/* Futuristic SVG Cyber Sphere */}
      <svg
        className="w-full h-full"
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="globeAtmosphere" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#0f172a" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="nodeLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
          </linearGradient>

          <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sphere Atmosphere Fill */}
        <circle cx="250" cy="250" r="190" fill="url(#globeAtmosphere)" />

        {/* Outer Halo Rings */}
        <circle
          cx="250"
          cy="250"
          r="190"
          stroke="#0284c7"
          strokeWidth="1.2"
          strokeOpacity="0.3"
          strokeDasharray="4 6"
        />
        <circle
          cx="250"
          cy="250"
          r="198"
          stroke="#38bdf8"
          strokeWidth="0.8"
          strokeOpacity="0.2"
        />

        {/* Latitude Orbit Ellipses */}
        <ellipse
          cx="250"
          cy="250"
          rx="190"
          ry="190"
          stroke="#38bdf8"
          strokeWidth="0.8"
          strokeOpacity="0.25"
        />
        <ellipse
          cx="250"
          cy="250"
          rx="185"
          ry="130"
          stroke="#60a5fa"
          strokeWidth="0.9"
          strokeOpacity="0.2"
        />
        <ellipse
          cx="250"
          cy="250"
          rx="160"
          ry="70"
          stroke="#38bdf8"
          strokeWidth="0.8"
          strokeOpacity="0.3"
        />
        <ellipse
          cx="250"
          cy="250"
          rx="190"
          ry="30"
          stroke="#38bdf8"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="6 4"
        />
        <ellipse
          cx="250"
          cy="180"
          rx="170"
          ry="25"
          stroke="#38bdf8"
          strokeWidth="0.7"
          strokeOpacity="0.2"
        />
        <ellipse
          cx="250"
          cy="320"
          rx="170"
          ry="25"
          stroke="#38bdf8"
          strokeWidth="0.7"
          strokeOpacity="0.2"
        />

        {/* Longitudinal Curvatures */}
        <ellipse
          cx="250"
          cy="250"
          rx="50"
          ry="190"
          stroke="#38bdf8"
          strokeWidth="0.8"
          strokeOpacity="0.25"
        />
        <ellipse
          cx="250"
          cy="250"
          rx="110"
          ry="190"
          stroke="#38bdf8"
          strokeWidth="0.7"
          strokeOpacity="0.2"
        />
        <ellipse
          cx="250"
          cy="250"
          rx="160"
          ry="190"
          stroke="#60a5fa"
          strokeWidth="0.6"
          strokeOpacity="0.15"
        />

        {/* Constellation Lines Connecting Nodes */}
        <g stroke="url(#nodeLineGrad)" strokeWidth="1">
          <line x1="130" y1="180" x2="190" y2="150" />
          <line x1="190" y1="150" x2="260" y2="130" />
          <line x1="260" y1="130" x2="310" y2="170" />
          <line x1="130" y1="180" x2="160" y2="240" />
          <line x1="160" y1="240" x2="230" y2="220" />
          <line x1="230" y1="220" x2="290" y2="210" />
          <line x1="290" y1="210" x2="350" y2="230" />
          <line x1="160" y1="240" x2="180" y2="310" />
          <line x1="180" y1="310" x2="250" y2="320" />
          <line x1="250" y1="320" x2="320" y2="290" />
          <line x1="230" y1="220" x2="250" y2="320" />
          <line x1="290" y1="210" x2="320" y2="290" />
          <line x1="190" y1="150" x2="230" y2="220" />
          <line x1="260" y1="130" x2="290" y2="210" />
          <line x1="100" y1="260" x2="160" y2="240" />
          <line x1="250" y1="90" x2="260" y2="130" />
          <line x1="360" y1="160" x2="310" y2="170" />
          <line x1="350" y1="230" x2="390" y2="270" />
          <line x1="320" y1="290" x2="350" y2="360" />
          <line x1="180" y1="310" x2="150" y2="370" />
        </g>

        {/* Constellation Glow Nodes */}
        <g filter="url(#glowEffect)">
          {/* Main Network Vertices */}
          <circle cx="130" cy="180" r="3.5" fill="#38bdf8" />
          <circle cx="190" cy="150" r="4.5" fill="#60a5fa" />
          <circle cx="260" cy="130" r="3.5" fill="#38bdf8" />
          <circle cx="310" cy="170" r="4" fill="#93c5fd" />
          <circle cx="160" cy="240" r="5" fill="#38bdf8" />
          <circle cx="230" cy="220" r="4" fill="#60a5fa" />
          <circle cx="290" cy="210" r="5" fill="#38bdf8" />
          <circle cx="350" cy="230" r="4" fill="#93c5fd" />
          <circle cx="180" cy="310" r="4" fill="#60a5fa" />
          <circle cx="250" cy="320" r="4.5" fill="#38bdf8" />
          <circle cx="320" cy="290" r="3.5" fill="#60a5fa" />
          <circle cx="100" cy="260" r="3" fill="#38bdf8" />
          <circle cx="250" cy="90" r="3" fill="#93c5fd" />
          <circle cx="360" cy="160" r="3" fill="#38bdf8" />
          <circle cx="390" cy="270" r="3" fill="#93c5fd" />
          <circle cx="350" cy="360" r="3" fill="#38bdf8" />
          <circle cx="150" cy="370" r="3" fill="#60a5fa" />

          {/* Core Radiant Pulsing Center Point */}
          <circle cx="230" cy="220" r="2" fill="#ffffff" />
          <circle cx="160" cy="240" r="2" fill="#ffffff" />
          <circle cx="290" cy="210" r="2" fill="#ffffff" />
        </g>

        {/* Floating Data Micro-Particles */}
        <g fill="#38bdf8" opacity="0.6">
          <circle cx="110" cy="140" r="1.5" />
          <circle cx="140" cy="110" r="1" />
          <circle cx="210" cy="95" r="1.5" />
          <circle cx="290" cy="95" r="1" />
          <circle cx="370" cy="120" r="1.5" />
          <circle cx="410" cy="210" r="1" />
          <circle cx="380" cy="330" r="1.5" />
          <circle cx="280" cy="400" r="1.5" />
          <circle cx="210" cy="390" r="1" />
          <circle cx="120" cy="330" r="1.5" />
          <circle cx="80" cy="210" r="1" />
        </g>
      </svg>
    </div>
  );
};
