/**
 * InstructorDashboard Test Suite
 * Tests for InstructorDashboard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import InstructorDashboard from '../pages/InstructorDashboard';
import api from '../utils/api';

// Mock API module
vi.mock('../utils/api');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('InstructorDashboard Component', () => {
  // Mock data
  const mockAssignments = [
    {
      _id: 'assign1',
      title: 'Bài Tập React Cơ Bản',
      status: 'published',
      questionType: 'multiple-choice',
      totalPoints: 20,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      _id: 'assign2',
      title: 'Bài Tập Node.js',
      status: 'published',
      questionType: 'essay',
      totalPoints: 30,
      createdAt: '2025-01-02T00:00:00.000Z',
    },
    {
      _id: 'assign3',
      title: 'Bài Tập MongoDB',
      status: 'draft',
      questionType: 'mixed',
      totalPoints: 25,
      createdAt: '2025-01-03T00:00:00.000Z',
    },
  ];

  const mockSubmissions = [
    {
      _id: 'sub1',
      assignmentId: 'assign1',
      studentId: 'student1',
      studentName: 'Nguyễn Văn A',
      studentEmail: 'nguyenvana@email.com',
      status: 'submitted',
      totalScore: 18,
      aiSkillScore: 85,
      finalScore: 88,
      submittedAt: '2025-01-10T10:00:00.000Z',
      assignment: {
        _id: 'assign1',
        title: 'Bài Tập React Cơ Bản',
        totalPoints: 20,
        questions: [
          { _id: 'q1', type: 'multiple-choice', points: 10 },
          { _id: 'q2', type: 'multiple-choice', points: 10 },
        ],
      },
      answers: [
        { questionId: 'q1', answer: 'A', isCorrect: true, pointsEarned: 10 },
        { questionId: 'q2', answer: 'B', isCorrect: false, pointsEarned: 8 },
      ],
      aiInteractionSummary: {
        totalPrompts: 5,
        independenceLevel: 0.75,
      },
    },
    {
      _id: 'sub2',
      assignmentId: 'assign2',
      studentId: 'student2',
      studentName: 'Trần Thị B',
      studentEmail: 'tranthib@email.com',
      status: 'submitted',
      totalScore: 25,
      aiSkillScore: 92,
      finalScore: 87,
      submittedAt: '2025-01-11T14:30:00.000Z',
      assignment: {
        _id: 'assign2',
        title: 'Bài Tập Node.js',
        totalPoints: 30,
        questions: [{ _id: 'q3', type: 'essay', points: 30 }],
      },
      answers: [
        {
          questionId: 'q3',
          answer: 'Long essay answer...',
          pointsEarned: undefined, // Needs grading
        },
      ],
      aiInteractionSummary: {
        totalPrompts: 8,
        independenceLevel: 0.65,
      },
    },
    {
      _id: 'sub3',
      assignmentId: 'assign1',
      studentId: 'student3',
      studentName: 'Lê Văn C',
      studentEmail: 'levanc@email.com',
      status: 'draft',
      totalScore: 0,
      submittedAt: null,
      assignment: {
        _id: 'assign1',
        title: 'Bài Tập React Cơ Bản',
        totalPoints: 20,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default API responses
    api.get.mockImplementation(url => {
      if (url.includes('/assignment/list')) {
        return Promise.resolve({
          data: {
            success: true,
            assignments: mockAssignments,
            count: mockAssignments.length,
          },
        });
      }
      if (url.includes('/submission/instructor/all')) {
        return Promise.resolve({
          data: {
            success: true,
            submissions: mockSubmissions,
            count: mockSubmissions.length,
          },
        });
      }
      return Promise.reject(new Error('Not found'));
    });
  });

  // Helper to render with router
  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <InstructorDashboard />
      </MemoryRouter>
    );
  };

  describe('Rendering và Loading', () => {
    it('nên hiển thị loading state khi đang tải dữ liệu', () => {
      // Delay API response
      api.get.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  data: { assignments: [], submissions: [] },
                }),
              1000
            )
          )
      );

      renderWithRouter();
      expect(screen.getByText(/Đang tải/i)).toBeInTheDocument();
    });

    it('nên load assignments và submissions khi mount', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/assignment/list');
        expect(api.get).toHaveBeenCalledWith('/submission/instructor/all');
      });
    });

    it('nên hiển thị header "Instructor Dashboard"', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Cards', () => {
    it('nên hiển thị tổng số bài tập', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // 3 assignments
      });
    });

    it('nên hiển thị tổng số bài nộp (chỉ submitted)', async () => {
      renderWithRouter();

      await waitFor(() => {
        // 2 submitted submissions (sub1, sub2)
        const submittedCount = screen.getAllByText('2').length;
        expect(submittedCount).toBeGreaterThan(0);
      });
    });

    it('nên tính số bài tự luận cần chấm', async () => {
      renderWithRouter();

      await waitFor(() => {
        // sub2 has essay question without pointsEarned
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('nên tính average AI skill score', async () => {
      renderWithRouter();

      await waitFor(() => {
        // (85 + 92) / 2 = 88.5 => rounded to 89
        const avgScore = screen.getByText(/89|88/); // Allow small rounding variations
        expect(avgScore).toBeInTheDocument();
      });
    });
  });

  describe('Submissions Table', () => {
    it('nên hiển thị danh sách submissions', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
        expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
      });
    });

    it('nên hiển thị thông tin assignment cho mỗi submission', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Bài Tập React Cơ Bản')).toBeInTheDocument();
        expect(screen.getByText('Bài Tập Node.js')).toBeInTheDocument();
      });
    });

    it('nên hiển thị điểm content score', async () => {
      renderWithRouter();

      await waitFor(() => {
        // sub1: 18/20
        expect(screen.getByText(/18.*\/.*20/i)).toBeInTheDocument();
      });
    });

    it('nên hiển thị AI skill score', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/85/i)).toBeInTheDocument(); // sub1
        expect(screen.getByText(/92/i)).toBeInTheDocument(); // sub2
      });
    });

    it('nên hiển thị final score', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/88/i)).toBeInTheDocument(); // sub1 final
        expect(screen.getByText(/87/i)).toBeInTheDocument(); // sub2 final
      });
    });

    it('nên hiển thị AI usage summary', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/5.*prompts/i)).toBeInTheDocument(); // sub1
        expect(screen.getByText(/8.*prompts/i)).toBeInTheDocument(); // sub2
      });
    });

    it('nên hiển thị badge độc lập', async () => {
      renderWithRouter();

      await waitFor(() => {
        // sub1: 75% độc lập
        expect(screen.getByText(/75%.*độc lập/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    it('nên có filter dropdown cho assignments', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByLabelText(/Chọn Bài Tập/i)).toBeInTheDocument();
      });
    });

    it('nên có filter dropdown cho status', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByLabelText(/Trạng Thái/i)).toBeInTheDocument();
      });
    });

    it('nên có search box', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Tìm kiếm sinh viên/i)).toBeInTheDocument();
      });
    });

    it('nên filter submissions theo assignment', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      });

      // Select assignment 2
      const assignmentFilter = screen.getByLabelText(/Chọn Bài Tập/i);
      await user.selectOptions(assignmentFilter, 'assign2');

      await waitFor(() => {
        // Should only show sub2 (Trần Thị B)
        expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
        expect(screen.queryByText('Nguyễn Văn A')).not.toBeInTheDocument();
      });
    });

    it('nên filter submissions theo status', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      });

      // Select status 'draft'
      const statusFilter = screen.getByLabelText(/Trạng Thái/i);
      await user.selectOptions(statusFilter, 'draft');

      await waitFor(() => {
        // Should only show sub3 (Lê Văn C)
        expect(screen.getByText('Lê Văn C')).toBeInTheDocument();
        expect(screen.queryByText('Nguyễn Văn A')).not.toBeInTheDocument();
      });
    });

    it('nên search submissions theo tên sinh viên', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      });

      // Search for "Trần"
      const searchBox = screen.getByPlaceholderText(/Tìm kiếm sinh viên/i);
      await user.type(searchBox, 'Trần');

      await waitFor(() => {
        expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
        expect(screen.queryByText('Nguyễn Văn A')).not.toBeInTheDocument();
      });
    });

    it('nên search submissions theo email', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      });

      // Search for email
      const searchBox = screen.getByPlaceholderText(/Tìm kiếm sinh viên/i);
      await user.type(searchBox, 'levanc@email.com');

      await waitFor(() => {
        expect(screen.getByText('Lê Văn C')).toBeInTheDocument();
        expect(screen.queryByText('Nguyễn Văn A')).not.toBeInTheDocument();
      });
    });

    it('nên combine multiple filters', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      });

      // Filter by assignment AND status
      const assignmentFilter = screen.getByLabelText(/Chọn Bài Tập/i);
      await user.selectOptions(assignmentFilter, 'assign1');

      const statusFilter = screen.getByLabelText(/Trạng Thái/i);
      await user.selectOptions(statusFilter, 'submitted');

      await waitFor(() => {
        // Should only show sub1 (Nguyễn Văn A - assign1 + submitted)
        expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
        expect(screen.queryByText('Lê Văn C')).not.toBeInTheDocument(); // draft
      });
    });
  });

  describe('Action Buttons', () => {
    it('nên có nút "Xem Chi Tiết" cho mỗi submission', async () => {
      renderWithRouter();

      await waitFor(() => {
        const detailButtons = screen.getAllByRole('button', { name: /Xem Chi Tiết/i });
        expect(detailButtons.length).toBeGreaterThan(0);
      });
    });

    it('nên có nút "Xem Log AI" cho mỗi submission', async () => {
      renderWithRouter();

      await waitFor(() => {
        const logButtons = screen.getAllByRole('button', { name: /Xem Log AI/i });
        expect(logButtons.length).toBeGreaterThan(0);
      });
    });

    it('nên có nút "Chấm Tự Luận" cho submissions với essay questions', async () => {
      renderWithRouter();

      await waitFor(() => {
        // sub2 has essay question
        expect(screen.getByRole('button', { name: /Chấm Tự Luận/i })).toBeInTheDocument();
      });
    });

    it('nên navigate khi click "Xem Chi Tiết"', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      });

      const detailButton = screen.getAllByRole('button', { name: /Xem Chi Tiết/i })[0];
      await user.click(detailButton);

      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/sub1'));
    });

    it('nên navigate khi click "Xem Log AI"', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      });

      const logButton = screen.getAllByRole('button', { name: /Xem Log AI/i })[0];
      await user.click(logButton);

      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/logs/sub1'));
    });
  });

  describe('Refresh và Error Handling', () => {
    it('nên có nút refresh', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();
      });
    });

    it('nên reload data khi click refresh', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      });

      // Clear mock calls
      vi.clearAllMocks();

      const refreshButton = screen.getByRole('button', { name: /Làm mới/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/assignment/list');
        expect(api.get).toHaveBeenCalledWith('/submission/instructor/all');
      });
    });

    it('nên hiển thị error message khi API fails', async () => {
      api.get.mockRejectedValue({
        response: {
          data: { error: 'Failed to load data' },
        },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Failed to load data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('nên hiển thị empty state khi không có submissions', async () => {
      api.get.mockImplementation(url => {
        if (url.includes('/assignment/list')) {
          return Promise.resolve({ data: { assignments: mockAssignments } });
        }
        if (url.includes('/submission/instructor/all')) {
          return Promise.resolve({ data: { submissions: [] } });
        }
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Chưa có bài nộp nào/i)).toBeInTheDocument();
      });
    });

    it('nên hiển thị message khi filter không có kết quả', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      });

      // Search for non-existent student
      const searchBox = screen.getByPlaceholderText(/Tìm kiếm sinh viên/i);
      await user.type(searchBox, 'NonExistentStudent12345');

      await waitFor(() => {
        expect(screen.getByText(/Không tìm thấy kết quả/i)).toBeInTheDocument();
      });
    });
  });
});
