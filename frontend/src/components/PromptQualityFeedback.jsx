import React from 'react';
import './PromptQualityFeedback.css';

/**
 * PromptQualityFeedback Component
 *
 * Displays real-time feedback about prompt quality as students type
 * Helps students improve their AI prompting skills
 *
 * Props:
 * - quality: { score: number, level: string, feedback: string[] }
 * - show: boolean - whether to show the feedback
 * - inline: boolean - whether to display inline or as a panel
 */
function PromptQualityFeedback({ quality, show = true, inline = false }) {
  if (!show || !quality) return null;

  const { score, level, feedback } = quality;

  // Get color based on score
  const getScoreColor = () => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#3b82f6'; // blue
    if (score >= 40) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  // Get icon based on level
  const getLevelIcon = () => {
    switch (level) {
      case 'excellent':
        return '🌟';
      case 'good':
        return '✅';
      case 'fair':
        return '⚠️';
      case 'poor':
        return '❌';
      default:
        return '💡';
    }
  };

  // Get level label in Vietnamese
  const getLevelLabel = () => {
    switch (level) {
      case 'excellent':
        return 'Xuất sắc';
      case 'good':
        return 'Tốt';
      case 'fair':
        return 'Khá';
      case 'poor':
        return 'Cần cải thiện';
      default:
        return 'Chưa đánh giá';
    }
  };

  if (inline) {
    // Inline mode: compact bar under input field
    return (
      <div className="prompt-quality-inline">
        <div className="quality-bar-container">
          <div
            className="quality-bar-fill"
            style={{
              width: `${score}%`,
              backgroundColor: getScoreColor(),
            }}
          />
        </div>
        <div className="quality-inline-text">
          <span className="quality-icon">{getLevelIcon()}</span>
          <span className="quality-label">{getLevelLabel()}</span>
          <span className="quality-score">{score}/100</span>
        </div>
      </div>
    );
  }

  // Panel mode: detailed feedback card
  return (
    <div className={`prompt-quality-panel ${level}`}>
      <div className="quality-header">
        <div className="quality-title">
          <span className="quality-icon-large">{getLevelIcon()}</span>
          <div>
            <h4>Chất Lượng Prompt</h4>
            <span className="quality-level">{getLevelLabel()}</span>
          </div>
        </div>
        <div className="quality-score-circle" style={{ borderColor: getScoreColor() }}>
          <span style={{ color: getScoreColor() }}>{score}</span>
          <small>/100</small>
        </div>
      </div>

      {feedback && feedback.length > 0 && (
        <div className="quality-feedback">
          <h5>💡 Gợi Ý Cải Thiện:</h5>
          <ul>
            {feedback.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="quality-tips">
        <h5>📚 Mẹo Viết Prompt Tốt:</h5>
        <ul>
          <li>
            <strong>Cụ thể:</strong> Mô tả rõ vấn đề bạn gặp phải
          </li>
          <li>
            <strong>Ngữ cảnh:</strong> Đề cập đến câu hỏi hoặc khái niệm liên quan
          </li>
          <li>
            <strong>Hỏi mở:</strong> Dùng "Làm thế nào...?" thay vì "Có phải...?"
          </li>
          <li>
            <strong>Thử trước:</strong> Nêu những gì bạn đã nghĩ/thử
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * PromptQualityIndicator Component
 *
 * Compact indicator showing just the score with tooltip
 * Useful for displaying in message history
 */
export function PromptQualityIndicator({ quality }) {
  if (!quality) return null;

  const { score, level } = quality;

  const getScoreColor = () => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getLevelIcon = () => {
    switch (level) {
      case 'excellent':
        return '🌟';
      case 'good':
        return '✅';
      case 'fair':
        return '⚠️';
      case 'poor':
        return '❌';
      default:
        return '💡';
    }
  };

  return (
    <div className="prompt-quality-indicator" title={`Chất lượng prompt: ${score}/100`}>
      <span className="indicator-icon">{getLevelIcon()}</span>
      <span className="indicator-score" style={{ color: getScoreColor() }}>
        {score}
      </span>
    </div>
  );
}

/**
 * PromptQualityHistory Component
 *
 * Shows trend of prompt quality over time
 * Useful for analytics and student progress tracking
 */
export function PromptQualityHistory({ logs }) {
  if (!logs || logs.length === 0) return null;

  const avgScore = logs.reduce((sum, log) => sum + (log.qualityScore || 0), 0) / logs.length;
  const trend = logs.length >= 2 ? logs[logs.length - 1].qualityScore - logs[0].qualityScore : 0;

  const getScoreColor = score => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="prompt-quality-history">
      <h4>📈 Tiến Độ Chất Lượng Prompt</h4>
      <div className="history-stats">
        <div className="stat">
          <span className="stat-label">Điểm TB:</span>
          <span className="stat-value" style={{ color: getScoreColor(avgScore) }}>
            {Math.round(avgScore)}/100
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Xu hướng:</span>
          <span className={`stat-value ${trend >= 0 ? 'positive' : 'negative'}`}>
            {trend >= 0 ? '📈' : '📉'} {Math.abs(Math.round(trend))} điểm
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Số prompt:</span>
          <span className="stat-value">{logs.length}</span>
        </div>
      </div>

      <div className="history-chart">
        {logs.map((log, index) => (
          <div
            key={index}
            className="history-bar"
            style={{
              height: `${log.qualityScore || 0}%`,
              backgroundColor: getScoreColor(log.qualityScore || 0),
            }}
            title={`Prompt ${index + 1}: ${log.qualityScore || 0}/100`}
          />
        ))}
      </div>

      {avgScore < 60 && (
        <div className="history-tip">
          💡 Bạn có thể cải thiện chất lượng prompt bằng cách mô tả cụ thể hơn và cung cấp ngữ cảnh
          cho câu hỏi.
        </div>
      )}

      {trend > 20 && (
        <div className="history-encouragement">
          🎉 Tuyệt vời! Chất lượng prompt của bạn đang cải thiện đáng kể!
        </div>
      )}
    </div>
  );
}

export default PromptQualityFeedback;
