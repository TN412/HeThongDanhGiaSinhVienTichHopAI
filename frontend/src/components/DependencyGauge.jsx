/**
 * Dependency Gauge Component
 * Circular gauge showing dependency score (0-100)
 * with color-coded risk levels
 */

import React from 'react';
import './DependencyGauge.css';

const DependencyGauge = ({ score, level, size = 200 }) => {
  // Higher score = lower dependency = better (inverted logic)
  const normalizedScore = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 70; // radius = 70
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  // Handle level as object or string
  const levelText = typeof level === 'object' ? level.level : level;
  const levelColor = typeof level === 'object' ? level.color : null;

  const getLevelColor = riskLevel => {
    const colors = {
      Low: '#10b981', // green
      Medium: '#f59e0b', // amber
      High: '#ef4444', // red
      Critical: '#dc2626', // red-600
    };
    return colors[riskLevel] || colors.Low;
  };

  const color = levelColor || getLevelColor(levelText);

  return (
    <div className="dependency-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 200 200">
        {/* Background circle */}
        <circle cx="100" cy="100" r="70" fill="none" stroke="#e5e7eb" strokeWidth="20" />

        {/* Progress circle */}
        <circle
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke={color}
          strokeWidth="20"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          className="gauge-progress"
        />

        {/* Center text */}
        <text x="100" y="90" textAnchor="middle" fontSize="36" fontWeight="bold" fill="#1f2937">
          {Math.round(normalizedScore)}
        </text>
        <text x="100" y="115" textAnchor="middle" fontSize="14" fill="#6b7280">
          Độc Lập
        </text>
        <text x="100" y="135" textAnchor="middle" fontSize="12" fontWeight="600" fill={color}>
          {levelText || 'N/A'}
        </text>
      </svg>
    </div>
  );
};

export default DependencyGauge;
