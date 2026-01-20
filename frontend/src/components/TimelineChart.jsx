/**
 * Timeline Chart Component
 * Bar chart showing AI prompts over time with anomaly detection
 */

import React from 'react';
import './TimelineChart.css';

const TimelineChart = ({ timeline }) => {
  const { segments = [], anomalies = [], avgPromptsPerSegment = 0 } = timeline;

  if (!segments || segments.length === 0) {
    return (
      <div className="timeline-chart-empty">
        <p>Không có dữ liệu timeline</p>
      </div>
    );
  }

  // Support both 'count' (backend) and 'promptCount' (legacy)
  const getCount = item => item.count || item.promptCount || 0;

  const maxPrompts = Math.max(...segments.map(getCount), 1);

  const formatTime = dateString => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const isAnomaly = (segment, index) => {
    return anomalies.some(a => {
      if (a.segmentIndex !== undefined) return a.segmentIndex === index;
      // Fallback: compare start times
      return new Date(a.startTime).getTime() === new Date(segment.startTime).getTime();
    });
  };

  return (
    <div className="timeline-chart">
      <div className="chart-header">
        <h3>Timeline Sử Dụng AI</h3>
        <div className="chart-stats">
          <span>Trung bình: {avgPromptsPerSegment.toFixed(1)} prompts/30min</span>
          <span className="anomaly-count">🚨 {anomalies.length} bất thường</span>
        </div>
      </div>

      <div className="chart-container">
        {segments.map((segment, index) => {
          const count = getCount(segment);
          const barHeight = (count / maxPrompts) * 100;
          const hasAnomaly = isAnomaly(segment, index);

          return (
            <div key={index} className="chart-bar-container">
              <div
                className={`chart-bar ${hasAnomaly ? 'anomaly' : ''}`}
                style={{ height: `${barHeight}%` }}
                title={`${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}: ${count} prompts`}
              >
                {hasAnomaly && <span className="anomaly-icon">🚨</span>}
                <span className="bar-value">{count}</span>
              </div>
              <div className="chart-label">
                <span className="time-label">{formatTime(segment.startTime)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Anomaly explanations */}
      {anomalies.length > 0 && (
        <div className="anomaly-explanations">
          <h4>⚠️ Các Điểm Bất Thường:</h4>
          <ul>
            {anomalies.map((anomaly, idx) => {
              const count = getCount(anomaly);
              // Try to find segment by index or time
              const segment =
                anomaly.segmentIndex !== undefined
                  ? segments[anomaly.segmentIndex]
                  : segments.find(
                      s => new Date(s.startTime).getTime() === new Date(anomaly.startTime).getTime()
                    );

              return (
                <li key={idx}>
                  <strong>{segment ? formatTime(segment.startTime) : 'N/A'}</strong>:{' '}
                  {count} prompts (cao gấp{' '}
                  {(count / (avgPromptsPerSegment || 1)).toFixed(1)}x trung bình)
                </li>
              );
            })}
          </ul>
          <p className="anomaly-note">
            💡 Các đợt sử dụng AI tăng đột ngột có thể cho thấy sinh viên gặp khó khăn hoặc phụ
            thuộc quá nhiều vào AI.
          </p>
        </div>
      )}
    </div>
  );
};

export default TimelineChart;
