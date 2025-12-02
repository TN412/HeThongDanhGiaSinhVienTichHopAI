import { useParams, useNavigate } from 'react-router-dom';
import LogViewer from '../components/LogViewer';
import '../styles/global.css';

/**
 * AILogsViewerPage
 * Trang xem log tương tác AI của sinh viên trong bài làm
 * Instructor only
 */
function AILogsViewerPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="container">
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between align-center">
            <div>
              <h1 className="card-title">📊 Log Tương Tác AI</h1>
              <p style={{ color: 'var(--gray-600)', marginBottom: 0 }}>
                Xem chi tiết cách sinh viên sử dụng AI trong quá trình làm bài
              </p>
            </div>
            <button onClick={() => navigate('/instructor/dashboard')} className="btn btn-outline">
              ← Quay lại Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Log Viewer Component */}
      <div style={{ marginTop: '20px' }}>
        <LogViewer submissionId={submissionId} />
      </div>

      {/* Tips Card */}
      <div className="alert alert-info" style={{ marginTop: '20px' }}>
        <span style={{ fontSize: '20px' }}>💡</span>
        <div>
          <strong>Cách đọc log:</strong>
          <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
            <li>Xem số lần sinh viên hỏi AI cho mỗi câu hỏi</li>
            <li>Đánh giá chất lượng prompt (có context, độ dài, cụ thể)</li>
            <li>Phân tích mức độ độc lập (ít hỏi AI = độc lập cao)</li>
            <li>Xem pattern: Hỏi trước khi trả lời hay sau khi stuck</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AILogsViewerPage;
