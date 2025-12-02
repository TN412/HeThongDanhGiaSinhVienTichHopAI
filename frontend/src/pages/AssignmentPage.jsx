import { useParams } from 'react-router-dom';
import './AssignmentPage.css';

function AssignmentPage() {
  const { id } = useParams();

  return (
    <div className="assignment-page">
      <div className="assignment-header">
        <h1>📝 Assignment</h1>
        <p>Assignment ID: {id}</p>
      </div>

      <div className="assignment-content">
        <div className="assignment-info">
          <h2>Assignment Details</h2>
          <p className="placeholder-text">Loading assignment...</p>
        </div>

        <div className="assignment-questions">
          <h2>Questions</h2>
          <p className="placeholder-text">No questions available.</p>
        </div>

        <div className="assignment-actions">
          <button className="btn btn-primary">Start Assignment</button>
        </div>
      </div>
    </div>
  );
}

export default AssignmentPage;
