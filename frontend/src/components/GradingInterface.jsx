import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';
import './GradingInterface.css';

/**
 * GradingInterface Component
 * Interface để giảng viên chấm bài tự luận
 *
 * Features:
 * - Hiển thị câu hỏi essay + câu trả lời của sinh viên
 * - Hiển thị rubric (tiêu chí chấm điểm)
 * - Nhập điểm (0 - max points)
 * - Nhập feedback chi tiết
 * - POST /api/submission/:id/grade (instructor only)
 * - Auto-save draft grades
 */
function GradingInterface({ submissionId, onGradingComplete = null }) {
  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [essayQuestions, setEssayQuestions] = useState([]);
  const [grades, setGrades] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Load submission data
  useEffect(() => {
    if (submissionId) {
      loadSubmission();
    }
  }, [submissionId]);

  // Load submission and extract essay questions
  const loadSubmission = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/submission/${submissionId}`);
      const subData = response.data.submission;

      setSubmission(subData);

      // Get assignment details
      // assignmentId can be a string ID or populated object
      const assignmentId =
        typeof subData.assignmentId === 'object' ? subData.assignmentId._id : subData.assignmentId;

      const assignmentRes = await api.get(`/assignment/${assignmentId}`);
      const assignmentData = assignmentRes.data.assignment;
      setAssignment(assignmentData);

      // Filter essay questions
      const essays = assignmentData.questions.filter(q => q.type === 'essay');
      setEssayQuestions(essays);

      // Initialize grades from existing answers
      const initialGrades = {};
      essays.forEach(question => {
        const answer = subData.answers?.find(a => a.questionId === question._id);
        initialGrades[question._id] = {
          points: answer?.pointsEarned || 0,
          feedback: answer?.feedback || '',
        };
      });
      setGrades(initialGrades);

      console.log('✅ Submission loaded', {
        essays: essays.length,
        submission: subData._id,
      });
    } catch (err) {
      console.error('❌ Failed to load submission:', err);
      setError(err.response?.data?.error || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  // Update grade for a question
  const updateGrade = (questionId, field, value) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      },
    }));
  };

  // Save grades to backend
  const handleSaveGrades = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage('');

    try {
      // Prepare grading data
      const gradingData = {
        grades: Object.entries(grades).map(([questionId, grade]) => ({
          questionId,
          pointsEarned: parseFloat(grade.points) || 0,
          feedback: grade.feedback || '',
        })),
      };

      // Call API
      const response = await api.post(`/submission/${submissionId}/grade`, gradingData);

      setSuccessMessage('✅ Grades saved successfully!');

      console.log('✅ Grades saved', {
        submissionId,
        gradesCount: gradingData.grades.length,
      });

      // Notify parent component
      if (onGradingComplete) {
        onGradingComplete(response.data);
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('❌ Failed to save grades:', err);
      setError(err.response?.data?.error || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  // Navigate between questions
  const goToQuestion = index => {
    setCurrentQuestionIndex(index);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < essayQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Calculate total points
  const calculateTotalPoints = () => {
    return Object.values(grades).reduce((sum, grade) => sum + (parseFloat(grade.points) || 0), 0);
  };

  const calculateMaxPoints = () => {
    return essayQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
  };

  // Check if all graded
  const isAllGraded = () => {
    return essayQuestions.every(q => {
      const grade = grades[q._id];
      return grade && grade.points !== undefined && grade.points !== '';
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="grading-interface">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading submission...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !submission) {
    return (
      <div className="grading-interface">
        <div className="error-container">
          <h3>❌ Error Loading Submission</h3>
          <p>{error}</p>
          <button onClick={loadSubmission} className="retry-button">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // No essay questions
  if (essayQuestions.length === 0) {
    return (
      <div className="grading-interface">
        <div className="empty-container">
          <div className="empty-icon">📝</div>
          <h3>No Essay Questions</h3>
          <p>This assignment has no essay questions to grade.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = essayQuestions[currentQuestionIndex];
  const currentAnswer = submission.answers?.find(a => a.questionId === currentQuestion._id);
  const currentGrade = grades[currentQuestion._id] || { points: 0, feedback: '' };

  return (
    <div className="grading-interface">
      {/* Header */}
      <div className="grading-header">
        <div className="header-left">
          <h2>✍️ Grade Essay Questions</h2>
          <p className="student-info">
            Student: <strong>{submission.studentName || 'Unknown'}</strong>
            {submission.studentEmail && ` (${submission.studentEmail})`}
          </p>
          <p className="assignment-info">
            Assignment: <strong>{assignment?.title || 'N/A'}</strong>
          </p>
        </div>

        <div className="header-right">
          <div className="progress-info">
            <span className="progress-label">Progress:</span>
            <span className="progress-value">
              {Object.values(grades).filter(g => g.points !== undefined && g.points !== '').length}{' '}
              / {essayQuestions.length}
            </span>
          </div>
          <div className="total-score">
            <span className="score-label">Total Score:</span>
            <span className="score-value">
              {calculateTotalPoints()} / {calculateMaxPoints()}
            </span>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && <div className="success-banner">{successMessage}</div>}

      {error && <div className="error-banner">❌ {error}</div>}

      {/* Question Navigation */}
      <div className="question-navigation">
        {essayQuestions.map((q, idx) => {
          const grade = grades[q._id];
          const isGraded = grade && grade.points !== undefined && grade.points !== '';

          return (
            <button
              key={q._id}
              className={`nav-pill ${idx === currentQuestionIndex ? 'active' : ''} ${isGraded ? 'graded' : ''}`}
              onClick={() => goToQuestion(idx)}
            >
              Q{idx + 1}
              {isGraded && <span className="check-icon">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grading-content">
        {/* Question Section */}
        <div className="question-section">
          <div className="section-header">
            <h3>📝 Question {currentQuestionIndex + 1}</h3>
            <span className="points-badge">{currentQuestion.points} points</span>
          </div>

          <div className="question-text">{currentQuestion.question}</div>

          {/* Rubric */}
          {currentQuestion.rubric && (
            <div className="rubric-section">
              <h4>📋 Grading Rubric:</h4>
              <div className="rubric-text">{currentQuestion.rubric}</div>
            </div>
          )}
        </div>

        {/* Student Answer */}
        <div className="answer-section">
          <div className="section-header">
            <h3>👤 Student Answer</h3>
            <span className="word-count">
              {currentAnswer?.answer ? currentAnswer.answer.split(/\s+/).length : 0} words
            </span>
          </div>

          <div className="answer-text">
            {currentAnswer?.answer || <span className="no-answer">No answer provided</span>}
          </div>
        </div>

        {/* Grading Form */}
        <div className="grading-form">
          <h3>⭐ Your Grading</h3>

          {/* Points Input */}
          <div className="form-group">
            <label>Points Earned:</label>
            <div className="points-input-group">
              <input
                type="number"
                min="0"
                max={currentQuestion.points}
                step="0.5"
                value={currentGrade.points}
                onChange={e => updateGrade(currentQuestion._id, 'points', e.target.value)}
                className="points-input"
              />
              <span className="points-max">/ {currentQuestion.points}</span>
            </div>
            <div className="points-slider">
              <input
                type="range"
                min="0"
                max={currentQuestion.points}
                step="0.5"
                value={currentGrade.points}
                onChange={e => updateGrade(currentQuestion._id, 'points', e.target.value)}
              />
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="form-group">
            <label>Feedback for Student:</label>
            <textarea
              value={currentGrade.feedback}
              onChange={e => updateGrade(currentQuestion._id, 'feedback', e.target.value)}
              placeholder="Provide detailed feedback on the student's answer..."
              rows={8}
              className="feedback-textarea"
            />
            <div className="textarea-info">{currentGrade.feedback.length} characters</div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="grading-actions">
        <div className="left-actions">
          <button
            onClick={previousQuestion}
            disabled={currentQuestionIndex === 0}
            className="nav-button"
          >
            ← Previous
          </button>

          {currentQuestionIndex < essayQuestions.length - 1 && (
            <button onClick={nextQuestion} className="nav-button">
              Next →
            </button>
          )}
        </div>

        <div className="right-actions">
          <button onClick={handleSaveGrades} disabled={saving} className="save-button">
            {saving ? '⏳ Saving...' : '💾 Save Grades'}
          </button>

          {isAllGraded() && (
            <button onClick={handleSaveGrades} disabled={saving} className="submit-button">
              {saving ? '⏳ Submitting...' : '✅ Submit All Grades'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

GradingInterface.propTypes = {
  submissionId: PropTypes.string.isRequired,
  onGradingComplete: PropTypes.func,
};

export default GradingInterface;
