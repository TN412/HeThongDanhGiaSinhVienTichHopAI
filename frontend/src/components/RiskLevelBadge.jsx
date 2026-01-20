/**
 * Risk Level Badge Component
 * Displays color-coded risk level indicator
 */

import React from 'react';
import './RiskLevelBadge.css';

const RiskLevelBadge = ({ level, showLabel = true, size = 'medium' }) => {
  const getRiskConfig = riskLevel => {
    const configs = {
      Low: {
        color: '#10b981', // green-500
        bgColor: '#d1fae5', // green-100
        label: 'Thấp',
        icon: '✅',
      },
      Medium: {
        color: '#f59e0b', // amber-500
        bgColor: '#fef3c7', // amber-100
        label: 'Trung Bình',
        icon: '⚠️',
      },
      High: {
        color: '#ef4444', // red-500
        bgColor: '#fee2e2', // red-100
        label: 'Cao',
        icon: '🚨',
      },
      Critical: {
        color: '#dc2626', // red-600
        bgColor: '#fecaca', // red-200
        label: 'Nghiêm Trọng',
        icon: '🔴',
      },
    };

    return configs[riskLevel] || configs.Low;
  };

  const config = getRiskConfig(level);
  const sizeClass = `badge-${size}`;

  return (
    <span
      className={`risk-level-badge ${sizeClass}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.color}`,
      }}
    >
      <span className="badge-icon">{config.icon}</span>
      {showLabel && <span className="badge-label">{config.label}</span>}
    </span>
  );
};

export default RiskLevelBadge;
