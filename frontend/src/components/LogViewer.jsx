import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';
import './LogViewer.css';

/**
 * LogViewer Component
 * Hiển thị timeline AI interaction logs cho một submission
 *
 * Features:
 * - Timeline view với time, question, prompt, response
 * - Collapsible response text
 * - Metadata: promptType, tokens, responseTime
 * - AI Analysis: Prompt quality chart, independence level
 */
function LogViewer({ submissionId }) {
  const [logs, setLogs] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [analysis, setAnalysis] = useState(null);

  // Load logs on mount
  useEffect(() => {
    if (submissionId) {
      loadLogs();
    }
  }, [submissionId]);

  // Load AI logs
  const loadLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/logs/submission/${submissionId}`);
      const logsData = response.data.logs || [];

      setLogs(logsData);

      // Get assignment info from first log
      if (logsData.length > 0 && logsData[0].assignment) {
        setAssignment(logsData[0].assignment);
      }

      // Calculate analysis
      calculateAnalysis(logsData);

      console.log('✅ Logs loaded', { count: logsData.length });
    } catch (err) {
      console.error('❌ Failed to load logs:', err);
      setError(err.response?.data?.error || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  // Calculate AI analysis
  const calculateAnalysis = logsData => {
    if (logsData.length === 0) {
      setAnalysis(null);
      return;
    }

    // Prompt quality distribution
    const qualityDistribution = {
      high: 0,
      medium: 0,
      low: 0,
    };

    logsData.forEach(log => {
      const quality = classifyPromptQuality(log);
      qualityDistribution[quality]++;
    });

    // Calculate independence level
    // More prompts = lower independence
    const avgPromptsPerQuestion =
      logsData.length / (new Set(logsData.map(l => l.questionId)).size || 1);
    const independenceLevel = Math.max(0, Math.min(100, 100 - avgPromptsPerQuestion * 15));

    // Prompt type distribution
    const typeDistribution = {};
    logsData.forEach(log => {
      const type = log.promptType || 'unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    // Average tokens and response time
    const avgTokens = Math.round(
      logsData.reduce(
        (sum, log) => sum + (log.promptTokens || 0) + (log.completionTokens || 0),
        0
      ) / logsData.length
    );
    const avgResponseTime = Math.round(
      logsData.reduce((sum, log) => sum + (log.responseTime || 0), 0) / logsData.length
    );

    setAnalysis({
      qualityDistribution,
      independenceLevel,
      typeDistribution,
      avgTokens,
      avgResponseTime,
      totalPrompts: logsData.length,
      uniqueQuestions: new Set(logsData.map(l => l.questionId)).size,
    });
  };

  // Classify prompt quality
  const classifyPromptQuality = log => {
    const promptLength = log.prompt?.length || 0;
    const hasContext = log.contextProvided || false;

    // High quality: Long prompt (>100 chars) + context provided
    if (promptLength > 100 && hasContext) return 'high';

    // Medium quality: Decent length (>50 chars) OR has context
    if (promptLength > 50 || hasContext) return 'medium';

    // Low quality: Short prompt, no context
    return 'low';
  };

  // Toggle log expansion
  const toggleLog = logId => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  // Get question number from questionId
  const getQuestionNumber = questionId => {
    if (!assignment || !questionId) return 'N/A';
    const index = assignment.questions?.findIndex(q => q._id === questionId);
    return index >= 0 ? index + 1 : 'N/A';
  };

  // Get prompt type badge class
  const getPromptTypeClass = type => {
    switch (type) {
      case 'question':
        return 'type-question';
      case 'clarification':
        return 'type-clarification';
      case 'hint':
        return 'type-hint';
      default:
        return 'type-default';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="log-viewer">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading AI logs...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="log-viewer">
        <div className="error-container">
          <h3>❌ Error Loading Logs</h3>
          <p>{error}</p>
          <button onClick={loadLogs} className="retry-button">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (logs.length === 0) {
    return (
      <div className="log-viewer">
        <div className="empty-container">
          <div className="empty-icon">📭</div>
          <h3>No AI Interactions</h3>
          <p>This student did not use AI assistance for this assignment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="log-viewer">
      {/* Header */}
      <div className="log-viewer-header">
        <h2>🤖 AI Interaction Logs</h2>
        <div className="header-stats">
          <span className="stat-badge">📊 {logs.length} total interactions</span>
          <span className="stat-badge">🎯 {analysis?.uniqueQuestions || 0} questions</span>
        </div>
      </div>

      <div className="log-viewer-content">
        {/* AI Analysis Section */}
        {analysis && (
          <div className="ai-analysis-section">
            <h3>📈 AI Usage Analysis</h3>

            <div className="analysis-grid">
              {/* Independence Level */}
              <div className="analysis-card highlight">
                <div className="card-icon">🎯</div>
                <div className="card-content">
                  <h4>Independence Level</h4>
                  <div className="independence-bar">
                    <div
                      className="independence-fill"
                      style={{
                        width: `${analysis.independenceLevel}%`,
                        background:
                          analysis.independenceLevel > 70
                            ? '#10b981'
                            : analysis.independenceLevel > 40
                              ? '#f59e0b'
                              : '#ef4444',
                      }}
                    />
                  </div>
                  <p className="independence-value">{Math.round(analysis.independenceLevel)}%</p>
                  <p className="card-description">
                    {analysis.independenceLevel > 70
                      ? '✅ High independence - Used AI sparingly'
                      : analysis.independenceLevel > 40
                        ? '⚠️ Moderate independence - Balanced AI usage'
                        : '❌ Low independence - Heavy AI reliance'}
                  </p>
                </div>
              </div>

              {/* Prompt Quality Distribution */}
              <div className="analysis-card">
                <div className="card-icon">⭐</div>
                <div className="card-content">
                  <h4>Prompt Quality</h4>
                  <div className="quality-bars">
                    <div className="quality-item">
                      <span className="quality-label high">🟢 High Quality</span>
                      <div className="quality-bar">
                        <div
                          className="quality-fill high"
                          style={{
                            width: `${(analysis.qualityDistribution.high / logs.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="quality-count">{analysis.qualityDistribution.high}</span>
                    </div>
                    <div className="quality-item">
                      <span className="quality-label medium">🟡 Medium Quality</span>
                      <div className="quality-bar">
                        <div
                          className="quality-fill medium"
                          style={{
                            width: `${(analysis.qualityDistribution.medium / logs.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="quality-count">{analysis.qualityDistribution.medium}</span>
                    </div>
                    <div className="quality-item">
                      <span className="quality-label low">🔴 Low Quality</span>
                      <div className="quality-bar">
                        <div
                          className="quality-fill low"
                          style={{
                            width: `${(analysis.qualityDistribution.low / logs.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="quality-count">{analysis.qualityDistribution.low}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="analysis-card">
                <div className="card-icon">🪙</div>
                <div className="card-content">
                  <h4>Avg Tokens/Prompt</h4>
                  <p className="stat-value">{analysis.avgTokens}</p>
                  <p className="card-description">Average across all interactions</p>
                </div>
              </div>

              <div className="analysis-card">
                <div className="card-icon">⏱️</div>
                <div className="card-content">
                  <h4>Avg Response Time</h4>
                  <p className="stat-value">{analysis.avgResponseTime}ms</p>
                  <p className="card-description">Average API response time</p>
                </div>
              </div>
            </div>

            {/* Prompt Type Distribution */}
            <div className="type-distribution">
              <h4>Prompt Types</h4>
              <div className="type-chips">
                {Object.entries(analysis.typeDistribution).map(([type, count]) => (
                  <div key={type} className={`type-chip ${getPromptTypeClass(type)}`}>
                    {type === 'question'
                      ? '❓'
                      : type === 'clarification'
                        ? '💭'
                        : type === 'hint'
                          ? '💡'
                          : '📝'}
                    <span className="type-name">{type}</span>
                    <span className="type-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Timeline Section */}
        <div className="timeline-section">
          <h3>⏱️ Interaction Timeline</h3>

          <div className="timeline">
            {logs.map((log, index) => {
              const isExpanded = expandedLogs.has(log._id);
              const quality = classifyPromptQuality(log);

              return (
                <div key={log._id} className="timeline-item">
                  {/* Timeline dot */}
                  <div className="timeline-dot" />

                  {/* Timeline content */}
                  <div className={`timeline-content quality-${quality}`}>
                    {/* Header */}
                    <div className="log-header">
                      <div className="log-time">
                        <span className="time-icon">🕐</span>
                        <span className="time-text">
                          {new Date(log.timestamp).toLocaleString('vi-VN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>

                      {log.questionId && (
                        <span className="question-badge">
                          📝 Câu {getQuestionNumber(log.questionId)}
                        </span>
                      )}

                      <span className={`prompt-type-badge ${getPromptTypeClass(log.promptType)}`}>
                        {log.promptType || 'unknown'}
                      </span>
                    </div>

                    {/* Prompt */}
                    <div className="log-prompt">
                      <div className="prompt-label">
                        <span className="prompt-icon">👤</span>
                        <strong>Student Prompt:</strong>
                        {log.contextProvided && (
                          <span className="context-badge">✅ With context</span>
                        )}
                      </div>
                      <p className="prompt-text">{log.prompt}</p>
                    </div>

                    {/* Response */}
                    <div className="log-response">
                      <div className="response-header">
                        <div className="response-label">
                          <span className="response-icon">🤖</span>
                          <strong>AI Response:</strong>
                        </div>
                        <button className="toggle-button" onClick={() => toggleLog(log._id)}>
                          {isExpanded ? '▼ Collapse' : '▶ Expand'}
                        </button>
                      </div>

                      {isExpanded && <div className="response-text">{log.response}</div>}
                    </div>

                    {/* Metadata */}
                    <div className="log-metadata">
                      <span className="metadata-item">
                        🪙 {(log.promptTokens || 0) + (log.completionTokens || 0)} tokens
                      </span>
                      {log.responseTime && (
                        <span className="metadata-item">⏱️ {log.responseTime}ms</span>
                      )}
                      <span className="metadata-item quality-indicator">
                        {quality === 'high'
                          ? '⭐ High Quality'
                          : quality === 'medium'
                            ? '⚡ Medium Quality'
                            : '⚠️ Low Quality'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

LogViewer.propTypes = {
  submissionId: PropTypes.string.isRequired,
};

export default LogViewer;
