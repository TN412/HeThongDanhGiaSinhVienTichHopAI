import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import AISkillBadges from '../components/AISkillBadges';
import '../styles/global.css';

function StudentResultsPage() {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResults();
  }, [submissionId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/submission/${submissionId}`);
      const submissionData = response.data.submission;

      if (submissionData.status === 'draft') {
        navigate(`/student/assignment/${submissionId}`);
        return;
      }

      setSubmission(submissionData);
      setAssignment(submissionData.assignmentId);
    } catch (err) {
      console.error('❌ Error loading results:', err);
      setError(err.response?.data?.error || 'Không thể tải kết quả');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = score => {
    if (score >= 8) return 'var(--success-color)';
    if (score >= 6) return 'var(--warning-color)';
    return 'var(--danger-color)';
  };

  const getScoreLabel = score => {
    if (score >= 9) return 'Xuất sắc';
    if (score >= 8) return 'Giỏi';
    if (score >= 7) return 'Khá';
    if (score >= 6) return 'Trung bình';
    if (score >= 5) return 'Yếu';
    return 'Kém';
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div className="loading loading-lg"></div>
        <h3 style={{ marginTop: '20px' }}>Đang tải kết quả...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger">
          <span style={{ fontSize: '24px' }}>❌</span>
          <div>
            <strong>Lỗi</strong>
            <p style={{ marginBottom: '8px' }}>{error}</p>
            <button
              onClick={() => navigate('/student/assignments')}
              className="btn btn-outline btn-sm"
            >
              ← Quay lại danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!submission || !assignment) {
    return (
      <div className="container">
        <div className="alert alert-warning">
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <strong>Không tìm thấy kết quả</strong>
          </div>
        </div>
      </div>
    );
  }

  // Use contentScore from backend (scale 0-10), or calculate if not available
  const contentScore =
    submission.contentScore ||
    (submission.totalScore && assignment.questions
      ? (submission.totalScore / assignment.questions.reduce((sum, q) => sum + q.points, 0)) * 10
      : 0);

  return (
    <div className="container">
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">📊 Kết Quả Bài Tập</h1>
          <p style={{ color: 'var(--gray-600)', marginBottom: 0 }}>{assignment.title}</p>
        </div>
      </div>

      {/* Score Summary */}
      <div className="grid grid-3" style={{ marginTop: '20px' }}>
        {/* Content Score */}
        <div
          className="card"
          style={{
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <div className="card-body">
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
              📝 ĐIỂM NỘI DUNG
            </div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
              {contentScore.toFixed(1)}
            </div>
            <div style={{ fontSize: '18px', opacity: 0.9 }}>/ 10 điểm</div>
            <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: '500' }}>
              {getScoreLabel(contentScore)}
            </div>
          </div>
        </div>

        {/* AI Skill Score */}
        <div
          className="card"
          style={{
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
          }}
        >
          <div className="card-body">
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
              🤖 KỸ NĂNG SỬ DỤNG AI
            </div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
              {(submission.aiSkillScore || 0).toFixed(1)}
            </div>
            <div style={{ fontSize: '18px', opacity: 0.9 }}>/ 10 điểm</div>
            <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: '500' }}>
              {submission.aiInteractionSummary?.totalPrompts || 0} lượt hỏi AI
            </div>
          </div>
        </div>

        {/* Final Score */}
        <div
          className="card"
          style={{
            textAlign: 'center',
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
          }}
        >
          <div className="card-body">
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
              🎯 ĐIỂM TỔNG KẾT
            </div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
              {(submission.finalScore || 0).toFixed(1)}
            </div>
            <div style={{ fontSize: '18px', opacity: 0.9 }}>/ 10 điểm</div>
            <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: '500' }}>
              {getScoreLabel(submission.finalScore || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3 className="card-title">📈 Chi Tiết Điểm Số</h3>
        </div>
        <div className="card-body">
          <div style={{ marginBottom: '20px' }}>
            <div className="flex justify-between align-center" style={{ marginBottom: '8px' }}>
              <span>Điểm nội dung (70%)</span>
              <strong style={{ fontSize: '18px', color: getScoreColor(contentScore) }}>
                {(contentScore * 0.7).toFixed(1)} điểm
              </strong>
            </div>
            <div className="progress">
              <div
                className="progress-bar"
                style={{
                  width: `${(contentScore / 10) * 100}%`,
                  background: getScoreColor(contentScore),
                }}
              ></div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div className="flex justify-between align-center" style={{ marginBottom: '8px' }}>
              <span>Kỹ năng sử dụng AI (30%)</span>
              <strong
                style={{ fontSize: '18px', color: getScoreColor(submission.aiSkillScore || 0) }}
              >
                {((submission.aiSkillScore || 0) * 0.3).toFixed(1)} điểm
              </strong>
            </div>
            <div className="progress">
              <div
                className="progress-bar"
                style={{
                  width: `${((submission.aiSkillScore || 0) / 10) * 100}%`,
                  background: getScoreColor(submission.aiSkillScore || 0),
                }}
              ></div>
            </div>
          </div>

          <div style={{ borderTop: '2px solid var(--gray-200)', paddingTop: '16px' }}>
            <div className="flex justify-between align-center">
              <span style={{ fontSize: '18px', fontWeight: '600' }}>Tổng điểm</span>
              <strong
                style={{ fontSize: '24px', color: getScoreColor(submission.finalScore || 0) }}
              >
                {(submission.finalScore || 0).toFixed(1)} / 10
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* AI Usage Summary - NEW: Using AISkillBadges Component */}
      {submission.aiInteractionSummary && (
        <AISkillBadges
          aiInteractionSummary={submission.aiInteractionSummary}
          aiSkillScore={submission.aiSkillScore || 0}
          aiSkillScoreWeight={0.3}
        />
      )}

      {/* Feedback */}
      {submission.feedback && (
        <div className="alert alert-info" style={{ marginTop: '20px' }}>
          <span style={{ fontSize: '24px' }}>💬</span>
          <div>
            <strong>Phản hồi từ hệ thống:</strong>
            <p style={{ marginTop: '8px', marginBottom: 0, whiteSpace: 'pre-line' }}>
              {submission.feedback}
            </p>
          </div>
        </div>
      )}

      {/* Answers Review */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="flex justify-between align-center">
            <h3 className="card-title">📝 Xem Lại Đáp Án</h3>
            <button onClick={() => setShowAnswers(!showAnswers)} className="btn btn-outline btn-sm">
              {showAnswers ? '👁️ Ẩn đáp án' : '👁️ Xem đáp án'}
            </button>
          </div>
        </div>

        {showAnswers && (
          <div className="card-body">
            {assignment.questions.map((question, idx) => {
              const answer = submission.answers.find(a => a.questionId === question._id);
              const isCorrect = answer?.isCorrect;

              return (
                <div
                  key={idx}
                  style={{
                    padding: '20px',
                    marginBottom: '16px',
                    border: `2px solid ${isCorrect === true ? 'var(--success-color)' : isCorrect === false ? 'var(--danger-color)' : 'var(--gray-300)'}`,
                    borderRadius: 'var(--border-radius)',
                    background:
                      isCorrect === true
                        ? 'var(--success-light)'
                        : isCorrect === false
                          ? 'var(--danger-light)'
                          : 'var(--white)',
                  }}
                >
                  <div
                    className="flex justify-between align-center"
                    style={{ marginBottom: '12px' }}
                  >
                    <h4 style={{ marginBottom: 0 }}>
                      Câu {idx + 1}
                      {isCorrect === true && ' ✅'}
                      {isCorrect === false && ' ❌'}
                      {isCorrect === null && ' ⏳'}
                    </h4>
                    <span className="badge badge-info">{question.points} điểm</span>
                  </div>

                  <p style={{ fontSize: '16px', marginBottom: '16px' }}>{question.question}</p>

                  {question.type === 'multiple-choice' && (
                    <>
                      <div style={{ marginBottom: '12px' }}>
                        <strong>Đáp án của bạn:</strong>{' '}
                        <span
                          style={{
                            padding: '4px 12px',
                            background: isCorrect ? 'var(--success-color)' : 'var(--danger-color)',
                            color: 'white',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                          }}
                        >
                          {answer?.answer || 'Không trả lời'}
                        </span>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <strong>Đáp án đúng:</strong>{' '}
                        <span
                          style={{
                            padding: '4px 12px',
                            background: 'var(--success-color)',
                            color: 'white',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                          }}
                        >
                          {question.correctAnswer}
                        </span>
                      </div>

                      {question.explanation && (
                        <div
                          style={{
                            background: 'var(--info-light)',
                            padding: '12px',
                            borderRadius: '4px',
                            marginTop: '12px',
                          }}
                        >
                          <strong>💡 Giải thích:</strong> {question.explanation}
                        </div>
                      )}
                    </>
                  )}

                  {question.type === 'essay' && (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        <strong>Câu trả lời của bạn:</strong>
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '12px',
                            background: 'var(--gray-50)',
                            borderRadius: '4px',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {answer?.answer || 'Không trả lời'}
                        </div>
                      </div>

                      {isCorrect === null && (
                        <div className="alert alert-warning" style={{ marginTop: '12px' }}>
                          <span style={{ fontSize: '20px' }}>⏳</span>
                          <div>
                            <strong>Đang chờ giảng viên chấm điểm</strong>
                          </div>
                        </div>
                      )}

                      {answer?.feedback && (
                        <div className="alert alert-info" style={{ marginTop: '12px' }}>
                          <span style={{ fontSize: '20px' }}>💬</span>
                          <div>
                            <strong>Nhận xét của giảng viên:</strong>
                            <p style={{ marginTop: '8px', marginBottom: 0 }}>{answer.feedback}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {answer?.aiInteractionCount > 0 && (
                    <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--gray-600)' }}>
                      🤖 Bạn đã hỏi AI {answer.aiInteractionCount} lần cho câu này
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2" style={{ marginTop: '20px', justifyContent: 'center' }}>
        <button onClick={() => navigate('/student/assignments')} className="btn btn-primary">
          ← Quay lại danh sách bài tập
        </button>
      </div>
    </div>
  );
}

export default StudentResultsPage;
