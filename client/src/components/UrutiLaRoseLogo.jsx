import React from 'react';
import TranslatedText from './TranslatedText';

const UrutiLaRoseLogo = ({ className = "h-8 w-8", showText = false }) => {
  return (
    <div className={`flex items-center ${showText ? 'space-x-2' : ''}`}>
      <svg
        className={className}
        viewBox="0 0 300 80"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          {/* Rose gradient */}
          <linearGradient id="roseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e91e63" />
            <stop offset="100%" stopColor="#c2185b" />
          </linearGradient>

          {/* Blue gradient */}
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2196f3" />
            <stop offset="100%" stopColor="#1976d2" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle cx="35" cy="40" r="30" fill="url(#blueGradient)" opacity="0.1" />

        {/* Rose icon - simplified and larger */}
        <g transform="translate(35, 40)">
          {/* Main rose petals */}
          <path d="M-12,-8 Q-16,-12 -12,-16 Q-8,-20 -4,-16 Q0,-12 -4,-8 Q-8,-4 -12,-8 Z" fill="url(#roseGradient)" />
          <path d="M-4,-8 Q0,-12 4,-8 Q8,-4 4,0 Q0,4 -4,0 Q-8,-4 -4,-8 Z" fill="url(#roseGradient)" opacity="0.9" />
          <path d="M4,-4 Q12,-8 16,-4 Q12,0 8,4 Q4,0 0,0 Q0,-2 4,-4 Z" fill="url(#roseGradient)" opacity="0.8" />

          {/* Rose center */}
          <circle cx="0" cy="-2" r="2.5" fill="#c2185b" />

          {/* Stem */}
          <rect x="-0.8" y="6" width="1.6" height="12" fill="#4caf50" />

          {/* Leaves */}
          <ellipse cx="-5" cy="12" rx="3" ry="1.5" fill="#4caf50" transform="rotate(-25)" />
          <ellipse cx="5" cy="14" rx="3" ry="1.5" fill="#4caf50" transform="rotate(25)" />
        </g>

        {/* Company name - larger and more visible */}
        <g>
          {/* "Likaperfumes" */}
          <text x="80" y="40" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#2c3e50">
            LikaBoutiques
          </text>
        </g>

        {/* Simple tech accent */}
        <g opacity="0.4">
          <line x1="220" y1="25" x2="240" y2="25" stroke="url(#blueGradient)" strokeWidth="2" />
          <circle cx="240" cy="25" r="3" fill="url(#blueGradient)" />
          <line x1="220" y1="55" x2="240" y2="55" stroke="url(#blueGradient)" strokeWidth="2" />
          <circle cx="240" cy="55" r="3" fill="url(#blueGradient)" />
        </g>
      </svg>
    </div>
  );
};

export default UrutiLaRoseLogo; 
