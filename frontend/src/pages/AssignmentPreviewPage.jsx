import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './AssignmentPreviewPage.css';

/**
 * AssignmentPreviewPage
 * Instructor preview bài tập trước khi edit
 */
function AssignmentPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAssignment();
  }, [id]);

  const loadAssignment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/assignment/${id}`);
      setAssignment(response.data.assignment);
    } catch (err) {
      console.error('❌ Lỗi tải bài tập:', err);
      setError(err.response?.data?.error || 'Không thể tải bài tập');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeLabel = type => {
    switch (type) {
      case 'multiple-choice':
        return '📝 Trắc Nghiệm';
      case 'essay':
        return '✍️ Tự Luận';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="assignment-preview-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải bài tập...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="assignment-preview-page">
        <div className="error-state">
          <h2>❌ Lỗi</h2>
          <p>{typeof error === 'string' ? error : error?.message || 'Không tìm thấy bài tập'}</p>
          <button onClick={() => navigate(-1)} className="btn-back">
            ← Quay Lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="assignment-preview-page">
      {/* Header */}
      <div className="preview-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          ← Quay Lại
        </button>
        <button onClick={() => navigate(`/instructor/assignment/edit/${id}`)} className="btn-edit">
          ✏️ Chỉnh Sửa
        </button>
      </div>

      {/* Assignment Info */}
      <div className="assignment-info-card">
        <h1 className="assignment-title">{assignment.title}</h1>
        <div className="assignment-meta">
          <span className="meta-item">{getQuestionTypeLabel(assignment.questionType)}</span>
          <span className="meta-item">📝 {assignment.questions?.length || 0} câu hỏi</span>
          <span className="meta-item">💯 Max: 10 điểm</span>
          {assignment.settings?.timeLimit && (
            <span className="meta-item">⏱️ {assignment.settings.timeLimit} phút</span>
          )}
        </div>
        {assignment.description && (
          <p className="assignment-description">{assignment.description}</p>
        )}
      </div>

      {/* Questions */}
      <div className="questions-section">
        <h2>📋 Danh Sách Câu Hỏi</h2>
        {assignment.questions?.map((question, index) => (
          <div key={question._id || index} className="question-card">
            <div className="question-header">
              <span className="question-number">Câu {index + 1}</span>
              <span className="question-type">
                {question.type === 'multiple-choice' ? '📝 Trắc nghiệm' : '✍️ Tự luận'}
              </span>
              <span className="question-points">{question.points} điểm</span>
            </div>
            <div className="question-content">
              <p className="question-text">{question.question}</p>
              {question.type === 'multiple-choice' && question.options && (
                <div className="options-list">
                  {question.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`option-item ${option === question.correctAnswer ? 'correct' : ''}`}
                    >
                      <span className="option-label">{String.fromCharCode(65 + optIndex)}.</span>
                      <span className="option-text">{option}</span>
                      {option === question.correctAnswer && (
                        <span className="correct-badge">✓ Đúng</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {question.type === 'essay' && question.rubric && (
                <div className="rubric-section">
                  <h4>📌 Tiêu chí chấm điểm:</h4>
                  <p>{question.rubric}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AssignmentPreviewPage;
