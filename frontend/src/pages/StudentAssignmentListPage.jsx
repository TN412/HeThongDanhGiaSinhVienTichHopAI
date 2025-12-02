import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import '../styles/global.css';

function StudentAssignmentListPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/assignment/list');
      setAssignments(response.data.assignments || []);
    } catch (err) {
      console.error('❌ Lỗi tải bài tập:', err);
      setError(err.response?.data?.error || 'Không thể tải danh sách bài tập');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssignment = async (assignmentId, title) => {
    if (!window.confirm(`📝 Bắt đầu làm bài: "${title}"?`)) {
      return;
    }

    try {
      const response = await api.post('/submission/start', { assignmentId });
      navigate(`/student/assignment/${response.data.submissionId}`);
    } catch (err) {
      console.error('❌ Lỗi bắt đầu bài tập:', err);
      alert('❌ Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    // Filter by type
    if (filterType !== 'all' && assignment.questionType !== filterType) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        assignment.title?.toLowerCase().includes(query) ||
        assignment.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const getQuestionTypeLabel = type => {
    switch (type) {
      case 'multiple-choice':
        return '🔘 Trắc nghiệm';
      case 'essay':
        return '✍️ Tự luận';
      case 'mixed':
        return '🔀 Hỗn hợp';
      default:
        return '📝 ' + type;
    }
  };

  const getDifficultyBadge = questions => {
    if (!questions || questions.length === 0) return null;
    const difficulty = questions[0]?.difficulty || 'medium';

    if (difficulty === 'easy') {
      return <span className="badge badge-success">😊 Dễ</span>;
    } else if (difficulty === 'hard') {
      return <span className="badge badge-danger">😰 Khó</span>;
    } else {
      return <span className="badge badge-warning">😐 Trung bình</span>;
    }
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
            <strong>Lỗi tải dữ liệu</strong>
            <p style={{ marginBottom: '8px' }}>{error}</p>
            <button onClick={fetchAssignments} className="btn btn-sm btn-outline">
              🔄 Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between align-center">
            <div>
              <h1 className="card-title">📚 Bài Tập Của Tôi</h1>
              <p style={{ color: 'var(--gray-600)', marginBottom: 0 }}>
                Tìm thấy {filteredAssignments.length} bài tập
              </p>
            </div>
            <button onClick={fetchAssignments} className="btn btn-outline btn-sm">
              🔄 Làm mới
            </button>
          </div>
        </div>

        <div className="card-body">
          {/* Filters */}
          <div className="flex gap-2" style={{ marginBottom: '24px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Tìm kiếm bài tập..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ flex: '1', minWidth: '250px' }}
            />

            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="form-control"
              style={{ width: 'auto' }}
            >
              <option value="all">🔘 Tất cả loại</option>
              <option value="multiple-choice">🔘 Trắc nghiệm</option>
              <option value="essay">✍️ Tự luận</option>
              <option value="mixed">🔀 Hỗn hợp</option>
            </select>
          </div>

          {/* Empty state */}
          {filteredAssignments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
              <h3>Không có bài tập nào</h3>
              <p style={{ color: 'var(--gray-600)' }}>
                {searchQuery || filterType !== 'all'
                  ? 'Thử thay đổi bộ lọc để xem thêm bài tập'
                  : 'Giảng viên chưa tạo bài tập nào. Hãy quay lại sau!'}
              </p>
            </div>
          )}

          {/* Assignment Grid */}
          <div className="grid grid-2">
            {filteredAssignments.map(assignment => (
              <div
                key={assignment._id}
                className="card"
                style={{
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  border: '2px solid var(--gray-200)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--gray-200)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="card-body">
                  <div
                    className="flex justify-between align-center"
                    style={{ marginBottom: '12px' }}
                  >
                    <span className="badge badge-primary">
                      {getQuestionTypeLabel(assignment.questionType)}
                    </span>
                    {getDifficultyBadge(assignment.questions)}
                  </div>

                  <h3 style={{ marginBottom: '8px', fontSize: '1.25rem' }}>{assignment.title}</h3>

                  <p style={{ color: 'var(--gray-600)', marginBottom: '16px', fontSize: '14px' }}>
                    {assignment.description}
                  </p>

                  <div className="flex gap-2" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span className="badge badge-gray">
                      📝 {assignment.questions?.length || 0} câu hỏi
                    </span>
                    <span className="badge badge-gray">🎯 Max: 10 điểm</span>
                    {assignment.settings?.allowAI && (
                      <span className="badge badge-info">🤖 Cho phép AI</span>
                    )}
                  </div>

                  {assignment.settings?.deadline && (
                    <div
                      style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '16px' }}
                    >
                      ⏰ Hạn nộp:{' '}
                      {new Date(assignment.settings.deadline).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}

                  <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '16px' }}>
                    👨‍🏫 {assignment.instructorId?.name || 'Giảng viên'}
                    {assignment.instructorId?.department &&
                      ` - ${assignment.instructorId.department}`}
                  </div>

                  <button
                    onClick={() => handleStartAssignment(assignment._id, assignment.title)}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    🚀 Bắt đầu làm bài
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="alert alert-info" style={{ marginTop: '20px' }}>
        <span style={{ fontSize: '24px' }}>💡</span>
        <div>
          <strong>Mẹo làm bài hiệu quả:</strong>
          <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
            <li>Bài tập được tự động lưu mỗi 30 giây</li>
            <li>Bạn có thể sử dụng AI để hỏi đáp trong quá trình làm bài</li>
            <li>Hãy đọc kỹ câu hỏi trước khi trả lời</li>
            <li>Kiểm tra lại đáp án trước khi nộp bài</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default StudentAssignmentListPage;
