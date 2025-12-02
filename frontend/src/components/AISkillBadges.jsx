import PropTypes from 'prop-types';
import './AISkillBadges.css';

/**
 * AISkillBadges Component
 * Displays AI Skill Score metrics as badges
 *
 * Props:
 * - aiInteractionSummary: { totalPrompts, uniquePromptRate, independenceLevel, promptQualityBand, avgPromptLength }
 * - aiSkillScore: number (0-100)
 * - aiSkillScoreWeight: number (0-1, default 0.3)
 */
function AISkillBadges({ aiInteractionSummary, aiSkillScore, aiSkillScoreWeight = 0.3 }) {
  if (!aiInteractionSummary) return null;

  const {
    totalPrompts = 0,
    uniquePromptRate = 0,
    independenceLevel = 0,
    promptQualityBand = 'N/A',
    avgPromptLength = 0,
  } = aiInteractionSummary;

  // Color coding for badges
  const getQualityColor = band => {
    switch (band) {
      case 'high':
        return 'green';
      case 'medium':
        return 'orange';
      case 'low':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getIndependenceColor = level => {
    if (level >= 0.7) return 'green';
    if (level >= 0.4) return 'orange';
    return 'red';
  };

  const getIterationColor = rate => {
    if (rate >= 0.7) return 'green';
    if (rate >= 0.4) return 'orange';
    return 'red';
  };

  return (
    <div className="ai-skill-badges">
      <div className="badges-header">
        <h3>
          📊 AI Skill Score: <span className="score-value">{aiSkillScore.toFixed(1)}</span>/10
        </h3>
        {aiSkillScoreWeight === 0 && (
          <div className="demo-note">ℹ️ AI Skill Score không tính vào điểm cuối (demo mode)</div>
        )}
      </div>

      <div className="badges-container">
        {/* Prompt Quality Badge */}
        <div className={`badge badge-${getQualityColor(promptQualityBand)}`}>
          <div className="badge-icon">💬</div>
          <div className="badge-content">
            <div className="badge-label">Chất lượng câu hỏi</div>
            <div className="badge-value">
              {promptQualityBand === 'high' && '🟢 Tốt'}
              {promptQualityBand === 'medium' && '🟠 Trung bình'}
              {promptQualityBand === 'low' && '🔴 Cần cải thiện'}
            </div>
            <div className="badge-detail">Trung bình: {avgPromptLength} ký tự</div>
          </div>
        </div>

        {/* Independence Badge */}
        <div className={`badge badge-${getIndependenceColor(independenceLevel)}`}>
          <div className="badge-icon">🎯</div>
          <div className="badge-content">
            <div className="badge-label">Độc lập</div>
            <div className="badge-value">{Math.round(independenceLevel * 100)}%</div>
            <div className="badge-detail">
              {independenceLevel >= 0.7 && 'Tự làm nhiều'}
              {independenceLevel >= 0.4 && independenceLevel < 0.7 && 'Phụ thuộc vừa'}
              {independenceLevel < 0.4 && 'Phụ thuộc AI nhiều'}
            </div>
          </div>
        </div>

        {/* Iteration Efficiency Badge */}
        <div className={`badge badge-${getIterationColor(uniquePromptRate)}`}>
          <div className="badge-icon">🔄</div>
          <div className="badge-content">
            <div className="badge-label">Hiệu quả hỏi</div>
            <div className="badge-value">{Math.round(uniquePromptRate * 100)}%</div>
            <div className="badge-detail">
              {uniquePromptRate >= 0.7 && 'Câu hỏi đa dạng'}
              {uniquePromptRate >= 0.4 && uniquePromptRate < 0.7 && 'Có lặp lại'}
              {uniquePromptRate < 0.4 && 'Lặp lại nhiều'}
            </div>
          </div>
        </div>

        {/* Total Prompts Info */}
        <div className="badge badge-info">
          <div className="badge-icon">📊</div>
          <div className="badge-content">
            <div className="badge-label">Tổng số lượt hỏi</div>
            <div className="badge-value">{totalPrompts}</div>
            <div className="badge-detail">
              {totalPrompts === 0 && 'Không dùng AI'}
              {totalPrompts > 0 && totalPrompts <= 5 && 'Sử dụng ít'}
              {totalPrompts > 5 && totalPrompts <= 15 && 'Sử dụng vừa'}
              {totalPrompts > 15 && 'Sử dụng nhiều'}
            </div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="badges-footer">
        <details className="score-breakdown">
          <summary>Điểm AI Skill được tính như thế nào?</summary>
          <ul>
            <li>
              <strong>40%</strong> - Chất lượng câu hỏi (độ dài hợp lý, có dấu ?, có context)
            </li>
            <li>
              <strong>30%</strong> - Độc lập (số lượt hỏi / số câu hỏi)
            </li>
            <li>
              <strong>20%</strong> - Hiệu quả (tỷ lệ câu hỏi unique)
            </li>
            <li>
              <strong>10%</strong> - Đạo đức (không hỏi đáp án trực tiếp)
            </li>
          </ul>
          <p className="note">
            💡 Điểm AI Skill cao = Biết sử dụng AI hiệu quả, không phụ thuộc quá nhiều
          </p>
        </details>
      </div>
    </div>
  );
}

AISkillBadges.propTypes = {
  aiInteractionSummary: PropTypes.shape({
    totalPrompts: PropTypes.number,
    uniquePromptRate: PropTypes.number,
    independenceLevel: PropTypes.number,
    promptQualityBand: PropTypes.oneOf(['high', 'medium', 'low', 'N/A']),
    avgPromptLength: PropTypes.number,
  }),
  aiSkillScore: PropTypes.number.isRequired,
  aiSkillScoreWeight: PropTypes.number,
};

export default AISkillBadges;
