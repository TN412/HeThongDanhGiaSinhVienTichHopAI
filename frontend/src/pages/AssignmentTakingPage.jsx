import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AIChat from '../components/AIChat';
import api from '../utils/api';
import '../styles/global.css';

function AssignmentTakingPage() {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const autoSaveTimerRef = useRef(null);

  // Fetch submission data
  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/submission/${submissionId}`);
      const submissionData = response.data.submission;

      setSubmission(submissionData);
      setAssignment(submissionData.assignmentId);

      // Load existing answers
      const existingAnswers = {};
      submissionData.answers.forEach(ans => {
        existingAnswers[ans.questionId] = ans.answer || '';
      });
      setAnswers(existingAnswers);

      console.log('✅ Loaded submission:', submissionData);
    } catch (err) {
      console.error('❌ Error loading submission:', err);
      setError(err.response?.data?.error || 'Không thể tải bài làm');
    } finally {
      setLoading(false);
    }
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!submission || submission.status !== 'draft') return;

    autoSaveTimerRef.current = setInterval(() => {
      saveDraft(false); // silent save
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [submission, answers]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = e => {
      if (submission && submission.status === 'draft') {
        e.preventDefault();
        e.returnValue = '';
        saveDraft(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submission, answers]);

  const saveDraft = useCallback(
    async (showMessage = false) => {
      if (!submission || submission.status !== 'draft') return;

      try {
        setSaving(true);

        const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer: answer || '',
        }));

        await api.put(`/submission/${submissionId}`, {
          answers: formattedAnswers,
        });

        setLastSaved(new Date());
        console.log('💾 Auto-saved at', new Date().toLocaleTimeString());

        if (showMessage) {
          alert('💾 Đã lưu nháp thành công!');
        }
      } catch (err) {
        console.error('❌ Save failed:', err);
        if (showMessage) {
          alert('❌ Lưu thất bại: ' + (err.response?.data?.error || err.message));
        }
      } finally {
        setSaving(false);
      }
    },
    [submissionId, submission, answers]
  );

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    // Check if all questions answered
    const unansweredCount = assignment.questions.filter(
      q => !answers[q._id] || answers[q._id].trim() === ''
    ).length;

    if (unansweredCount > 0) {
      if (
        !window.confirm(`⚠️ Bạn còn ${unansweredCount} câu chưa trả lời. Bạn có chắc muốn nộp bài?`)
      ) {
        return;
      }
    }

    if (!window.confirm('📤 Xác nhận nộp bài? Sau khi nộp bạn không thể chỉnh sửa!')) {
      return;
    }

    try {
      // Save draft first
      await saveDraft(false);

      // Submit
      const response = await api.post(`/submission/${submissionId}/submit`);
      const results = response.data.results;

      alert(
        `✅ Nộp bài thành công!\n\n` +
          `📊 Điểm nội dung: ${results.contentScore}/10\n` +
          `🤖 Điểm AI Skill: ${results.aiSkillScore}/10\n` +
          `🎯 Điểm tổng: ${results.finalScore}/10`
      );
      navigate(`/student/results/${submissionId}`);
    } catch (err) {
      console.error('❌ Submit failed:', err);
      alert('❌ Nộp bài thất bại: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < assignment.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      window.scrollTo(0, 0);
    }
  };

  const getAnsweredCount = () => {
    return Object.values(answers).filter(a => a && a.trim() !== '').length;
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div className="loading loading-lg"></div>
        <h3 style={{ marginTop: '20px' }}>Đang tải bài tập...</h3>
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

  if (!assignment || !submission) {
    return (
      <div className="container">
        <div className="alert alert-warning">
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <strong>Không tìm thấy bài tập</strong>
          </div>
        </div>
      </div>
    );
  }

  if (submission.status === 'submitted' || submission.status === 'graded') {
    return (
      <div className="container">
        <div className="alert alert-info">
          <span style={{ fontSize: '24px' }}>ℹ️</span>
          <div>
            <strong>Bài tập đã nộp</strong>
            <p style={{ marginBottom: '8px' }}>Bạn đã nộp bài tập này rồi.</p>
            <button
              onClick={() => navigate(`/student/results/${submissionId}`)}
              className="btn btn-primary btn-sm"
            >
              📊 Xem kết quả
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = assignment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assignment.questions.length) * 100;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gray-50)' }}>
      {/* Main Content */}
      <div style={{ flex: 1, padding: '20px' }}>
        <div className="container-narrow">
          {/* Header */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-body">
              <div className="flex justify-between align-center" style={{ marginBottom: '12px' }}>
                <h2 style={{ marginBottom: 0 }}>{assignment.title}</h2>
                {lastSaved && (
                  <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                    💾 Lưu lần cuối: {lastSaved.toLocaleTimeString('vi-VN')}
                  </span>
                )}
              </div>

              <p style={{ color: 'var(--gray-600)', marginBottom: '12px' }}>
                {assignment.description}
              </p>

              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <span className="badge badge-primary">
                  Câu {currentQuestionIndex + 1}/{assignment.questions.length}
                </span>
                <span className="badge badge-info">
                  {getAnsweredCount()}/{assignment.questions.length} đã trả lời
                </span>
                {assignment.settings?.allowAI && (
                  <span className="badge badge-success">🤖 Cho phép AI</span>
                )}
              </div>

              <div className="progress" style={{ marginTop: '16px' }}>
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between align-center">
                <h3 className="card-title">
                  Câu {currentQuestionIndex + 1}
                  {currentQuestion.type === 'multiple-choice' && ' 🔘'}
                  {currentQuestion.type === 'essay' && ' ✍️'}
                </h3>
                <span className="badge badge-info" style={{ fontSize: '16px' }}>
                  {currentQuestion.points} điểm
                </span>
              </div>
            </div>

            <div className="card-body">
              <p style={{ fontSize: '18px', lineHeight: '1.8', marginBottom: '24px' }}>
                {currentQuestion.question}
              </p>

              {/* Multiple Choice */}
              {currentQuestion.type === 'multiple-choice' && (
                <div className="form-group">
                  {currentQuestion.options?.map((option, idx) => {
                    const optionLetter = option.charAt(0);
                    const isSelected = answers[currentQuestion._id] === optionLetter;

                    return (
                      <label
                        key={idx}
                        style={{
                          display: 'block',
                          padding: '16px',
                          margin: '12px 0',
                          background: isSelected ? 'var(--primary-light)' : 'var(--white)',
                          border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--gray-300)'}`,
                          borderRadius: 'var(--border-radius)',
                          cursor: 'pointer',
                          transition: 'var(--transition)',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected)
                            e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.borderColor = 'var(--gray-300)';
                        }}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion._id}`}
                          value={optionLetter}
                          checked={isSelected}
                          onChange={e => handleAnswerChange(currentQuestion._id, e.target.value)}
                          style={{
                            marginRight: '12px',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                          }}
                        />
                        <span style={{ fontSize: '16px' }}>{option}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Essay */}
              {currentQuestion.type === 'essay' && (
                <div className="form-group">
                  {currentQuestion.rubric && (
                    <div className="alert alert-info" style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '20px' }}>📋</span>
                      <div>
                        <strong>Tiêu chí chấm điểm:</strong>
                        <p style={{ marginBottom: 0, marginTop: '8px' }}>
                          {currentQuestion.rubric}
                        </p>
                      </div>
                    </div>
                  )}

                  <textarea
                    value={answers[currentQuestion._id] || ''}
                    onChange={e => handleAnswerChange(currentQuestion._id, e.target.value)}
                    placeholder="Nhập câu trả lời của bạn..."
                    className="form-control"
                    rows={12}
                    style={{ fontSize: '16px', lineHeight: '1.6' }}
                  />

                  <div className="form-help">
                    {answers[currentQuestion._id]?.length || 0} ký tự
                    {currentQuestion.estimatedTime &&
                      ` • Thời gian ước tính: ${currentQuestion.estimatedTime} phút`}
                  </div>
                </div>
              )}
            </div>

            <div className="card-footer">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="btn btn-secondary"
              >
                ← Câu trước
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => saveDraft(true)}
                  disabled={saving}
                  className="btn btn-outline"
                >
                  {saving ? '💾 Đang lưu...' : '💾 Lưu nháp'}
                </button>

                {currentQuestionIndex < assignment.questions.length - 1 ? (
                  <button onClick={handleNext} className="btn btn-primary">
                    Câu tiếp →
                  </button>
                ) : (
                  <button onClick={handleSubmit} className="btn btn-success btn-lg">
                    📤 Nộp bài
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-body">
              <h4 style={{ marginBottom: '16px' }}>Danh sách câu hỏi</h4>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {assignment.questions.map((q, idx) => {
                  const isAnswered = answers[q._id] && answers[q._id].trim() !== '';
                  const isCurrent = idx === currentQuestionIndex;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        window.scrollTo(0, 0);
                      }}
                      style={{
                        width: '48px',
                        height: '48px',
                        border: `2px solid ${isCurrent ? 'var(--primary-color)' : 'var(--gray-300)'}`,
                        background: isAnswered ? 'var(--success-light)' : 'var(--white)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        transition: 'var(--transition)',
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Popup */}
      {assignment.settings?.allowAI && (
        <AIChat submissionId={submissionId} questionId={currentQuestion._id} />
      )}
    </div>
  );
}

export default AssignmentTakingPage;
