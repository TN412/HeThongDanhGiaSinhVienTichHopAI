import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './InstructorAssignmentListPage.css';

/**
 * InstructorAssignmentListPage
 * Hiển thị danh sách bài tập mà giảng viên đã tạo
 * Cho phép xem, chỉnh sửa, xóa, và thay đổi trạng thái (draft/published)
 */
function InstructorAssignmentListPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, published, draft
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/assignment/list');
      setAssignments(response.data.assignments || []);
    } catch (err) {
      console.error('❌ Lỗi tải danh sách bài tập:', err);
      setError(err.response?.data?.error || 'Không thể tải danh sách bài tập');
    } finally {
      setLoading(false);
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    // Filter by status
    if (filter !== 'all' && assignment.status !== filter) {
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
        return '📝 Trắc Nghiệm';
      case 'essay':
        return '✍️ Tự Luận';
      case 'mixed':
        return '📋 Hỗn Hợp';
      default:
        return type;
    }
  };

  const getStatusBadge = status => {
    const badges = {
      draft: { text: '📝 Bản Nháp', class: 'status-draft' },
      published: { text: '✅ Đã Xuất Bản', class: 'status-published' },
      archived: { text: '📦 Đã Lưu Trữ', class: 'status-archived' },
    };
    return badges[status] || { text: status, class: '' };
  };

  const handleEdit = assignmentId => {
    navigate(`/instructor/assignment/edit/${assignmentId}`);
  };

  const handleView = assignmentId => {
    navigate(`/assignment/${assignmentId}/preview`);
  };

  const handlePublish = async assignmentId => {
    try {
      await api.post(`/assignment/${assignmentId}/publish`);
      alert('✅ Đã xuất bản bài tập thành công!');
      loadAssignments(); // Reload list
    } catch (err) {
      console.error('❌ Lỗi xuất bản:', err);
      alert('❌ Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUnpublish = async assignmentId => {
    if (!confirm('Bạn có chắc muốn ẩn bài tập này? Sinh viên sẽ không thể làm bài nữa.')) {
      return;
    }

    try {
      await api.post(`/assignment/${assignmentId}/unpublish`);
      alert('✅ Đã ẩn bài tập thành công!');
      loadAssignments();
    } catch (err) {
      console.error('❌ Lỗi ẩn bài tập:', err);
      alert('❌ Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async assignmentId => {
    if (!confirm('Bạn có chắc muốn xóa bài tập này? Hành động này không thể hoàn tác!')) {
      return;
    }

    try {
      await api.delete(`/assignment/${assignmentId}`);
      alert('✅ Đã xóa bài tập thành công!');
      loadAssignments();
    } catch (err) {
      console.error('❌ Lỗi xóa bài tập:', err);
      alert('❌ Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'Không có';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="instructor-assignment-list-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải danh sách bài tập...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="instructor-assignment-list-page">
        <div className="error-state">
          <h2>❌ Lỗi Tải Danh Sách</h2>
          <p>{error}</p>
          <button onClick={loadAssignments} className="btn-retry">
            🔄 Thử Lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="instructor-assignment-list-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>📚 Quản Lý Bài Tập</h1>
          <p className="subtitle">
            Tổng cộng {assignments.length} bài tập | Đã xuất bản:{' '}
            {assignments.filter(a => a.status === 'published').length}
          </p>
        </div>
        <button className="btn-create" onClick={() => navigate('/instructor/assignment/create')}>
          ➕ Tạo Bài Tập Mới
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-tabs">
          <button
            className={`tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất Cả ({assignments.length})
          </button>
          <button
            className={`tab ${filter === 'published' ? 'active' : ''}`}
            onClick={() => setFilter('published')}
          >
            Đã Xuất Bản ({assignments.filter(a => a.status === 'published').length})
          </button>
          <button
            className={`tab ${filter === 'draft' ? 'active' : ''}`}
            onClick={() => setFilter('draft')}
          >
            Bản Nháp ({assignments.filter(a => a.status === 'draft').length})
          </button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm bài tập..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Assignments Grid */}
      {filteredAssignments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>Không Tìm Thấy Bài Tập</h3>
          <p>
            {searchQuery
              ? 'Thử thay đổi từ khóa tìm kiếm.'
              : 'Bạn chưa tạo bài tập nào. Hãy tạo bài tập đầu tiên!'}
          </p>
          {!searchQuery && (
            <button
              className="btn-primary"
              onClick={() => navigate('/instructor/assignment/create')}
            >
              ➕ Tạo Bài Tập Đầu Tiên
            </button>
          )}
        </div>
      ) : (
        <div className="assignments-grid">
          {filteredAssignments.map(assignment => {
            const badge = getStatusBadge(assignment.status);
            const questionCount = assignment.questions?.length || 0;
            const totalPoints = assignment.totalPoints || 0;

            return (
              <div key={assignment._id} className="assignment-card">
                {/* Card Header */}
                <div className="card-header">
                  <div className="title-section">
                    <h3 className="assignment-title">{assignment.title}</h3>
                    <span className={`status-badge ${badge.class}`}>{badge.text}</span>
                  </div>
                  <div className="question-type">
                    {getQuestionTypeLabel(assignment.questionType)}
                  </div>
                </div>

                {/* Card Body */}
                <div className="card-body">
                  <p className="assignment-description">
                    {assignment.description || 'Không có mô tả'}
                  </p>

                  <div className="assignment-stats">
                    <div className="stat-item">
                      <span className="stat-icon">📝</span>
                      <span className="stat-value">{questionCount} câu hỏi</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-icon">💯</span>
                      <span className="stat-value">Max: 10 điểm</span>
                    </div>
                    {assignment.settings?.timeLimit && (
                      <div className="stat-item">
                        <span className="stat-icon">⏱️</span>
                        <span className="stat-value">{assignment.settings.timeLimit} phút</span>
                      </div>
                    )}
                  </div>

                  <div className="assignment-info">
                    <div className="info-row">
                      <span className="info-label">Deadline:</span>
                      <span className="info-value">{formatDate(assignment.deadline)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Tạo lúc:</span>
                      <span className="info-value">{formatDate(assignment.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="card-footer">
                  <div className="action-buttons">
                    <button
                      className="btn-action btn-view"
                      onClick={() => handleView(assignment._id)}
                      title="Xem trước"
                    >
                      👁️ Xem
                    </button>
                    <button
                      className="btn-action btn-edit"
                      onClick={() => handleEdit(assignment._id)}
                      title="Chỉnh sửa"
                    >
                      ✏️ Sửa
                    </button>
                    {assignment.status === 'draft' ? (
                      <button
                        className="btn-action btn-publish"
                        onClick={() => handlePublish(assignment._id)}
                        title="Xuất bản"
                      >
                        ✅ Xuất Bản
                      </button>
                    ) : (
                      <button
                        className="btn-action btn-unpublish"
                        onClick={() => handleUnpublish(assignment._id)}
                        title="Ẩn bài tập"
                      >
                        🔒 Ẩn
                      </button>
                    )}
                    <button
                      className="btn-action btn-delete"
                      onClick={() => handleDelete(assignment._id)}
                      title="Xóa bài tập"
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InstructorAssignmentListPage;
