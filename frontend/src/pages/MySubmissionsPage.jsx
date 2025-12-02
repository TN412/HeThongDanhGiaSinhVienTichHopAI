import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './MySubmissionsPage.css';

function MySubmissionsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('all'); // all, submitted, graded, draft

  useEffect(() => {
    loadSubmissions();
  }, [filter]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (filter !== 'all') {
        params.status = filter;
      }

      const response = await api.get('/submission/student/my-submissions', { params });
      setSubmissions(response.data.submissions || []);
    } catch (err) {
      console.error('❌ Failed to load submissions:', err);
      setError(err.response?.data?.error || 'Không thể tải danh sách bài làm');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = status => {
    const badges = {
      draft: { text: '📝 Bản Nháp', class: 'status-draft' },
      submitted: { text: '✅ Đã Nộp', class: 'status-submitted' },
      pending_grading: { text: '⏳ Chờ Chấm', class: 'status-pending' },
      graded: { text: '⭐ Đã Chấm', class: 'status-graded' },
    };
    return badges[status] || { text: status, class: '' };
  };

  const getScoreColor = score => {
    if (score >= 8) return 'score-excellent';
    if (score >= 6) return 'score-good';
    if (score >= 5) return 'score-average';
    return 'score-poor';
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewDetails = submissionId => {
    navigate(`/student/results/${submissionId}`);
  };

  if (loading) {
    return (
      <div className="my-submissions-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải danh sách bài làm...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-submissions-page">
        <div className="error-state">
          <h2>❌ Lỗi</h2>
          <p>{error}</p>
          <button onClick={loadSubmissions} className="btn btn-primary">
            Thử Lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-submissions-page">
      <div className="page-header">
        <h1>📚 Bài Tập Của Tôi</h1>
        <p className="subtitle">Xem tất cả bài tập đã làm và nhận xét từ giảng viên</p>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        <button
          className={`tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tất Cả ({submissions.length})
        </button>
        <button
          className={`tab ${filter === 'submitted' ? 'active' : ''}`}
          onClick={() => setFilter('submitted')}
        >
          Đã Nộp
        </button>
        <button
          className={`tab ${filter === 'pending_grading' ? 'active' : ''}`}
          onClick={() => setFilter('pending_grading')}
        >
          Chờ Chấm
        </button>
        <button
          className={`tab ${filter === 'graded' ? 'active' : ''}`}
          onClick={() => setFilter('graded')}
        >
          Đã Chấm
        </button>
        <button
          className={`tab ${filter === 'draft' ? 'active' : ''}`}
          onClick={() => setFilter('draft')}
        >
          Bản Nháp
        </button>
      </div>

      {/* Submissions list */}
      {submissions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>Chưa có bài làm nào</h3>
          <p>Bạn chưa làm bài tập nào. Hãy bắt đầu làm bài tập mới!</p>
          <button onClick={() => navigate('/assignments')} className="btn btn-primary">
            Xem Bài Tập
          </button>
        </div>
      ) : (
        <div className="submissions-grid">
          {submissions.map(submission => {
            const statusBadge = getStatusBadge(submission.status);
            const isGraded = submission.status === 'graded';
            const hasScores = submission.finalScore !== null && submission.finalScore !== undefined;

            return (
              <div key={submission._id} className="submission-card">
                <div className="card-header">
                  <h3 className="assignment-title">{submission.assignmentTitle}</h3>
                  <span className={`status-badge ${statusBadge.class}`}>{statusBadge.text}</span>
                </div>

                <div className="card-body">
                  {submission.assignmentDescription && (
                    <p className="assignment-description">{submission.assignmentDescription}</p>
                  )}

                  <div className="submission-info">
                    <div className="info-item">
                      <span className="info-label">📅 Deadline:</span>
                      <span className="info-value">
                        {submission.deadline ? formatDate(submission.deadline) : 'Không có'}
                      </span>
                    </div>

                    {submission.submittedAt && (
                      <div className="info-item">
                        <span className="info-label">✅ Nộp lúc:</span>
                        <span className="info-value">{formatDate(submission.submittedAt)}</span>
                      </div>
                    )}
                  </div>

                  {submission.status === 'pending_grading' && (
                    <div className="pending-message">
                      <span className="pending-icon">⏳</span>
                      <div className="pending-text">
                        <strong>Đang chờ giảng viên chấm bài tự luận</strong>
                        <p>
                          Bài làm của bạn đã được nộp thành công. Vui lòng chờ giảng viên chấm điểm.
                        </p>
                      </div>
                    </div>
                  )}

                  {hasScores && (
                    <div className="scores-summary">
                      <div className="score-item">
                        <span className="score-label">Điểm Nội Dung</span>
                        <span className={`score-value ${getScoreColor(submission.contentScore)}`}>
                          {(submission.contentScore || 0).toFixed(1)}/10
                        </span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Kỹ Năng AI</span>
                        <span className={`score-value ${getScoreColor(submission.aiSkillScore)}`}>
                          {(submission.aiSkillScore || 0).toFixed(1)}/10
                        </span>
                      </div>
                      <div className="score-item final">
                        <span className="score-label">Điểm Cuối</span>
                        <span className={`score-value ${getScoreColor(submission.finalScore)}`}>
                          {(submission.finalScore || 0).toFixed(1)}/10
                        </span>
                      </div>
                    </div>
                  )}

                  {submission.feedback && (
                    <div className="feedback-preview">
                      <div className="feedback-header">
                        <span className="feedback-icon">💬</span>
                        <span className="feedback-label">Nhận xét của giảng viên</span>
                        {submission.feedbackAt && (
                          <span className="feedback-date">{formatDate(submission.feedbackAt)}</span>
                        )}
                      </div>
                      <p className="feedback-text">{submission.feedback}</p>
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <button
                    onClick={() => handleViewDetails(submission._id)}
                    className="btn btn-primary"
                  >
                    {submission.status === 'draft' ? '📝 Tiếp Tục Làm' : '📊 Xem Chi Tiết'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MySubmissionsPage;
