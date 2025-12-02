import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';
import { PromptQualityIndicator } from './PromptQualityFeedback';
import './PromptLabelingInterface.css';

/**
 * PromptLabelingInterface Component
 *
 * Allows instructors to label prompts as "good" or "bad"
 * for ML training dataset creation
 *
 * Props:
 * - assignmentId: string - Assignment ID to filter logs
 * - submissionId: string (optional) - Specific submission to view
 */
function PromptLabelingInterface({ assignmentId, submissionId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'labeled' | 'unlabeled'
  const [stats, setStats] = useState(null);
  const [labeling, setLabeling] = useState(null); // logId being labeled

  // Load logs on mount
  useEffect(() => {
    loadLogs();
    loadStats();
  }, [assignmentId, submissionId, filter]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = submissionId
        ? `/logs/submission/${submissionId}`
        : `/logs/assignment/${assignmentId}`;

      // Add filter query param
      if (filter === 'labeled') {
        url += '?labeled=true';
      } else if (filter === 'unlabeled') {
        url += '?labeled=false';
      }

      const response = await api.get(url);
      setLogs(response.data.logs || []);
    } catch (err) {
      console.error('Error loading logs:', err);
      setError('Không thể tải logs. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const params = assignmentId ? `?assignmentId=${assignmentId}` : '';
      const response = await api.get(`/logs/label-stats${params}`);
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const labelPrompt = async (logId, quality, note = '') => {
    setLabeling(logId);

    try {
      await api.post(`/logs/${logId}/label`, { quality, note });

      // Update local state
      setLogs(prevLogs =>
        prevLogs.map(log =>
          log._id === logId
            ? {
                ...log,
                instructorLabel: {
                  quality,
                  labeledAt: new Date(),
                  note,
                },
              }
            : log
        )
      );

      // Reload stats
      await loadStats();
    } catch (err) {
      console.error('Error labeling prompt:', err);
      alert('Không thể label prompt. Vui lòng thử lại.');
    } finally {
      setLabeling(null);
    }
  };

  const removeLabel = async logId => {
    setLabeling(logId);

    try {
      await api.delete(`/logs/${logId}/label`);

      // Update local state
      setLogs(prevLogs =>
        prevLogs.map(log =>
          log._id === logId
            ? {
                ...log,
                instructorLabel: { quality: null, labeledAt: null, note: null },
              }
            : log
        )
      );

      // Reload stats
      await loadStats();
    } catch (err) {
      console.error('Error removing label:', err);
      alert('Không thể xóa label. Vui lòng thử lại.');
    } finally {
      setLabeling(null);
    }
  };

  const exportData = async format => {
    try {
      const params = new URLSearchParams({
        labeled: 'true',
        format,
      });

      if (assignmentId) {
        params.append('assignmentId', assignmentId);
      }

      const response = await api.get(`/logs/export-training-data?${params.toString()}`, {
        responseType: format === 'csv' ? 'blob' : 'json',
      });

      if (format === 'csv') {
        // Download CSV
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompt_training_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Download JSON
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompt_training_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      alert(`✅ Đã export ${response.data.labeledCount || stats.labeledLogs} labeled prompts!`);
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Không thể export data. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <div className="labeling-interface">
        <div className="loading-state">⏳ Đang tải logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="labeling-interface">
        <div className="error-state">❌ {error}</div>
      </div>
    );
  }

  return (
    <div className="labeling-interface">
      {/* Header with Stats */}
      <div className="labeling-header">
        <div className="header-title">
          <h2>🏷️ Label Prompts cho ML Training</h2>
          <p>Đánh giá chất lượng prompt của sinh viên để xây dựng dataset huấn luyện AI</p>
        </div>

        {stats && (
          <div className="labeling-stats">
            <div className="stat-card">
              <span className="stat-value">{stats.totalLogs}</span>
              <span className="stat-label">Tổng Prompts</span>
            </div>
            <div className="stat-card">
              <span className="stat-value good">{stats.goodLabels}</span>
              <span className="stat-label">Good</span>
            </div>
            <div className="stat-card">
              <span className="stat-value bad">{stats.badLabels}</span>
              <span className="stat-label">Bad</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.unlabeledLogs}</span>
              <span className="stat-label">Chưa Label</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.labeledPercentage}%</span>
              <span className="stat-label">Hoàn Thành</span>
            </div>
          </div>
        )}

        {stats && (
          <div className={`training-readiness ${stats.readyForTraining ? 'ready' : 'not-ready'}`}>
            {stats.readyForTraining ? (
              <>
                <span className="readiness-icon">✅</span>
                <span>{stats.recommendation}</span>
              </>
            ) : (
              <>
                <span className="readiness-icon">⏳</span>
                <span>{stats.recommendation}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="labeling-controls">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất Cả ({stats?.totalLogs || 0})
          </button>
          <button
            className={`filter-btn ${filter === 'unlabeled' ? 'active' : ''}`}
            onClick={() => setFilter('unlabeled')}
          >
            Chưa Label ({stats?.unlabeledLogs || 0})
          </button>
          <button
            className={`filter-btn ${filter === 'labeled' ? 'active' : ''}`}
            onClick={() => setFilter('labeled')}
          >
            Đã Label ({stats?.labeledLogs || 0})
          </button>
        </div>

        <div className="export-buttons">
          <button className="export-btn csv" onClick={() => exportData('csv')}>
            📥 Export CSV
          </button>
          <button className="export-btn json" onClick={() => exportData('json')}>
            📥 Export JSON
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="logs-list">
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Không có logs nào</h3>
            <p>
              {filter === 'unlabeled'
                ? 'Tất cả prompts đã được label!'
                : 'Chưa có sinh viên nào sử dụng AI cho bài tập này.'}
            </p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log._id} className="log-card">
              <div className="log-header">
                <div className="log-metadata">
                  <span className="log-student">👤 {log.studentId?.name || 'Sinh viên'}</span>
                  <span className="log-timestamp">
                    🕒 {new Date(log.timestamp).toLocaleString('vi-VN')}
                  </span>
                  {log.qualityScore && (
                    <PromptQualityIndicator
                      quality={{
                        score: log.qualityScore,
                        level:
                          log.qualityScore >= 80
                            ? 'excellent'
                            : log.qualityScore >= 60
                              ? 'good'
                              : 'fair',
                      }}
                    />
                  )}
                </div>

                {log.instructorLabel?.quality && (
                  <div className={`current-label ${log.instructorLabel.quality}`}>
                    {log.instructorLabel.quality === 'good' ? '✅ GOOD' : '❌ BAD'}
                  </div>
                )}
              </div>

              <div className="log-content">
                <div className="log-prompt">
                  <strong>Prompt:</strong>
                  <p>{log.prompt}</p>
                </div>

                <div className="log-response">
                  <strong>AI Response:</strong>
                  <p>{log.response.substring(0, 200)}...</p>
                </div>

                <div className="log-stats">
                  <span>📝 {log.prompt.length} chars</span>
                  <span>🪙 {log.totalTokens} tokens</span>
                  <span>⏱️ {log.responseTime}ms</span>
                  {log.contextProvided && <span>✅ Context</span>}
                </div>
              </div>

              <div className="log-actions">
                {labeling === log._id ? (
                  <div className="labeling-indicator">⏳ Đang xử lý...</div>
                ) : log.instructorLabel?.quality ? (
                  <>
                    <button
                      className="label-btn change"
                      onClick={() =>
                        labelPrompt(
                          log._id,
                          log.instructorLabel.quality === 'good' ? 'bad' : 'good'
                        )
                      }
                    >
                      🔄 Đổi sang {log.instructorLabel.quality === 'good' ? 'BAD' : 'GOOD'}
                    </button>
                    <button className="label-btn remove" onClick={() => removeLabel(log._id)}>
                      🗑️ Xóa Label
                    </button>
                  </>
                ) : (
                  <>
                    <button className="label-btn good" onClick={() => labelPrompt(log._id, 'good')}>
                      ✅ GOOD
                    </button>
                    <button className="label-btn bad" onClick={() => labelPrompt(log._id, 'bad')}>
                      ❌ BAD
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

PromptLabelingInterface.propTypes = {
  assignmentId: PropTypes.string.isRequired,
  submissionId: PropTypes.string,
};

export default PromptLabelingInterface;
