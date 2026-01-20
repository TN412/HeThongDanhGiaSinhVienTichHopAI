/**
 * Rubric Score Card Component
 * Displays 5-level rubric scores for Prompt Engineering, Independence, and Creativity
 */

import React from 'react';
import './RubricScoreCard.css';

const RubricScoreCard = ({ rubricScores }) => {
  const { promptEngineering = {}, independence = {}, creativity = {} } = rubricScores;

  const getLevelColor = level => {
    if (level >= 5) return '#10b981'; // green
    if (level >= 4) return '#3b82f6'; // blue
    if (level >= 3) return '#f59e0b'; // amber
    if (level >= 2) return '#ef4444'; // red
    return '#dc2626'; // red-600
  };

  const getLevelText = level => {
    const texts = {
      5: 'Xuất sắc',
      4: 'Tốt',
      3: 'Trung bình',
      2: 'Yếu',
      1: 'Rất yếu',
    };
    return texts[level] || 'Chưa đánh giá';
  };

  const renderCriterion = (title, icon, data) => {
    // Fix: Backend returns 'score' (float) and 'label', not 'level'
    const score = data.score || 0;
    const level = Math.round(score); // Round to nearest integer for 1-5 scale
    const label = data.label || getLevelText(level);
    const color = getLevelColor(level);

    // Try to generate a description from details if not provided
    let description = data.description;
    if (!description && data.details) {
      if (title.includes('Prompt')) {
        description = `Tỷ lệ prompt xuất sắc: ${data.details.excellentRate || '0%'}`;
      } else if (title.includes('Độc Lập')) {
        description = `Tỷ lệ tự hỏi (Inquiry): ${data.details.inquiryRate || '0%'}`;
      } else if (title.includes('Sáng Tạo')) {
        description = `Độ đa dạng: ${data.details.diversificationScore || '0%'}`;
      }
    }
    description = description || 'Không có dữ liệu chi tiết';

    return (
      <div className="rubric-criterion">
        <div className="criterion-header">
          <div className="criterion-title">
            <span className="criterion-icon">{icon}</span>
            <h4>{title}</h4>
          </div>
          <div className="criterion-level-badge" style={{ backgroundColor: color }}>
            {score}/5 - {label}
          </div>
        </div>

        {/* Level indicator bars */}
        <div className="level-indicator">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`level-bar ${i <= level ? 'filled' : ''}`}
              style={{
                backgroundColor: i <= level ? color : '#e5e7eb',
              }}
            ></div>
          ))}
        </div>

        <p className="criterion-description">{description}</p>
      </div>
    );
  };

  return (
    <div className="rubric-score-card">
      <h3 className="card-title">📊 Đánh Giá Rubric (3 Tiêu Chí)</h3>

      <div className="criteria-container">
        {renderCriterion('Kỹ Năng Prompt Engineering', '💬', promptEngineering)}
        {renderCriterion('Mức Độ Độc Lập', '🎯', independence)}
        {renderCriterion('Tư Duy Sáng Tạo', '🎨', creativity)}
      </div>

      <div className="rubric-legend">
        <h5>Thang điểm:</h5>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
            <span>5 - Xuất sắc</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
            <span>4 - Tốt</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
            <span>3 - Trung bình</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
            <span>2 - Yếu</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#dc2626' }}></span>
            <span>1 - Rất yếu</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RubricScoreCard;
