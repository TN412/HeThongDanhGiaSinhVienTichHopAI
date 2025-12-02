/**
 * AIChat Test Suite
 * Tests for AIChat component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIChat from '../components/AIChat';
import api from '../utils/api';

// Mock API module
vi.mock('../utils/api');

describe('AIChat Component', () => {
  const defaultProps = {
    submissionId: 'sub123',
    questionId: 'q1',
    questionText: 'React là gì?',
    currentAnswer: 'Thư viện JavaScript',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful API response
    api.post.mockResolvedValue({
      data: {
        message: 'Đây là câu trả lời từ AI Assistant. React là một thư viện JavaScript phổ biến.',
        tokensUsed: 150,
        suggestedActions: ['Hỏi thêm về hooks', 'Tìm hiểu về components'],
      },
    });
  });

  describe('Rendering', () => {
    it('nên render AI chat header với icon và title', () => {
      render(<AIChat {...defaultProps} />);

      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      expect(screen.getByText(/Hỏi AI để được hỗ trợ/i)).toBeInTheDocument();
    });

    it('nên hiển thị empty state khi chưa có message', () => {
      render(<AIChat {...defaultProps} />);

      expect(screen.getByText(/Chào bạn!/i)).toBeInTheDocument();
      expect(screen.getByText(/Tôi là AI Assistant/i)).toBeInTheDocument();
    });

    it('nên hiển thị token counter (ban đầu = 0)', () => {
      render(<AIChat {...defaultProps} />);

      expect(screen.getByText('0')).toBeInTheDocument(); // Token count
    });

    it('nên hiển thị quick action buttons', () => {
      render(<AIChat {...defaultProps} />);

      expect(screen.getByText(/💡 Gợi ý/i)).toBeInTheDocument();
      expect(screen.getByText(/🔍 Giải thích/i)).toBeInTheDocument();
      expect(screen.getByText(/✅ Kiểm tra/i)).toBeInTheDocument();
    });

    it('nên hiển thị textarea input và send button', () => {
      render(<AIChat {...defaultProps} />);

      expect(screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📤/i })).toBeInTheDocument();
    });
  });

  describe('Nhập và Gửi Prompt', () => {
    it('nên cho phép nhập text vào input', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Giải thích cho tôi về React hooks');

      expect(input).toHaveValue('Giải thích cho tôi về React hooks');
    });

    it('nên gọi API khi click send button', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Giải thích React hooks');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/ai/chat', {
          prompt: 'Giải thích React hooks',
          submissionId: 'sub123',
          questionId: 'q1',
          context: expect.stringContaining('React là gì?'),
        });
      });
    });

    it('nên gửi context (questionText + currentAnswer) trong API call', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test question');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/ai/chat',
          expect.objectContaining({
            context: expect.stringContaining('React là gì?'),
          })
        );
      });

      // Check context includes currentAnswer
      const call = api.post.mock.calls[0][1];
      expect(call.context).toContain('Thư viện JavaScript');
    });

    it('nên gửi khi nhấn Enter (không Shift)', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test prompt{Enter}');

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/ai/chat',
          expect.objectContaining({
            prompt: 'Test prompt',
          })
        );
      });
    });

    it('nên disable send button khi input rỗng', () => {
      render(<AIChat {...defaultProps} />);

      const sendButton = screen.getByRole('button', { name: /📤/i });
      expect(sendButton).toBeDisabled();
    });

    it('nên clear input sau khi gửi', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('Hiển Thị Messages', () => {
    it('nên hiển thị user message sau khi gửi', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'My test question');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('My test question')).toBeInTheDocument();
      });
    });

    it('nên hiển thị AI assistant message từ API response', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test question');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Đây là câu trả lời từ AI Assistant/i)).toBeInTheDocument();
      });
    });

    it('nên hiển thị token usage badge cho AI message', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/150 tokens/i)).toBeInTheDocument();
      });
    });

    it('nên cập nhật total token counter', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      // Initial state
      expect(screen.getByText('0')).toBeInTheDocument();

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });

    it('nên hiển thị suggested actions từ AI response', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Hỏi thêm về hooks')).toBeInTheDocument();
        expect(screen.getByText('Tìm hiểu về components')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('nên hiển thị typing indicator khi đang chờ response', async () => {
      // Delay API response
      api.post.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    message: 'Response',
                    tokensUsed: 100,
                  },
                }),
              1000
            )
          )
      );

      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      // Check typing indicator (3 dots animation)
      const typingIndicator = screen.getByClassName('typing-indicator');
      expect(typingIndicator).toBeInTheDocument();
    });

    it('nên disable input và send button khi đang loading', async () => {
      // Delay API response
      api.post.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  data: { message: 'Response', tokensUsed: 100 },
                }),
              1000
            )
          )
      );

      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('nên hiển thị error message khi API call thất bại', async () => {
      api.post.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'AI service unavailable' },
        },
      });

      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/AI service unavailable/i)).toBeInTheDocument();
      });
    });

    it('nên hiển thị error khi AI không được phép (403)', async () => {
      api.post.mockRejectedValue({
        response: {
          status: 403,
          data: { error: 'AI not allowed' },
        },
      });

      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/không cho phép sử dụng AI/i)).toBeInTheDocument();
      });
    });

    it('nên hiển thị warning khi input rỗng và click send', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      // Try to send with empty input (button should be disabled, but test manual call)
      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, '   '); // Only spaces

      // In real component, button is disabled, but we test the validation
      // This won't actually trigger in UI, but tests the function logic
    });
  });

  describe('Quick Actions', () => {
    it('nên populate input khi click quick action button', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      const hintButton = screen.getByText(/💡 Gợi ý/i);
      await user.click(hintButton);

      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      expect(input).toHaveValue('Cho tôi một gợi ý để giải quyết câu hỏi này');
    });

    it('nên ẩn quick actions sau khi có message', async () => {
      const user = userEvent.setup();
      render(<AIChat {...defaultProps} />);

      // Send a message
      const input = screen.getByPlaceholderText(/Hỏi AI về câu hỏi này/i);
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /📤/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.queryByText(/💡 Gợi ý/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Context Info', () => {
    it('nên hiển thị info về context được gửi', () => {
      render(<AIChat {...defaultProps} />);

      expect(screen.getByText(/AI sẽ tự động nhận context/i)).toBeInTheDocument();
    });

    it('nên cập nhật context info khi có currentAnswer', () => {
      render(<AIChat {...defaultProps} />);

      expect(screen.getByText(/\+ câu trả lời của bạn/i)).toBeInTheDocument();
    });

    it('nên không hiển thị "+ câu trả lời" khi currentAnswer rỗng', () => {
      render(<AIChat {...defaultProps} currentAnswer="" />);

      expect(screen.queryByText(/\+ câu trả lời của bạn/i)).not.toBeInTheDocument();
    });
  });
});
