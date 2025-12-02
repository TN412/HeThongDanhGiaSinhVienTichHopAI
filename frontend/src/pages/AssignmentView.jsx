import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAssignment } from '../contexts/AssignmentContext';
import AIChat from '../components/AIChat';
import './AssignmentView.css';

/**
 * AssignmentView
 * Màn hình làm bài tập cho sinh viên
 *
 * Features:
 * - Hiển thị câu hỏi (multiple-choice hoặc essay)
 * - Navigation giữa các câu hỏi
 * - AI Chat panel
 * - Auto-save draft mỗi 30s (từ AssignmentContext)
 * - Progress tracking
 */
function AssignmentView() {
  const { id: submissionId } = useParams();
  const navigate = useNavigate();

  const {
    submission,
    assignment,
    currentQuestionIndex,
    loading,
    error,
    loadAssignment,
    loadSubmission,
    updateAnswer,
    saveManually,
    submitAssignment,
    nextQuestion,
    previousQuestion,
    goToQuestion,
  } = useAssignment();

  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Load submission on mount
  useEffect(() => {
    if (submissionId) {
      loadSubmissionData();
    }
  }, [submissionId]);

  const loadSubmissionData = async () => {
    try {
      const sub = await loadSubmission(submissionId);

      // Load assignment data if not loaded
      if (!assignment && sub.assignmentId) {
        await loadAssignment(sub.assignmentId);
      }
    } catch (err) {
      console.error('Failed to load submission:', err);
    }
  };

  // Update current answer when question changes
  useEffect(() => {
    if (!submission || !assignment) return;

    const question = assignment.questions[currentQuestionIndex];
    if (!question) return;

    // Find existing answer
    const existingAnswer = submission.answers?.find(a => a.questionId === question._id);

    setCurrentAnswer(existingAnswer?.answer || '');
  }, [currentQuestionIndex, submission, assignment]);

  // Handle answer change
  const handleAnswerChange = value => {
    setCurrentAnswer(value);

    const question = assignment.questions[currentQuestionIndex];
    if (question) {
      updateAnswer(question._id, value);
    }
  };

  // Manual save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveManually();
      alert('✅ Đã lưu nháp thành công!');
    } catch (err) {
      alert('❌ Lỗi khi lưu: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Submit assignment
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitAssignment();

      alert(
        `✅ Nộp bài thành công!\n\nĐiểm số:\n- Nội dung: ${result.totalScore}/${result.maxScore}\n- AI Skill: ${result.aiSkillScore}/10\n- Tổng: ${result.finalScore}/10`
      );

      // Navigate to review page
      navigate(`/review/${submissionId}`);
    } catch (err) {
      alert('❌ Lỗi khi nộp bài: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  // Navigate to next question
  const handleNext = () => {
    nextQuestion();
  };

  // Navigate to previous question
  const handlePrevious = () => {
    previousQuestion();
  };

  // Check if all questions answered
  const getAnsweredCount = () => {
    if (!submission || !assignment) return 0;
    return submission.answers?.filter(a => a.answer && a.answer.trim()).length || 0;
  };

  // Loading state
  if (loading && !assignment) {
    return (
      <div className="assignment-view">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải bài tập...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="assignment-view">
        <div className="error-container">
          <h2>❌ Lỗi</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/student/assignments')}>Quay lại danh sách</button>
        </div>
      </div>
    );
  }

  // No data state
  if (!submission || !assignment) {
    return (
      <div className="assignment-view">
        <div className="error-container">
          <h2>⚠️ Không tìm thấy bài tập</h2>
          <button onClick={() => navigate('/student/assignments')}>Quay lại danh sách</button>
        </div>
      </div>
    );
  }

  // Check if submitted
  if (submission.status === 'submitted') {
    return (
      <div className="assignment-view">
        <div className="submitted-container">
          <h2>✅ Bài tập đã nộp</h2>
          <p>Bạn đã nộp bài tập này rồi. Không thể chỉnh sửa.</p>
          <button onClick={() => navigate(`/review/${submissionId}`)}>Xem kết quả</button>
        </div>
      </div>
    );
  }

  const currentQuestion = assignment.questions[currentQuestionIndex];
  const totalQuestions = assignment.questions.length;
  const answeredCount = getAnsweredCount();
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <div className="assignment-view">
      {/* Header */}
      <div className="assignment-header">
        <div className="header-content">
          <h1>{assignment.title}</h1>
          <div className="header-info">
            <span className="info-badge">
              📝 {answeredCount}/{totalQuestions} câu đã trả lời
            </span>
            <span className="info-badge auto-save">💾 Tự động lưu mỗi 30s</span>
          </div>
        </div>
      </div>

      <div className="assignment-content">
        {/* Main Question Area */}
        <div className="question-area">
          {/* Question Progress */}
          <div className="question-progress">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
            <p className="progress-text">
              Câu {currentQuestionIndex + 1} / {totalQuestions}
            </p>
          </div>

          {/* Question Navigation Pills */}
          <div className="question-pills">
            {assignment.questions.map((q, idx) => {
              const hasAnswer = submission.answers?.find(
                a => a.questionId === q._id && a.answer && a.answer.trim()
              );

              return (
                <button
                  key={q._id}
                  className={`pill ${idx === currentQuestionIndex ? 'active' : ''} ${hasAnswer ? 'answered' : ''}`}
                  onClick={() => goToQuestion(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Question Card */}
          <div className="question-card">
            <div className="question-header">
              <h2>Câu {currentQuestionIndex + 1}</h2>
              <span className="question-type">
                {currentQuestion.type === 'multiple-choice' ? '📋 Trắc nghiệm' : '✍️ Tự luận'}
              </span>
              <span className="question-points">{currentQuestion.points} điểm</span>
            </div>

            <div className="question-text">{currentQuestion.question}</div>

            {/* Answer Section */}
            <div className="answer-section">
              {currentQuestion.type === 'multiple-choice' ? (
                // Multiple Choice Options
                <div className="options-list">
                  {currentQuestion.options.map((option, idx) => (
                    <label key={idx} className="option-item">
                      <input
                        type="radio"
                        name={`question-${currentQuestion._id}`}
                        value={option}
                        checked={currentAnswer === option}
                        onChange={e => handleAnswerChange(e.target.value)}
                      />
                      <span className="option-label">{String.fromCharCode(65 + idx)}.</span>
                      <span className="option-text">{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                // Essay Textarea
                <div className="essay-area">
                  <textarea
                    className="essay-textarea"
                    placeholder="Nhập câu trả lời của bạn..."
                    value={currentAnswer}
                    onChange={e => handleAnswerChange(e.target.value)}
                    rows={12}
                  />
                  <div className="essay-info">
                    <span>{currentAnswer.length} ký tự</span>
                    {currentQuestion.rubric && (
                      <button
                        className="rubric-button"
                        onClick={() => alert(currentQuestion.rubric)}
                      >
                        📋 Xem tiêu chí chấm điểm
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="navigation-buttons">
            <button
              className="nav-button"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              ← Câu trước
            </button>

            <button className="save-button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? '⏳ Đang lưu...' : '💾 Lưu nháp'}
            </button>

            {!isLastQuestion ? (
              <button className="nav-button" onClick={handleNext}>
                Câu tiếp →
              </button>
            ) : (
              <button className="submit-button" onClick={() => setShowSubmitConfirm(true)}>
                ✅ Nộp bài
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Chat Popup */}
      {assignment.allowAI && (
        <AIChat
          submissionId={submissionId}
          questionId={currentQuestion._id}
          questionText={currentQuestion.question}
          currentAnswer={currentAnswer}
        />
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="modal-overlay" onClick={() => setShowSubmitConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>⚠️ Xác nhận nộp bài</h2>
            <p>
              Bạn đã trả lời{' '}
              <strong>
                {answeredCount}/{totalQuestions}
              </strong>{' '}
              câu hỏi.
            </p>
            <p>Sau khi nộp bài, bạn sẽ không thể chỉnh sửa.</p>
            <p>
              <strong>Bạn có chắc chắn muốn nộp bài không?</strong>
            </p>

            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={isSubmitting}
              >
                ❌ Hủy
              </button>
              <button className="confirm-button" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? '⏳ Đang nộp...' : '✅ Nộp bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssignmentView;
