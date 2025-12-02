import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import './ReviewPage.css';

function ReviewPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [aiLogs, setAILogs] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    loadSubmissionDetails();
  }, [submissionId]);

  const loadSubmissionDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load submission and AI logs in parallel
      const [submissionRes, logsRes] = await Promise.all([
        api.get(`/submission/${submissionId}`),
        api.get(`/logs/submission/${submissionId}`),
      ]);

      setSubmission(submissionRes.data.submission);
      setAILogs(logsRes.data.logs || []);
      setFeedback(submissionRes.data.submission.feedback || '');

      console.log('✅ Loaded submission details:', {
        submissionId,
        studentName: submissionRes.data.submission.studentName,
        status: submissionRes.data.submission.status,
        logsCount: logsRes.data.logs?.length || 0,
      });
    } catch (err) {
      console.error('❌ Failed to load submission details:', err);
      setError(err.response?.data?.error || 'Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      alert('Please enter feedback before submitting.');
      return;
    }

    try {
      setSubmittingFeedback(true);

      await api.post(`/submission/${submissionId}/feedback`, {
        feedback: feedback.trim(),
      });

      alert('✅ Feedback submitted successfully!');
    } catch (err) {
      console.error('❌ Failed to submit feedback:', err);
      alert(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getScoreClass = (score, max) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'average';
    return 'poor';
  };

  if (loading) {
    return (
      <div className="review-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading submission details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-page">
        <div className="error-state">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="btn btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="review-page">
        <div className="error-state">
          <h2>⚠️ Not Found</h2>
          <p>Submission not found.</p>
          <button onClick={() => navigate(-1)} className="btn btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const assignment = submission.assignmentId || {};
  const totalPoints = assignment.totalPoints || 100;

  return (
    <div className="review-page">
      <div className="review-header">
        <button onClick={() => navigate(-1)} className="btn btn-back">
          ← Back to Dashboard
        </button>
        <div className="header-content">
          <h1>📊 Submission Review</h1>
          <div className="submission-meta">
            <div className="meta-item">
              <span className="meta-label">Student:</span>
              <span className="meta-value">{submission.studentName || 'Unknown'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Email:</span>
              <span className="meta-value">{submission.studentEmail || 'N/A'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Assignment:</span>
              <span className="meta-value">{assignment.title || 'N/A'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Status:</span>
              <span className={`status-badge ${submission.status}`}>
                {submission.status === 'submitted' ? '✅ Đã Nộp' : submission.status}
              </span>
            </div>
            {submission.submittedAt && (
              <div className="meta-item">
                <span className="meta-label">Submitted:</span>
                <span className="meta-value">
                  {new Date(submission.submittedAt).toLocaleString('vi-VN')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="review-content">
        {/* Score Summary */}
        <div className="review-score-card">
          <h2>Score Summary</h2>
          <div className="score-display">
            <div className="score-item">
              <span className="score-label">Content Score:</span>
              <span className={`score-value ${getScoreClass(submission.contentScore || 0, 10)}`}>
                {(submission.contentScore || 0).toFixed(1)}/10
              </span>
            </div>
            <div className="score-item">
              <span className="score-label">AI Skill Score:</span>
              <span className={`score-value ${getScoreClass(submission.aiSkillScore || 0, 10)}`}>
                {(submission.aiSkillScore || 0).toFixed(1)}/10
              </span>
            </div>
            <div className="score-item final-score">
              <span className="score-label">Final Score:</span>
              <span className={`score-value ${getScoreClass(submission.finalScore || 0, 10)}`}>
                {(submission.finalScore || 0).toFixed(1)}/10
              </span>
            </div>
          </div>
        </div>

        {/* Answers */}
        <div className="review-section">
          <h2>Answers ({submission.answers?.length || 0})</h2>
          {submission.answers && submission.answers.length > 0 ? (
            <div className="answers-list">
              {submission.answers.map((answer, index) => {
                const question = assignment.questions?.find(q => q._id === answer.questionId);
                return (
                  <div key={answer.questionId} className="answer-item">
                    <div className="answer-header">
                      <span className="question-number">Question {index + 1}</span>
                      {answer.isCorrect !== undefined && (
                        <span
                          className={`answer-status ${answer.isCorrect ? 'correct' : 'incorrect'}`}
                        >
                          {answer.isCorrect ? '✅ Correct' : '❌ Incorrect'}
                        </span>
                      )}
                      {answer.pointsEarned !== undefined && (
                        <span className="points-earned">
                          {answer.pointsEarned}/{question?.points || 0} points
                        </span>
                      )}
                    </div>
                    <div className="question-text">
                      <strong>Q:</strong> {question?.question || 'Question not found'}
                    </div>
                    <div className="answer-text">
                      <strong>A:</strong> {answer.answer || '(No answer provided)'}
                    </div>
                    {question?.type === 'multiple-choice' && question.correctAnswer && (
                      <div className="correct-answer">
                        <strong>Correct Answer:</strong> {question.correctAnswer}
                      </div>
                    )}
                    {answer.aiInteractionCount > 0 && (
                      <div className="ai-usage-info">
                        🪙 AI used {answer.aiInteractionCount} times for this question
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="placeholder-text">No answers submitted yet.</p>
          )}
        </div>

        {/* AI Interaction Logs */}
        <div className="review-section">
          <h2>
            AI Interaction Logs ({aiLogs.length})
            <button
              onClick={() => navigate(`/instructor/ai-logs/${submissionId}`)}
              className="btn btn-link"
            >
              View Detailed Logs →
            </button>
          </h2>
          {aiLogs.length > 0 ? (
            <div className="logs-summary">
              <div className="log-stat">
                <span className="stat-label">Total Prompts:</span>
                <span className="stat-value">{aiLogs.length}</span>
              </div>
              <div className="log-stat">
                <span className="stat-label">Avg Prompt Length:</span>
                <span className="stat-value">
                  {Math.round(
                    aiLogs.reduce((sum, log) => sum + log.prompt.length, 0) / aiLogs.length
                  )}{' '}
                  chars
                </span>
              </div>
              <div className="log-stat">
                <span className="stat-label">Independence Level:</span>
                <span className="stat-value">
                  {submission.aiInteractionSummary?.independenceLevel !== undefined
                    ? `${Math.round(submission.aiInteractionSummary.independenceLevel * 100)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <p className="placeholder-text">No AI interactions recorded.</p>
          )}
        </div>

        {/* Instructor Feedback */}
        <div className="review-section">
          <h2>Instructor Feedback</h2>
          <textarea
            className="feedback-input"
            placeholder="Provide feedback to student..."
            rows="6"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            disabled={submittingFeedback}
          ></textarea>
          <button
            className="btn btn-primary"
            onClick={handleSubmitFeedback}
            disabled={submittingFeedback || !feedback.trim()}
          >
            {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReviewPage;
