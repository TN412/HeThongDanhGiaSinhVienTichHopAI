import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import GradingInterface from '../components/GradingInterface';
import '../styles/global.css';

/**
 * GradingPage
 * Trang chấm điểm essay questions thủ công
 * Instructor only
 */
function GradingPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [isGrading, setIsGrading] = useState(true);

  const handleGradingComplete = () => {
    setIsGrading(false);

    // Show success message
    setTimeout(() => {
      if (window.confirm('✅ Chấm điểm thành công! Quay lại Dashboard?')) {
        navigate('/instructor/dashboard');
      }
    }, 500);
  };

  const handleCancel = () => {
    if (window.confirm('❓ Bạn có chắc muốn hủy? Các thay đổi chưa lưu sẽ bị mất.')) {
      navigate('/instructor/dashboard');
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between align-center">
            <div>
              <h1 className="card-title">✍️ Chấm Bài Tự Luận</h1>
              <p style={{ color: 'var(--gray-600)', marginBottom: 0 }}>
                Chấm điểm và gửi feedback cho từng câu hỏi tự luận
              </p>
            </div>
            <button onClick={handleCancel} className="btn btn-outline" disabled={!isGrading}>
              ← Quay lại Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="alert alert-info" style={{ marginTop: '20px' }}>
        <span style={{ fontSize: '20px' }}>📝</span>
        <div>
          <strong>Hướng dẫn chấm điểm:</strong>
          <ol style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
            <li>Đọc kỹ câu trả lời của sinh viên</li>
            <li>Đối chiếu với rubric (tiêu chí chấm điểm)</li>
            <li>Nhập điểm (0 đến điểm tối đa của câu)</li>
            <li>Viết feedback chi tiết để sinh viên hiểu được điểm mạnh/yếu</li>
            <li>Click "Lưu điểm" cho mỗi câu</li>
          </ol>
        </div>
      </div>

      {/* Grading Interface */}
      <div style={{ marginTop: '20px' }}>
        <GradingInterface submissionId={submissionId} onGradingComplete={handleGradingComplete} />
      </div>

      {/* Grading Tips */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3 className="card-title">💡 Tips Chấm Điểm Hiệu Quả</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-2">
            <div>
              <h4 style={{ color: 'var(--success-color)', marginBottom: '12px' }}>✅ Nên làm</h4>
              <ul style={{ paddingLeft: '20px' }}>
                <li>Chấm theo rubric thống nhất cho tất cả sinh viên</li>
                <li>Ghi rõ lý do trừ điểm</li>
                <li>Đưa ra feedback xây dựng</li>
                <li>Khuyến khích điểm mạnh của sinh viên</li>
                <li>Suggest cách cải thiện cụ thể</li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: 'var(--danger-color)', marginBottom: '12px' }}>❌ Tránh</h4>
              <ul style={{ paddingLeft: '20px' }}>
                <li>Chấm điểm không nhất quán giữa các sinh viên</li>
                <li>Feedback quá chung chung ("Good", "Bad")</li>
                <li>Chỉ tập trung vào lỗi mà không khen điểm tốt</li>
                <li>So sánh trực tiếp giữa các sinh viên</li>
                <li>Chấm điểm dựa trên cảm tính</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GradingPage;
