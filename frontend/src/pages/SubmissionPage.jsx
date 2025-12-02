import { useParams } from 'react-router-dom';
import './SubmissionPage.css';

function SubmissionPage() {
  const { id } = useParams();

  return (
    <div className="submission-page">
      <div className="submission-header">
        <h1>✍️ Submission Workspace</h1>
        <p>Submission ID: {id}</p>
      </div>

      <div className="submission-content">
        <div className="submission-main">
          <div className="question-section">
            <h2>Current Question</h2>
            <p className="placeholder-text">Loading question...</p>
          </div>

          <div className="answer-section">
            <h3>Your Answer</h3>
            <textarea
              className="answer-input"
              placeholder="Type your answer here..."
              rows="6"
            ></textarea>
          </div>

          <div className="submission-actions">
            <button className="btn btn-secondary">Save Draft</button>
            <button className="btn btn-primary">Next Question</button>
          </div>
        </div>

        <div className="submission-sidebar">
          <div className="ai-chat-box">
            <h3>🤖 AI Assistant</h3>
            <p className="placeholder-text">Ask AI for help...</p>
          </div>

          <div className="progress-box">
            <h3>Progress</h3>
            <p className="placeholder-text">0/0 questions answered</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubmissionPage;
