/**
 * AI Assessment Report Page
 * Comprehensive AI usage assessment report for instructors
 * Shows 8-part analysis: summary, dependency, rubric, WISDOM, timeline, top prompts, warnings, logs
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import WisdomRadarChart from '../components/WisdomRadarChart';
import DependencyGauge from '../components/DependencyGauge';
import TimelineChart from '../components/TimelineChart';
import PromptQualityList from '../components/PromptQualityList';
import RubricScoreCard from '../components/RubricScoreCard';
import RiskLevelBadge from '../components/RiskLevelBadge';
import './AIAssessmentReport.css';

const AIAssessmentReport = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState({});

  useEffect(() => {
    fetchAssessment();
  }, [submissionId]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use api instance which automatically handles base URL and auth tokens
      const response = await api.get(`/ai-assessment/submission/${submissionId}`);

      console.log('📊 Assessment API response:', response.data);

      if (response.data.success && response.data.hasData) {
        setAssessment(response.data.assessment);
        setSubmissionInfo(response.data.assessment.submissionInfo);
      } else {
        // No AI data for this submission - show empty state
        setError('Sinh viên không sử dụng AI trong bài làm này');
        console.log('⚠️ No AI data:', response.data);
      }
    } catch (err) {
      console.error('❌ Error fetching assessment:', err);
      console.error('Error details:', err.response?.data);
      setError(
        err.response?.data?.error || `Không thể tải báo cáo đánh giá. Chi tiết: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleLogExpansion = index => {
    setExpandedLogs(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleBack = () => {
    navigate('/instructor/dashboard');
  };

  if (loading) {
    return (
      <div className="assessment-loading">
        <div className="spinner"></div>
        <p>Đang tạo báo cáo đánh giá AI...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assessment-error">
        <div className="error-icon">⚠️</div>
        <h2>Không thể tải báo cáo</h2>
        <p>{error}</p>
        <button className="btn-back" onClick={handleBack}>
          Quay lại Dashboard
        </button>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="assessment-empty">
        <div className="empty-icon">📊</div>
        <h2>Sinh viên không sử dụng AI</h2>
        <p>Bài làm này không có tương tác với AI nào được ghi nhận.</p>
        <button className="btn-back" onClick={handleBack}>
          Quay lại Dashboard
        </button>
      </div>
    );
  }

  const {
    summary,
    dependencyAnalysis,
    rubricScores,
    wisdomScore,
    timeline,
    topPrompts,
    warningsAndRecommendations,
    classifiedLogs,
    basicStats,
  } = assessment;

  return (
    <div className="ai-assessment-report">
      {/* Header */}
      <div className="report-header no-print">
        <button className="btn-back" onClick={handleBack}>
          ← Quay lại
        </button>
        <h1>📊 Báo Cáo Đánh Giá Sử Dụng AI</h1>
        <button className="btn-export" onClick={handleExportPDF}>
          📄 Xuất PDF
        </button>
      </div>

      {/* Submission Info */}
      {submissionInfo && (
        <div className="submission-info-card">
          <h2>Thông Tin Bài Làm</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Sinh viên:</span>
              <span className="info-value">{submissionInfo.studentName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{submissionInfo.studentEmail}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Bài tập:</span>
              <span className="info-value">{submissionInfo.assignmentTitle}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Nộp lúc:</span>
              <span className="info-value">
                {new Date(submissionInfo.submittedAt).toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Điểm nội dung:</span>
              <span className="info-value score">{submissionInfo.totalScore}/10</span>
            </div>
            <div className="info-item">
              <span className="info-label">Điểm AI Skill:</span>
              <span className="info-value score">{submissionInfo.aiSkillScore?.toFixed(1)}/10</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Section */}
      <div className="report-section summary-section">
        <h2>📋 Tổng Quan</h2>
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-icon">💬</div>
            <div className="card-content">
              <h3>{summary.totalPrompts}</h3>
              <p>Tổng số prompts</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon">🎯</div>
            <div className="card-content">
              <h3>{summary.dependencyScore}/100</h3>
              <p>Điểm độc lập</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon">⭐</div>
            <div className="card-content">
              <h3>{summary.overallQuality.toFixed(1)}/5</h3>
              <p>Chất lượng trung bình</p>
            </div>
          </div>
          <div className="summary-card risk-card">
            <div className="card-icon">🚨</div>
            <div className="card-content">
              <RiskLevelBadge level={summary.riskLevel} size="large" />
              <p>Mức độ rủi ro</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dependency Analysis */}
      <div className="report-section dependency-section">
        <h2>🎯 Phân Tích Mức Độ Phụ Thuộc</h2>
        <div className="dependency-content">
          <div className="gauge-container">
            <DependencyGauge
              score={dependencyAnalysis.independenceScore || 100 - dependencyAnalysis.score}
              level={dependencyAnalysis.level}
              size={250}
            />
            <p className="gauge-explanation">
              <strong>Độc lập:</strong>{' '}
              {dependencyAnalysis.independenceScore || 100 - dependencyAnalysis.score}/100
              <br />
              <strong>Phụ thuộc:</strong> {dependencyAnalysis.score}/100
            </p>
          </div>
          <div className="dependency-details">
            <h3>📋 {dependencyAnalysis.level.description || dependencyAnalysis.description}</h3>
            <div className="patterns-list">
              <h4>📊 Các mẫu hành vi phát hiện:</h4>
              {dependencyAnalysis.patterns && (
                <>
                  <div className="pattern-item">
                    <span className="pattern-icon">✍️</span>
                    <div className="pattern-content">
                      <span className="pattern-name">Yêu cầu AI làm thay (Write-for-me)</span>
                      <div className="pattern-bar-container">
                        <div
                          className="pattern-bar high-risk"
                          style={{
                            width: `${summary.totalPrompts > 0 ? (dependencyAnalysis.patterns.writeForMeCount / summary.totalPrompts) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="pattern-stats">
                        {dependencyAnalysis.patterns.writeForMeCount}/{summary.totalPrompts} prompts
                        (
                        {summary.totalPrompts > 0
                          ? (
                              (dependencyAnalysis.patterns.writeForMeCount / summary.totalPrompts) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %) - Trọng số: 30%
                      </span>
                    </div>
                  </div>

                  <div className="pattern-item">
                    <span className="pattern-icon">⚡</span>
                    <div className="pattern-content">
                      <span className="pattern-name">Hỏi quá nhanh (Too Fast)</span>
                      <div className="pattern-bar-container">
                        <div
                          className="pattern-bar medium-risk"
                          style={{
                            width: `${summary.totalPrompts > 0 ? (dependencyAnalysis.patterns.tooFastCount / summary.totalPrompts) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="pattern-stats">
                        {dependencyAnalysis.patterns.tooFastCount}/{summary.totalPrompts} prompts (
                        {summary.totalPrompts > 0
                          ? (
                              (dependencyAnalysis.patterns.tooFastCount / summary.totalPrompts) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %) - Trọng số: 25%
                      </span>
                    </div>
                  </div>

                  <div className="pattern-item">
                    <span className="pattern-icon">📋</span>
                    <div className="pattern-content">
                      <span className="pattern-name">Copy-paste câu hỏi gốc</span>
                      <div className="pattern-bar-container">
                        <div
                          className="pattern-bar medium-risk"
                          style={{
                            width: `${summary.totalPrompts > 0 ? (dependencyAnalysis.patterns.copyPasteIndicators / summary.totalPrompts) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="pattern-stats">
                        {dependencyAnalysis.patterns.copyPasteIndicators}/{summary.totalPrompts}{' '}
                        prompts (
                        {summary.totalPrompts > 0
                          ? (
                              (dependencyAnalysis.patterns.copyPasteIndicators /
                                summary.totalPrompts) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %) - Trọng số: 20%
                      </span>
                    </div>
                  </div>

                  <div className="pattern-item">
                    <span className="pattern-icon">❓</span>
                    <div className="pattern-content">
                      <span className="pattern-name">Thiếu câu hỏi làm rõ</span>
                      <div className="pattern-bar-container">
                        <div
                          className="pattern-bar low-risk"
                          style={{
                            width: `${summary.totalPrompts > 0 ? (dependencyAnalysis.patterns.lackOfInquiryCount / summary.totalPrompts) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="pattern-stats">
                        {dependencyAnalysis.patterns.lackOfInquiryCount}/{summary.totalPrompts}{' '}
                        prompts (
                        {summary.totalPrompts > 0
                          ? (
                              (dependencyAnalysis.patterns.lackOfInquiryCount /
                                summary.totalPrompts) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %) - Trọng số: 15%
                      </span>
                    </div>
                  </div>

                  <div className="pattern-item">
                    <span className="pattern-icon">🔄</span>
                    <div className="pattern-content">
                      <span className="pattern-name">Không cải thiện prompt</span>
                      <div className="pattern-bar-container">
                        <div
                          className="pattern-bar low-risk"
                          style={{
                            width: `${summary.totalPrompts > 0 ? (dependencyAnalysis.patterns.noIterationCount / summary.totalPrompts) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                      <span className="pattern-stats">
                        {dependencyAnalysis.patterns.noIterationCount}/{summary.totalPrompts}{' '}
                        prompts (
                        {summary.totalPrompts > 0
                          ? (
                              (dependencyAnalysis.patterns.noIterationCount /
                                summary.totalPrompts) *
                              100
                            ).toFixed(1)
                          : '0.0'}
                        %) - Trọng số: 10%
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rubric Scores */}
      <div className="report-section rubric-section">
        <RubricScoreCard rubricScores={rubricScores} />
      </div>

      {/* WISDOM Framework */}
      <div className="report-section wisdom-section">
        <h2>🧠 WISDOM Framework Assessment</h2>
        <div className="wisdom-content">
          <WisdomRadarChart wisdomScore={wisdomScore} size={350} />
          <div className="wisdom-interpretation">
            <h3>Giải thích chi tiết:</h3>
            {wisdomScore.interpretation && (
              <>
                <div className="interpretation-item">
                  <h4>📚 Inquiry (Tìm kiếm hiểu biết):</h4>
                  <p>{wisdomScore.interpretation.inquiry}</p>
                </div>
                <div className="interpretation-item">
                  <h4>💡 Disruptive Thinking (Tư duy sáng tạo):</h4>
                  <p>{wisdomScore.interpretation.disruptiveThinking}</p>
                </div>
                <div className="interpretation-item">
                  <h4>🧘 Mindfulness (Sự tỉnh táo):</h4>
                  <p>{wisdomScore.interpretation.mindfulness}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Analysis */}
      <div className="report-section timeline-section">
        <TimelineChart timeline={timeline} />
      </div>

      {/* Top Prompts */}
      <div className="report-section prompts-section">
        <PromptQualityList topPrompts={topPrompts} />
      </div>

      {/* Warnings & Recommendations */}
      <div className="report-section warnings-section">
        <h2>⚠️ Cảnh Báo & Khuyến Nghị</h2>

        {warningsAndRecommendations.warnings.length > 0 && (
          <div className="warnings-box">
            <h3>🚨 Cảnh báo:</h3>
            <ul>
              {warningsAndRecommendations.warnings.map((warning, idx) => (
                <li key={idx} className="warning-item">
                  <RiskLevelBadge level={warning.level || warning} />
                  <div>
                    <strong>{warning.description || warning}</strong>
                    {warning.impact && <p className="warning-impact">{warning.impact}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {warningsAndRecommendations.recommendations.length > 0 && (
          <div className="recommendations-box">
            <h3>💡 Khuyến nghị:</h3>
            <ul>
              {warningsAndRecommendations.recommendations.map((rec, idx) => (
                <li key={idx} className="recommendation-item">
                  <strong>{rec.category || 'Khuyến nghị'}:</strong>{' '}
                  {Array.isArray(rec.suggestions)
                    ? rec.suggestions.join(', ')
                    : rec.suggestions || rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {warningsAndRecommendations.thinkingErrors.length > 0 && (
          <div className="thinking-errors-box">
            <h3>🤔 Lỗi tư duy thường gặp:</h3>
            <ul>
              {warningsAndRecommendations.thinkingErrors.map((error, idx) => (
                <li key={idx} className="thinking-error-item">
                  <strong>{error.error || 'Lỗi'}:</strong> {error.description || error}
                  {error.impact && <p className="error-impact">Ảnh hưởng: {error.impact}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Classified Logs */}
      <div className="report-section logs-section">
        <h2>📝 Lịch Sử Tương Tác AI</h2>
        <p className="logs-subtitle">
          Tổng cộng {classifiedLogs.length} tương tác được phân loại và phân tích
        </p>
        <div className="logs-container">
          {classifiedLogs.map((log, index) => (
            <div key={index} className="log-item">
              <div className="log-header" onClick={() => toggleLogExpansion(index)}>
                <span className="log-number">#{index + 1}</span>
                <span className="log-time">{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                <span className="log-type-badge">{log.promptType}</span>
                <span
                  className="log-quality-badge"
                  style={{
                    backgroundColor:
                      log.advancedQualityAssessment?.score >= 4
                        ? '#10b981'
                        : log.advancedQualityAssessment?.score >= 3
                          ? '#3b82f6'
                          : '#ef4444',
                  }}
                >
                  {log.advancedQualityAssessment?.level} ({log.advancedQualityAssessment?.score}/5)
                </span>
                <span className="log-expand-icon">{expandedLogs[index] ? '▼' : '▶'}</span>
              </div>

              {expandedLogs[index] && (
                <div className="log-details">
                  <div className="log-prompt">
                    <strong>Prompt:</strong>
                    <p>{log.prompt}</p>
                  </div>
                  <div className="log-response">
                    <strong>Response:</strong>
                    <p>{log.response}</p>
                  </div>
                  {log.advancedQualityAssessment?.details && (
                    <div className="log-analysis">
                      <strong>Phân tích:</strong>
                      <p>{log.advancedQualityAssessment.details}</p>
                    </div>
                  )}
                  <div className="log-metadata">
                    <span>🪙 {log.totalTokens} tokens</span>
                    <span>⏱️ {log.responseTime}ms</span>
                    {log.contextProvided && <span>✅ Có context</span>}
                    {log.mutationMetadata?.isRefinement && (
                      <span>🔄 Cải thiện từ prompt trước</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Basic Stats */}
      <div className="report-section stats-section">
        <h2>📈 Thống Kê Cơ Bản</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Tổng prompts:</span>
            <span className="stat-value">{basicStats.totalPrompts}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Prompt độc nhất:</span>
            <span className="stat-value">{basicStats.uniquePrompts}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Độ đa dạng:</span>
            <span className="stat-value">{basicStats.diversificationScore}/100</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Số lần cải thiện:</span>
            <span className="stat-value">{basicStats.refinementCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Tổng tokens:</span>
            <span className="stat-value">{basicStats.totalTokens.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">TB tokens/prompt:</span>
            <span className="stat-value">{Math.round(basicStats.avgTokensPerPrompt)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">TB thời gian phản hồi:</span>
            <span className="stat-value">{Math.round(basicStats.avgResponseTime)}ms</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Thời gian làm việc:</span>
            <span className="stat-value">
              {Math.round(basicStats.totalWorkingTime / 60000)} phút
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="report-footer">
        <p>
          Báo cáo được tạo tự động bởi AI Assessment System -{' '}
          {new Date().toLocaleDateString('vi-VN')}
        </p>
        <p className="footer-note">
          💡 Báo cáo này phân tích toàn diện cách sinh viên sử dụng AI, giúp đánh giá năng lực tư
          duy và độc lập trong học tập.
        </p>
      </div>
    </div>
  );
};

export default AIAssessmentReport;
