import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import '../styles/global.css';

function AssignmentCreatePage() {
  const { user, isInstructor } = useAuth();
  const { id } = useParams(); // Get assignment ID from URL for edit mode
  const isEditMode = !!id;

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [generatedAssignment, setGeneratedAssignment] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Load existing assignment data in edit mode
  useEffect(() => {
    if (isEditMode) {
      loadAssignment();
    }
  }, [id]);

  const loadAssignment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/assignment/${id}`);
      const assignment = response.data.assignment;

      // Populate form with existing data
      setTitle(assignment.title || '');
      setDescription(assignment.description || '');
      setQuestionType(assignment.questionType || 'multiple-choice');

      // Set generatedAssignment to show questions
      setGeneratedAssignment({
        assignmentId: assignment._id,
        questions: assignment.questions,
        title: assignment.title,
        description: assignment.description,
      });

      console.log('✅ Loaded assignment for editing:', assignment._id);
    } catch (err) {
      console.error('❌ Failed to load assignment:', err);
      setError('Không thể tải bài tập: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = e => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];
      if (!validTypes.includes(selectedFile.type)) {
        alert('⚠️ Chỉ chấp nhận file PDF, DOCX hoặc TXT');
        e.target.value = '';
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('⚠️ File không được vượt quá 10MB');
        e.target.value = '';
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleGenerate = async e => {
    e.preventDefault();

    if (!file) {
      alert('⚠️ Vui lòng chọn file tài liệu');
      return;
    }

    // Debug: Log user info
    console.log('🔍 User info:', { user, isInstructor });
    console.log('🔍 Access Token:', api.defaults.headers.Authorization);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', title || `Bài tập từ ${file.name}`);
    formData.append('description', description || 'Được tạo tự động bởi AI');
    formData.append('questionType', questionType);
    formData.append('questionCount', questionCount);
    formData.append('difficulty', difficulty);

    // Debug: Log FormData
    console.log('🔍 FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }

    setLoading(true);
    setError(null);

    try {
      // Xóa default Content-Type header để axios tự động set multipart/form-data với boundary
      const config = {
        headers: {
          'Content-Type': undefined, // Xóa default application/json
        },
      };

      const response = await api.post('/assignment/generate', formData, config);

      console.log('✅ Tạo thành công:', response.data);
      setGeneratedAssignment(response.data);
    } catch (err) {
      console.error('❌ Lỗi tạo bài tập:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);

      // Chi tiết error message
      let errorMsg = 'Không thể tạo bài tập';
      if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
        if (err.response.data.details) {
          errorMsg += `\n\n📝 Chi tiết: ${err.response.data.details}`;
        }
        if (err.response.data.finishReason) {
          errorMsg += `\n\n🔍 Finish reason: ${err.response.data.finishReason}`;
        }
        // Thêm gợi ý
        if (err.response?.status === 422) {
          errorMsg += '\n\n💡 Gợi ý: Thử giảm số lượng câu hỏi hoặc chọn file tài liệu ngắn hơn.';
        } else if (err.response?.status === 500) {
          if (errorMsg.includes('empty response')) {
            errorMsg += '\n\n💡 Gợi ý: AI có thể đang quá tải. Vui lòng thử lại sau vài giây.';
          } else if (
            errorMsg.includes('PDF') ||
            errorMsg.includes('XRef') ||
            errorMsg.includes('không thể đọc')
          ) {
            errorMsg += '\n\n💡 Gợi ý:\n';
            errorMsg += '• Thử chuyển PDF sang định dạng DOCX hoặc TXT\n';
            errorMsg += '• Hoặc thử mở PDF và "Save As" để tạo file PDF mới\n';
            errorMsg += '• Hoặc copy text từ PDF và paste vào file TXT';
          }
        }
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Update question handler
  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...generatedAssignment.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value,
    };
    setGeneratedAssignment({
      ...generatedAssignment,
      questions: updatedQuestions,
    });
  };

  // Update option for multiple-choice questions
  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...generatedAssignment.questions];
    const options = [...updatedQuestions[questionIndex].options];
    options[optionIndex] = value;
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      options: options,
    };
    setGeneratedAssignment({
      ...generatedAssignment,
      questions: updatedQuestions,
    });
  };

  const handleSaveChanges = async () => {
    if (!window.confirm('💾 Xác nhận lưu các thay đổi?')) {
      return;
    }

    try {
      setLoading(true);
      await api.put(`/assignment/${generatedAssignment.assignmentId}`, {
        title,
        description,
        questions: generatedAssignment.questions,
      });
      alert('✅ Đã lưu thay đổi thành công!');
      navigate('/instructor/assignments');
    } catch (err) {
      console.error('❌ Lỗi lưu thay đổi:', err);
      alert('❌ Lỗi: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('📤 Xác nhận xuất bản bài tập này cho sinh viên?')) {
      return;
    }

    try {
      await api.post(`/assignment/${generatedAssignment.assignmentId}/publish`);
      alert('✅ Đã xuất bản bài tập thành công!');
      navigate('/instructor/assignments');
    } catch (err) {
      console.error('❌ Lỗi xuất bản:', err);
      alert('❌ Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleReset = () => {
    if (
      generatedAssignment &&
      !window.confirm('🔄 Bạn có chắc muốn tạo lại? Câu hỏi hiện tại sẽ bị mất.')
    ) {
      return;
    }
    setGeneratedAssignment(null);
    setFile(null);
    setTitle('');
    setDescription('');
    setError(null);
  };

  return (
    <div className="container">
      {/* Debug Info */}
      {!isInstructor && (
        <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <strong>Cảnh báo</strong>
            <p style={{ marginBottom: 0 }}>
              Bạn đang đăng nhập với vai trò: <strong>{user?.role || 'Không xác định'}</strong>. Chỉ
              giảng viên mới có thể tạo bài tập.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-message">
            <div className="loading loading-lg"></div>
            <h3 style={{ marginTop: '20px' }}>🤖 AI đang tạo câu hỏi...</h3>
            <p style={{ color: 'var(--gray-600)' }}>Vui lòng đợi 30-60 giây</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h1 className="card-title">
            {isEditMode ? '✏️ Chỉnh Sửa Bài Tập' : '🎓 Tạo Bài Tập Mới'}
          </h1>
          <p style={{ color: 'var(--gray-600)', marginBottom: 0 }}>
            {isEditMode
              ? 'Chỉnh sửa thông tin và câu hỏi của bài tập'
              : 'Upload tài liệu và để AI tự động tạo câu hỏi'}
          </p>
        </div>

        {!generatedAssignment && !isEditMode ? (
          <form onSubmit={handleGenerate}>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger">
                  <span style={{ fontSize: '20px' }}>❌</span>
                  <div>
                    <strong>Lỗi tạo bài tập</strong>
                    <p style={{ marginBottom: 0 }}>{error}</p>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">📄 Tài liệu (PDF, DOCX, TXT) *</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="form-control-file"
                  required
                />
                {file && (
                  <div className="form-help" style={{ marginTop: '8px' }}>
                    ✅ Đã chọn: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(0)} KB)
                  </div>
                )}
                <div className="form-help">
                  Kích thước tối đa: 10MB. AI sẽ đọc và tạo câu hỏi từ nội dung tài liệu.
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">📝 Tiêu đề bài tập</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ví dụ: Bài tập tuần 1 - Nhập môn AI"
                    className="form-control"
                  />
                  <div className="form-help">Để trống để dùng tên file</div>
                </div>

                <div className="form-group">
                  <label className="form-label">📋 Mô tả</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Ví dụ: Ôn tập chương 1"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="grid grid-3">
                <div className="form-group">
                  <label className="form-label">📝 Loại câu hỏi</label>
                  <select
                    value={questionType}
                    onChange={e => setQuestionType(e.target.value)}
                    className="form-control"
                  >
                    <option value="multiple-choice">🔘 Trắc nghiệm</option>
                    <option value="essay">✍️ Tự luận</option>
                    <option value="mixed">🔀 Hỗn hợp</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">🔢 Số câu hỏi</label>
                  <input
                    type="number"
                    min="5"
                    max="20"
                    value={questionCount}
                    onChange={e => setQuestionCount(e.target.value)}
                    className="form-control"
                  />
                  <div className="form-help">5-20 câu</div>
                </div>

                <div className="form-group">
                  <label className="form-label">⚡ Độ khó</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="form-control"
                  >
                    <option value="easy">😊 Dễ</option>
                    <option value="medium">😐 Trung bình</option>
                    <option value="hard">😰 Khó</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card-footer">
              <button
                type="button"
                onClick={() => navigate('/instructor/dashboard')}
                className="btn btn-secondary"
              >
                ← Quay lại
              </button>
              <button type="submit" disabled={loading || !file} className="btn btn-primary btn-lg">
                {loading ? (
                  <>
                    <span className="loading"></span>
                    Đang tạo...
                  </>
                ) : (
                  <>🚀 Tạo câu hỏi với AI</>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="card-body">
              {!isEditMode && (
                <div className="alert alert-success">
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <div>
                    <strong>Tạo thành công!</strong>
                    <p style={{ marginBottom: 0 }}>
                      AI đã tạo{' '}
                      {generatedAssignment?.assignment?.questionCount ||
                        generatedAssignment?.questions?.length}{' '}
                      câu hỏi (
                      {generatedAssignment?.assignment?.totalPoints ||
                        generatedAssignment?.totalPoints ||
                        0}{' '}
                      điểm)
                    </p>
                  </div>
                </div>
              )}

              {isEditMode ? (
                <div style={{ marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="form-label">📝 Tiêu đề bài tập</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="form-control"
                      placeholder="Nhập tiêu đề bài tập"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">📄 Mô tả</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="form-control"
                      rows="3"
                      placeholder="Nhập mô tả bài tập"
                    />
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--gray-100)',
                    padding: '16px',
                    borderRadius: 'var(--border-radius)',
                    marginBottom: '24px',
                  }}
                >
                  <div className="flex justify-between align-center">
                    <div>
                      <h3 style={{ marginBottom: '8px' }}>
                        {generatedAssignment?.assignment?.title ||
                          generatedAssignment?.title ||
                          title}
                      </h3>
                      <p style={{ color: 'var(--gray-600)', marginBottom: 0 }}>
                        {generatedAssignment?.assignment?.description ||
                          generatedAssignment?.description ||
                          description}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-primary" style={{ fontSize: '16px' }}>
                        {(generatedAssignment?.assignment?.questionType ||
                          generatedAssignment?.questionType ||
                          questionType) === 'multiple-choice' && '🔘 Trắc nghiệm'}
                        {(generatedAssignment?.assignment?.questionType ||
                          generatedAssignment?.questionType ||
                          questionType) === 'essay' && '✍️ Tự luận'}
                        {(generatedAssignment?.assignment?.questionType ||
                          generatedAssignment?.questionType ||
                          questionType) === 'mixed' && '🔀 Hỗn hợp'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <h3 style={{ marginBottom: '20px' }}>📝 Xem trước câu hỏi</h3>

              {(
                generatedAssignment?.assignment?.questions ||
                generatedAssignment?.questions ||
                []
              ).map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    className="flex justify-between align-center"
                    style={{ marginBottom: '12px' }}
                  >
                    <h4 style={{ marginBottom: 0 }}>
                      Câu {idx + 1}
                      {q.type === 'multiple-choice' && ' 🔘'}
                      {q.type === 'essay' && ' ✍️'}
                    </h4>
                    {isEditMode ? (
                      <input
                        type="number"
                        value={q.points}
                        onChange={e =>
                          handleQuestionChange(idx, 'points', parseInt(e.target.value) || 0)
                        }
                        style={{
                          width: '80px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--gray-300)',
                        }}
                        min="0"
                      />
                    ) : (
                      <span className="badge badge-info">{q.points} điểm</span>
                    )}
                  </div>

                  {isEditMode ? (
                    <textarea
                      value={q.question}
                      onChange={e => handleQuestionChange(idx, 'question', e.target.value)}
                      className="form-control"
                      rows="2"
                      style={{
                        fontSize: '16px',
                        marginBottom: '16px',
                        background: '#ffffff',
                        color: '#000000',
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
                      {q.question}
                    </p>
                  )}

                  {q.type === 'multiple-choice' && (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        {isEditMode && (
                          <div style={{ marginBottom: '12px' }}>
                            <label className="form-label" style={{ fontSize: '14px' }}>
                              Đáp án đúng:
                            </label>
                            <select
                              value={q.correctAnswer}
                              onChange={e =>
                                handleQuestionChange(idx, 'correctAnswer', e.target.value)
                              }
                              className="form-control"
                              style={{ width: '100px', display: 'inline-block', marginLeft: '8px' }}
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </div>
                        )}

                        <div style={{ marginLeft: isEditMode ? '0' : '20px' }}>
                          {q.options?.map((opt, i) => (
                            <div
                              key={i}
                              style={{
                                padding: '10px',
                                margin: '8px 0',
                                background: opt.startsWith(q.correctAnswer + '.')
                                  ? '#d1fae5'
                                  : '#ffffff',
                                borderRadius: '4px',
                                border: opt.startsWith(q.correctAnswer + '.')
                                  ? '2px solid #10b981'
                                  : '1px solid #d1d5db',
                              }}
                            >
                              {opt.startsWith(q.correctAnswer + '.') && '✅ '}
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={e => handleOptionChange(idx, i, e.target.value)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    padding: '0',
                                    color: '#000000',
                                    width: '100%',
                                    fontSize: '15px',
                                    outline: 'none',
                                  }}
                                />
                              ) : (
                                opt
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {q.explanation && (
                        <div
                          style={{
                            background: 'var(--info-light)',
                            padding: '12px',
                            borderRadius: '4px',
                            fontSize: '14px',
                          }}
                        >
                          <strong>💡 Giải thích:</strong> {q.explanation}
                        </div>
                      )}
                    </>
                  )}

                  {q.type === 'essay' && (
                    <>
                      <div
                        style={{
                          background: 'var(--warning-light)',
                          padding: '12px',
                          borderRadius: '4px',
                          marginBottom: '8px',
                        }}
                      >
                        <strong>📋 Tiêu chí chấm điểm:</strong>
                        {isEditMode ? (
                          <textarea
                            value={q.rubric}
                            onChange={e => handleQuestionChange(idx, 'rubric', e.target.value)}
                            className="form-control"
                            rows="3"
                            style={{ marginTop: '8px', background: '#ffffff', color: '#000000' }}
                          />
                        ) : (
                          <p style={{ marginBottom: 0, marginTop: '8px' }}>{q.rubric}</p>
                        )}
                      </div>
                      {q.estimatedTime && (
                        <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                          ⏱️ Thời gian ước tính: {q.estimatedTime} phút
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="card-footer">
              {isEditMode ? (
                <>
                  <button
                    onClick={() => navigate('/instructor/assignments')}
                    className="btn btn-outline"
                  >
                    ← Quay lại
                  </button>
                  <button onClick={handleSaveChanges} className="btn btn-primary btn-lg">
                    💾 Lưu thay đổi
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleReset} className="btn btn-secondary">
                    🔄 Tạo lại
                  </button>
                  <button
                    onClick={() => navigate('/instructor/dashboard')}
                    className="btn btn-outline"
                  >
                    💾 Lưu nháp
                  </button>
                  <button onClick={handlePublish} className="btn btn-success btn-lg">
                    📤 Xuất bản bài tập
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AssignmentCreatePage;
