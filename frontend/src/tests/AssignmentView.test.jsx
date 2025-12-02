/**
 * AssignmentView Test Suite
 * Tests for AssignmentView component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AssignmentView from '../pages/AssignmentView';
import { AssignmentProvider } from '../contexts/AssignmentContext';
import api from '../utils/api';

// Mock API module
vi.mock('../utils/api');

// Mock AIChat component to avoid nested testing complexity
vi.mock('../components/AIChat', () => ({
  default: ({ submissionId, questionId }) => (
    <div data-testid="ai-chat-mock">
      AIChat Mock - Submission: {submissionId}, Question: {questionId}
    </div>
  ),
}));

describe('AssignmentView Component', () => {
  // Mock data
  const mockSubmission = {
    _id: 'sub123',
    assignmentId: 'assign456',
    studentId: 'student789',
    status: 'draft',
    answers: [
      {
        questionId: 'q1',
        answer: 'B',
        aiInteractionCount: 2,
      },
      {
        questionId: 'q2',
        answer: '',
        aiInteractionCount: 0,
      },
    ],
    startedAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString(),
  };

  const mockAssignment = {
    _id: 'assign456',
    title: 'Bài Tập Test Frontend',
    description: 'Test assignment for frontend testing',
    questionType: 'multiple-choice',
    allowAI: true,
    allowMultipleDrafts: true,
    totalPoints: 20,
    questions: [
      {
        _id: 'q1',
        type: 'multiple-choice',
        question: 'React là gì?',
        options: ['Thư viện JavaScript', 'Ngôn ngữ lập trình', 'Database', 'Framework PHP'],
        correctAnswer: 'Thư viện JavaScript',
        points: 10,
      },
      {
        _id: 'q2',
        type: 'multiple-choice',
        question: 'JSX viết tắt của gì?',
        options: ['JavaScript XML', 'Java Syntax Extension', 'JSON XML', 'JavaScript Extension'],
        correctAnswer: 'JavaScript XML',
        points: 10,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default API responses
    api.get.mockImplementation(url => {
      if (url.includes('/submission/sub123')) {
        return Promise.resolve({ data: { success: true, submission: mockSubmission } });
      }
      if (url.includes('/assignment/assign456')) {
        return Promise.resolve({ data: { success: true, assignment: mockAssignment } });
      }
      return Promise.reject(new Error('Not found'));
    });

    api.put.mockResolvedValue({ data: { success: true } });
  });

  // Helper to render component with router and context
  const renderWithRouter = (submissionId = 'sub123') => {
    return render(
      <MemoryRouter initialEntries={[`/assignment/${submissionId}`]}>
        <AssignmentProvider>
          <Routes>
            <Route path="/assignment/:id" element={<AssignmentView />} />
          </Routes>
        </AssignmentProvider>
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('nên hiển thị loading state khi đang tải dữ liệu', () => {
      // Delay API response
      api.get.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ data: { submission: mockSubmission } }), 1000)
          )
      );

      renderWithRouter();
      expect(screen.getByText(/Đang tải bài tập/i)).toBeInTheDocument();
    });

    it('nên hiển thị câu hỏi sau khi tải xong', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Bài Tập Test Frontend')).toBeInTheDocument();
      });

      expect(screen.getByText('React là gì?')).toBeInTheDocument();
    });

    it('nên hiển thị progress bar và question pills', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Câu 1 \/ 2/i)).toBeInTheDocument();
      });

      // Check question pills
      const pills = screen.getAllByRole('button', { name: /^\d+$/ });
      expect(pills).toHaveLength(2);
    });

    it('nên hiển thị thông tin auto-save', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Tự động lưu mỗi 30s/i)).toBeInTheDocument();
      });
    });
  });

  describe('Câu Hỏi Trắc Nghiệm (Multiple Choice)', () => {
    it('nên hiển thị các option radio buttons', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      // Check options
      expect(screen.getByText('Thư viện JavaScript')).toBeInTheDocument();
      expect(screen.getByText('Ngôn ngữ lập trình')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Framework PHP')).toBeInTheDocument();
    });

    it('nên pre-select đáp án đã chọn trước đó', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      // Mock submission has answer 'B' for q1
      const optionB = screen.getByLabelText(/B\./);
      expect(optionB).toBeChecked();
    });

    it('nên cho phép chọn đáp án mới', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      // Click option A
      const optionA = screen.getByLabelText(/A\./);
      fireEvent.click(optionA);

      await waitFor(() => {
        expect(optionA).toBeChecked();
      });
    });
  });

  describe('Navigation', () => {
    it('nên disable nút "Câu trước" ở câu đầu tiên', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      const prevButton = screen.getByRole('button', { name: /Câu trước/i });
      expect(prevButton).toBeDisabled();
    });

    it('nên chuyển sang câu tiếp theo khi click "Câu tiếp"', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /Câu tiếp/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('JSX viết tắt của gì?')).toBeInTheDocument();
      });
    });

    it('nên hiển thị nút "Nộp bài" ở câu cuối cùng', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      // Navigate to last question
      const nextButton = screen.getByRole('button', { name: /Câu tiếp/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Nộp bài/i })).toBeInTheDocument();
      });
    });

    it('nên cho phép nhảy đến câu hỏi bằng question pills', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      // Click pill 2
      const pill2 = screen.getByRole('button', { name: '2' });
      fireEvent.click(pill2);

      await waitFor(() => {
        expect(screen.getByText('JSX viết tắt của gì?')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-Save', () => {
    it('nên gọi API save khi click nút "Lưu nháp"', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Lưu nháp/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          expect.stringContaining('/submission/sub123'),
          expect.any(Object)
        );
      });
    });

    it('nên hiển thị trạng thái "Đang lưu..." khi đang save', async () => {
      // Delay API response
      api.put.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 500))
      );

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Lưu nháp/i });
      fireEvent.click(saveButton);

      // Check loading state
      expect(screen.getByText(/Đang lưu/i)).toBeInTheDocument();
    });
  });

  describe('AI Chat Integration', () => {
    it('nên hiển thị nút "Mở AI Chat" khi allowAI = true', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Mở AI Chat/i })).toBeInTheDocument();
    });

    it('nên mở AI Chat sidebar khi click nút', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      const aiButton = screen.getByRole('button', { name: /Mở AI Chat/i });
      fireEvent.click(aiButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-chat-mock')).toBeInTheDocument();
      });
    });
  });

  describe('Submit Assignment', () => {
    it('nên hiển thị modal xác nhận khi click "Nộp bài"', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      // Navigate to last question
      const nextButton = screen.getByRole('button', { name: /Câu tiếp/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('JSX viết tắt của gì?')).toBeInTheDocument();
      });

      // Click submit
      const submitButton = screen.getByRole('button', { name: /Nộp bài/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Xác nhận nộp bài/i)).toBeInTheDocument();
      });
    });

    it('nên gọi API submit khi xác nhận nộp bài', async () => {
      api.post.mockResolvedValue({
        data: {
          success: true,
          totalScore: 20,
          maxScore: 20,
          aiSkillScore: 85,
          finalScore: 91,
        },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('React là gì?')).toBeInTheDocument();
      });

      // Navigate to last question
      const nextButton = screen.getByRole('button', { name: /Câu tiếp/i });
      fireEvent.click(nextButton);

      // Click submit
      const submitButton = screen.getByRole('button', { name: /Nộp bài/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Xác nhận nộp bài/i)).toBeInTheDocument();
      });

      // Confirm
      const confirmButton = screen.getByRole('button', { name: /✅ Nộp bài/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          expect.stringContaining('/submission/sub123/submit'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('nên hiển thị error khi không load được submission', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Lỗi/i)).toBeInTheDocument();
      });
    });

    it('nên hiển thị thông báo khi bài tập đã submit', async () => {
      api.get.mockResolvedValue({
        data: {
          success: true,
          submission: {
            ...mockSubmission,
            status: 'submitted',
          },
        },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Bài tập đã nộp/i)).toBeInTheDocument();
      });
    });
  });
});
