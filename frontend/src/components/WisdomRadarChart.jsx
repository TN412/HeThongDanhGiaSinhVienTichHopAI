/**
 * WISDOM Radar Chart Component
 * 3-axis radar chart showing Inquiry, Disruptive Thinking, and Mindfulness scores
 */

import React from 'react';
import './WisdomRadarChart.css';

const WisdomRadarChart = ({ wisdomScore, size = 300 }) => {
  const { inquiry, disruptiveThinking, mindfulness, overall } = wisdomScore;

  // Normalize scores to 0-10 scale
  const scores = {
    inquiry: Math.max(0, Math.min(10, inquiry)),
    disruptive: Math.max(0, Math.min(10, disruptiveThinking)),
    mindfulness: Math.max(0, Math.min(10, mindfulness)),
  };

  // Calculate polygon points for a 3-axis radar chart
  const center = size / 2;
  const maxRadius = (size / 2) * 0.7;

  // Angles for 3 axes (120 degrees apart, starting from top)
  const angles = [
    -90, // Top (Inquiry)
    30, // Bottom Right (Disruptive)
    150, // Bottom Left (Mindfulness)
  ];

  // Calculate points
  const getPoint = (angle, value) => {
    const radians = (angle * Math.PI) / 180;
    const radius = (value / 10) * maxRadius;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians),
    };
  };

  const dataPoints = [
    getPoint(angles[0], scores.inquiry),
    getPoint(angles[1], scores.disruptive),
    getPoint(angles[2], scores.mindfulness),
  ];

  const axisEndPoints = angles.map(angle => getPoint(angle, 10));

  // Create polygon path
  const polygonPath =
    dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Background circles (reference levels)
  const backgroundCircles = [2, 4, 6, 8, 10];

  const getColor = score => {
    if (score >= 8) return '#10b981'; // green
    if (score >= 6) return '#3b82f6'; // blue
    if (score >= 4) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div className="wisdom-radar-chart">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background reference circles */}
        {backgroundCircles.map(level => {
          const radius = (level / 10) * maxRadius;
          return (
            <circle
              key={level}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
              opacity="0.5"
            />
          );
        })}

        {/* Axis lines */}
        {axisEndPoints.map((point, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="#d1d5db"
            strokeWidth="2"
          />
        ))}

        {/* Data polygon */}
        <path
          d={polygonPath}
          fill={getColor(overall)}
          fillOpacity="0.3"
          stroke={getColor(overall)}
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {dataPoints.map((point, i) => (
          <circle key={i} cx={point.x} cy={point.y} r="6" fill={getColor(overall)} />
        ))}

        {/* Axis labels */}
        <text
          x={center}
          y={center - maxRadius - 20}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="#1f2937"
        >
          📚 Inquiry ({scores.inquiry.toFixed(1)})
        </text>
        <text
          x={center + maxRadius * Math.cos((30 * Math.PI) / 180) + 40}
          y={center + maxRadius * Math.sin((30 * Math.PI) / 180) + 10}
          textAnchor="start"
          fontSize="14"
          fontWeight="600"
          fill="#1f2937"
        >
          💡 Disruptive ({scores.disruptive.toFixed(1)})
        </text>
        <text
          x={center + maxRadius * Math.cos((150 * Math.PI) / 180) - 40}
          y={center + maxRadius * Math.sin((150 * Math.PI) / 180) + 10}
          textAnchor="end"
          fontSize="14"
          fontWeight="600"
          fill="#1f2937"
        >
          🧘 Mindfulness ({scores.mindfulness.toFixed(1)})
        </text>

        {/* Overall score in center */}
        <circle cx={center} cy={center} r="30" fill="white" opacity="0.9" />
        <text
          x={center}
          y={center - 5}
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill={getColor(overall)}
        >
          {overall.toFixed(1)}
        </text>
        <text x={center} y={center + 12} textAnchor="middle" fontSize="12" fill="#6b7280">
          Overall
        </text>
      </svg>

      {/* Legend */}
      <div className="wisdom-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#10b981' }}></span>
          <span>Xuất Sắc (≥8)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></span>
          <span>Tốt (6-8)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></span>
          <span>Trung Bình (4-6)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span>
          <span>Cần Cải Thiện (&lt;4)</span>
        </div>
      </div>
    </div>
  );
};

export default WisdomRadarChart;
