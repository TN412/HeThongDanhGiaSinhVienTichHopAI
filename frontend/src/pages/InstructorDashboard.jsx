import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './InstructorDashboard.css';

/**
 * InstructorDashboard
 * Dashboard tổng quan cho giảng viên
 *
 * Features:
 * - Statistics cards: Assignments, Submissions, Pending Essay Grading, Avg AI Skill
 * - Submissions table with filters (assignment, status, deadline)
 * - Score columns: Content/Total, AI Skill, Final
 * - Action buttons: View Details, View AI Logs, Grade Essay
 * - Export to CSV
 */
function InstructorDashboard() {
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState({
    totalAssignments: 0,
    totalSubmissions: 0,
    pendingEssayGrading: 0,
    avgAISkillScore: 0,
  });

  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);

  // Filters
  const [selectedAssignment, setSelectedAssignment] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
  }, [submissions, selectedAssignment, statusFilter, searchTerm]);

  // Load all dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load assignments and submissions in parallel
      const [assignmentsRes, submissionsRes] = await Promise.all([
        api.get('/assignment/list'),
        api.get('/submission/instructor/all'),
      ]);

      const assignmentsData = assignmentsRes.data.assignments || [];
      const submissionsData = submissionsRes.data.submissions || [];

      setAssignments(assignmentsData);
      setSubmissions(submissionsData);

      // Calculate statistics
      calculateStats(assignmentsData, submissionsData);

      console.log('✅ Dashboard data loaded', {
        assignments: assignmentsData.length,
        submissions: submissionsData.length,
      });
    } catch (err) {
      console.error('❌ Failed to load dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (assignmentsData, submissionsData) => {
    const submittedSubmissions = submissionsData.filter(s => s.status === 'submitted');

    // Count pending essay grading (submissions with essay questions that haven't been graded)
    const pendingEssayGrading = submissionsData.filter(s => {
      if (s.status !== 'submitted' && s.status !== 'pending_grading') return false;

      // Check if has essay questions that need grading
      const hasUnGradedEssay = s.answers?.some(answer => {
        const question = s.assignment?.questions?.find(q => q._id === answer.questionId);
        return question?.type === 'essay' && answer.pointsEarned === undefined;
      });

      return hasUnGradedEssay;
    }).length;

    // Calculate average AI skill score
    const aiSkillScores = submittedSubmissions
      .filter(s => s.aiSkillScore !== undefined && s.aiSkillScore !== null)
      .map(s => s.aiSkillScore);

    const avgAISkillScore =
      aiSkillScores.length > 0
        ? Math.round(aiSkillScores.reduce((a, b) => a + b, 0) / aiSkillScores.length)
        : 0;

    setStats({
      totalAssignments: assignmentsData.length,
      totalSubmissions: submittedSubmissions.length,
      pendingEssayGrading,
      avgAISkillScore,
    });
  };

  // Apply filters to submissions
  const applyFilters = () => {
    let filtered = [...submissions];

    // Filter by assignment
    if (selectedAssignment !== 'all') {
      filtered = filtered.filter(s => s.assignmentId === selectedAssignment);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Filter by search term (student name or email)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.studentName?.toLowerCase().includes(term) ||
          s.studentEmail?.toLowerCase().includes(term)
      );
    }

    setFilteredSubmissions(filtered);
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // View submission details
  const handleViewDetails = submissionId => {
    navigate(`/review/${submissionId}`);
  };

  // View AI logs
  const handleViewAILogs = submissionId => {
    navigate(`/instructor/ai-logs/${submissionId}`);
  };

  // Grade essay submission
  const handleGradeEssay = submissionId => {
    navigate(`/instructor/grade/${submissionId}`);
  };

  // Export to CSV
  const handleExport = () => {
    try {
      // Prepare CSV data
      const headers = [
        'Student Name',
        'Student Email',
        'Assignment',
        'Status',
        'Content Score',
        'AI Skill Score (/10)',
        'Final Score (/10)',
        'Submitted At',
        'AI Interactions',
      ];

      const rows = filteredSubmissions.map(s => [
        s.studentName || 'N/A',
        s.studentEmail || 'N/A',
        s.assignment?.title || 'N/A',
        s.status || 'N/A',
        s.status === 'submitted' ? `${(s.contentScore || 0).toFixed(1)}/10` : 'N/A',
        s.status === 'submitted' ? (s.aiSkillScore || 0).toFixed(1) : 'N/A',
        s.status === 'submitted' ? (s.finalScore || 0).toFixed(1) : 'N/A',
        s.submittedAt ? new Date(s.submittedAt).toLocaleString('vi-VN') : 'N/A',
        s.aiInteractionSummary?.totalPrompts || 0,
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `submissions_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      console.log('✅ CSV exported', { rows: filteredSubmissions.length });
    } catch (err) {
      console.error('❌ Export failed:', err);
      alert('Failed to export CSV: ' + err.message);
    }
  };

  // Get status badge class
  const getStatusClass = status => {
    switch (status) {
      case 'submitted':
        return 'status-submitted';
      case 'draft':
        return 'status-draft';
      case 'pending_grading':
        return 'status-pending';
      case 'graded':
        return 'status-graded';
      default:
        return 'status-default';
    }
  };

  // Get score color class
  const getScoreClass = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'score-excellent';
    if (percentage >= 60) return 'score-good';
    if (percentage >= 40) return 'score-average';
    return 'score-poor';
  };

  // Loading state
  if (loading) {
    return (
      <div className="instructor-dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải bảng điều khiển...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="instructor-dashboard">
        <div className="error-container">
          <h2>❌ Lỗi Tải Bảng Điều Khiển</h2>
          <p>
            {typeof error === 'string' ? error : error.message || 'Đã xảy ra lỗi không xác định'}
          </p>
          <button onClick={loadDashboardData} className="retry-button">
            🔄 Thử Lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="instructor-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>👨‍🏫 Bảng Điều Khiển Giảng Viên</h1>
          <p>Quản lý bài tập và xem phân tích học tập của sinh viên</p>
        </div>
        <div className="header-actions">
          <button onClick={handleRefresh} className="refresh-button" disabled={refreshing}>
            {refreshing ? '⏳' : '🔄'} Làm Mới
          </button>
          <button
            onClick={() => navigate('/instructor/assignment/create')}
            className="create-button"
          >
            ➕ Tạo Bài Tập Mới
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>Tổng Số Bài Tập</h3>
            <p className="stat-number">{stats.totalAssignments}</p>
            <span className="stat-label">Đã xuất bản</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Bài Đã Nộp</h3>
            <p className="stat-number">{stats.totalSubmissions}</p>
            <span className="stat-label">Sinh viên đã nộp</span>
          </div>
        </div>

        <div className="stat-card urgent">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>Chờ Chấm Điểm</h3>
            <p className="stat-number">{stats.pendingEssayGrading}</p>
            <span className="stat-label">Câu tự luận cần chấm</span>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">🤖</div>
          <div className="stat-content">
            <h3>Kỹ Năng AI TB</h3>
            <p className="stat-number">{stats.avgAISkillScore}/10</p>
            <span className="stat-label">Trung bình tất cả sinh viên</span>
          </div>
        </div>
      </div>

      {/* Submissions Section */}
      <div className="submissions-section">
        <div className="section-header">
          <h2>📊 Danh Sách Bài Làm</h2>
          <button onClick={handleExport} className="export-button">
            📥 Xuất File CSV
          </button>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>Bài Tập:</label>
            <select
              value={selectedAssignment}
              onChange={e => setSelectedAssignment(e.target.value)}
            >
              <option value="all">Tất Cả Bài Tập</option>
              {assignments.map(a => (
                <option key={a._id} value={a._id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Trạng Thái:</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Tất Cả Trạng Thái</option>
              <option value="draft">Bản Nháp</option>
              <option value="submitted">Đã Nộp</option>
              <option value="pending_grading">Chờ Chấm</option>
              <option value="graded">Đã Chấm</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Tìm Kiếm:</label>
            <input
              type="text"
              placeholder="Tên hoặc email sinh viên..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-results">
            Hiển thị {filteredSubmissions.length} / {submissions.length} bài làm
          </div>
        </div>

        {/* Submissions Table */}
        {filteredSubmissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Không Tìm Thấy Bài Làm</h3>
            <p>Thử điều chỉnh bộ lọc hoặc tạo bài tập mới để sinh viên làm bài.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>Sinh Viên</th>
                  <th>Bài Tập</th>
                  <th>Trạng Thái</th>
                  <th>Điểm Nội Dung</th>
                  <th>Kỹ Năng AI</th>
                  <th>Điểm Cuối</th>
                  <th>Sử Dụng AI</th>
                  <th>Ngày Nộp</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(submission => {
                  const assignment = submission.assignment;
                  const hasEssayToGrade =
                    (submission.status === 'pending_grading' ||
                      submission.status === 'submitted') &&
                    submission.answers?.some(a => {
                      const q = assignment?.questions?.find(qu => qu._id === a.questionId);
                      return q?.type === 'essay' && a.pointsEarned === undefined;
                    });

                  return (
                    <tr key={submission._id}>
                      <td>
                        <div className="student-info">
                          <div className="student-name">{submission.studentName || 'Unknown'}</div>
                          <div className="student-email">{submission.studentEmail || ''}</div>
                        </div>
                      </td>

                      <td>
                        <div className="assignment-info">{assignment?.title || 'N/A'}</div>
                      </td>

                      <td>
                        <span className={`status-badge ${getStatusClass(submission.status)}`}>
                          {submission.status === 'submitted'
                            ? '✅ Đã Nộp'
                            : submission.status === 'draft'
                              ? '📝 Bản Nháp'
                              : submission.status === 'pending_grading'
                                ? '⏳ Chờ Chấm'
                                : submission.status === 'graded'
                                  ? '✔️ Đã Chấm'
                                  : submission.status}
                        </span>
                      </td>

                      <td>
                        {submission.status === 'submitted' || submission.status === 'graded' ? (
                          submission.contentScore !== null &&
                          submission.contentScore !== undefined ? (
                            <div
                              className={`score-cell ${getScoreClass(submission.contentScore || 0, 10)}`}
                            >
                              <span className="score-value">
                                {(submission.contentScore || 0).toFixed(1)}
                              </span>
                              <span className="score-divider">/</span>
                              <span className="score-max">10</span>
                            </div>
                          ) : (
                            <span className="pending-score">⏳ Chờ chấm</span>
                          )
                        ) : (
                          <span className="not-submitted">—</span>
                        )}
                      </td>

                      <td>
                        {submission.status === 'submitted' || submission.status === 'graded' ? (
                          submission.aiSkillScore !== null &&
                          submission.aiSkillScore !== undefined ? (
                            <div className="ai-skill-cell">
                              <span className="score-value">
                                {(submission.aiSkillScore || 0).toFixed(1)}
                              </span>
                              <span className="score-max">/10</span>
                            </div>
                          ) : (
                            <span className="pending-score">⏳</span>
                          )
                        ) : (
                          <span className="not-submitted">—</span>
                        )}
                      </td>

                      <td>
                        {submission.status === 'submitted' || submission.status === 'graded' ? (
                          submission.finalScore !== null && submission.finalScore !== undefined ? (
                            <div
                              className={`final-score ${getScoreClass(submission.finalScore || 0, 10)}`}
                            >
                              <strong>{(submission.finalScore || 0).toFixed(1)}</strong>/10
                            </div>
                          ) : (
                            <span className="pending-score">⏳</span>
                          )
                        ) : (
                          <span className="not-submitted">—</span>
                        )}
                      </td>

                      <td>
                        <div className="ai-usage-cell">
                          {submission.aiInteractionSummary ? (
                            <>
                              <span className="prompts-count">
                                🪙 {submission.aiInteractionSummary.totalPrompts || 0} câu hỏi
                              </span>
                              {submission.aiInteractionSummary.independenceLevel !== undefined && (
                                <span
                                  className={`independence-badge ${
                                    submission.aiInteractionSummary.independenceLevel > 0.7
                                      ? 'high'
                                      : submission.aiInteractionSummary.independenceLevel > 0.4
                                        ? 'medium'
                                        : 'low'
                                  }`}
                                >
                                  {Math.round(
                                    submission.aiInteractionSummary.independenceLevel * 100
                                  )}
                                  % độc lập
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="no-ai">Không dùng AI</span>
                          )}
                        </div>
                      </td>

                      <td>
                        {submission.submittedAt ? (
                          <div className="date-cell">
                            {new Date(submission.submittedAt).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}
                            <div className="time-cell">
                              {new Date(submission.submittedAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="not-submitted">Chưa nộp</span>
                        )}
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleViewDetails(submission._id)}
                            className="action-btn view-btn"
                            title="Xem chi tiết bài làm"
                          >
                            👁️
                          </button>

                          <button
                            onClick={() => handleViewAILogs(submission._id)}
                            className="action-btn logs-btn"
                            title="Xem lịch sử tương tác AI"
                          >
                            📊
                          </button>

                          {hasEssayToGrade && (
                            <button
                              onClick={() => handleGradeEssay(submission._id)}
                              className="action-btn grade-btn"
                              title="Chấm câu tự luận"
                            >
                              ✍️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstructorDashboard;
