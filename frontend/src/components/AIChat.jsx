import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';
import './AIChat.css';

/**
 * AIChat Component
 * AI Assistant panel for helping students during assignments (Messenger-style popup)
 *
 * Features:
 * - Real-time chat with OpenAI
 * - Automatic context sending (current question + answer)
 * - Token usage tracking
 * - Beautiful error handling
 * - Message history
 * - Loading states
 * - Rate limiting with countdown
 * - Floating button with popup window
 * - Minimize/maximize functionality
 */
function AIChat({ submissionId, questionId, questionText = '', currentAnswer = '' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim()) {
      setError('⚠️ Vui lòng nhập câu hỏi');
      return;
    }

    // Clear error
    setError(null);

    // Add user message to chat
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear input
    const prompt = input;
    setInput('');
    setLoading(true);

    try {
      // Build context from current question and answer
      const context = buildContext();

      // Call API
      const response = await api.post('/ai/chat', {
        prompt,
        submissionId,
        questionId,
        context,
      });

      // Add AI response to chat
      const aiMessage = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString(),
        tokensUsed: response.data.tokensUsed,
      };
      setMessages(prev => [...prev, aiMessage]);

      // Update total tokens
      setTotalTokens(prev => prev + (response.data.tokensUsed || 0));

      console.log('✅ AI response received', {
        tokensUsed: response.data.tokensUsed,
        messageLength: response.data.message.length,
      });
    } catch (err) {
      console.error('❌ AI chat error:', err);
      console.error('Response data:', err.response?.data);
      console.error('Response status:', err.response?.status);

      // Handle different error types
      let errorMessage = 'Không thể kết nối với AI. Vui lòng thử lại.';

      if (err.response?.status === 403) {
        errorMessage = '🚫 Bài tập này không cho phép sử dụng AI.';
      } else if (err.response?.status === 429) {
        // Rate limit error with remaining time
        const errorData = err.response?.data;
        if (errorData?.code === 'RATE_LIMIT' && errorData?.resetTime) {
          const resetTime = new Date(errorData.resetTime);
          const now = new Date();
          const minutesLeft = Math.ceil((resetTime - now) / 60000);
          errorMessage = `⏱️ Bạn đã hỏi quá nhanh. Thử lại sau ${minutesLeft} phút.`;
        } else {
          errorMessage = '⏱️ Bạn đã hỏi quá nhiều. Vui lòng đợi một chút.';
        }
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      setError(errorMessage);

      // Add error message to chat
      const errorMsg = {
        role: 'error',
        content: errorMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Build context from current state
  const buildContext = () => {
    let context = '';

    if (questionText) {
      context += `Câu hỏi hiện tại: ${questionText}\n\n`;
    }

    if (currentAnswer && currentAnswer.trim()) {
      context += `Câu trả lời hiện tại của sinh viên: ${currentAnswer}\n\n`;
    }

    return context;
  };

  // Handle Enter key
  const handleKeyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick action buttons
  const quickActions = [
    { label: '💡 Gợi ý', prompt: 'Cho tôi một gợi ý để giải quyết câu hỏi này' },
    { label: '🔍 Giải thích', prompt: 'Giải thích câu hỏi này cho tôi hiểu rõ hơn' },
    { label: '✅ Kiểm tra', prompt: 'Kiểm tra xem câu trả lời của tôi có đúng hướng không?' },
  ];

  const handleQuickAction = prompt => {
    setInput(prompt);
  };

  return (
    <>
      {/* Floating Button */}
      <button className="ai-chat-float-button" onClick={() => setIsOpen(!isOpen)}>
        <span className="float-icon">💬</span>
        {totalTokens > 0 && <span className="float-badge">{totalTokens}</span>}
      </button>

      {/* Popup Window */}
      {isOpen && (
        <div className={`ai-chat-popup ${isMinimized ? 'minimized' : ''}`}>
          <div className="ai-chat-content">
            {/* Header */}
            <div className="ai-chat-header">
              <div className="header-left">
                <span className="ai-icon">🤖</span>
                <div>
                  <h3>AI Assistant</h3>
                  <p className="header-subtitle">Hỏi AI để được hỗ trợ</p>
                </div>
              </div>
              <div className="header-actions">
                <div className="token-counter">
                  <span className="token-icon">🪙</span>
                  <span className="token-count">{totalTokens}</span>
                </div>
                <button
                  className="header-btn minimize-btn"
                  onClick={() => setIsMinimized(!isMinimized)}
                  title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
                >
                  {isMinimized ? '🔼' : '🔽'}
                </button>
                <button
                  className="header-btn close-btn"
                  onClick={() => setIsOpen(false)}
                  title="Đóng"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages List */}
            {!isMinimized && (
              <>
                <div className="messages-container">
                  {messages.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-icon">💬</div>
                      <h4>Chào bạn!</h4>
                      <p>Tôi là AI Assistant. Hãy hỏi tôi bất cứ điều gì về câu hỏi này.</p>
                      <div className="tips">
                        <p className="tips-title">💡 Tips để hỏi hiệu quả:</p>
                        <ul>
                          <li>Mô tả rõ vấn đề bạn gặp phải</li>
                          <li>Cho tôi biết bạn đã thử gì</li>
                          <li>Đặt câu hỏi cụ thể và rõ ràng</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div key={idx} className={`message message-${msg.role}`}>
                      <div className="message-avatar">
                        {msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '🤖' : '⚠️'}
                      </div>
                      <div className="message-content">
                        <div className="message-text">{msg.content}</div>

                        {/* Token usage for AI messages */}
                        {msg.role === 'assistant' && msg.tokensUsed && (
                          <div className="message-metadata">
                            <span className="tokens-badge">🪙 {msg.tokensUsed} tokens</span>
                            <span className="timestamp">
                              {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {loading && (
                    <div className="message message-assistant">
                      <div className="message-avatar">🤖</div>
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Error banner */}
                {error && (
                  <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>✕</button>
                  </div>
                )}

                {/* Quick Actions */}
                {messages.length === 0 && (
                  <div className="quick-actions">
                    <p className="quick-actions-label">Câu hỏi nhanh:</p>
                    <div className="quick-actions-buttons">
                      {quickActions.map((action, idx) => (
                        <button
                          key={idx}
                          className="quick-action-button"
                          onClick={() => handleQuickAction(action.prompt)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="input-area">
                  <textarea
                    className="chat-input"
                    placeholder="Hỏi AI về câu hỏi này... (Enter để gửi, Shift+Enter để xuống dòng)"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    rows={3}
                  />
                  <div className="input-buttons">
                    <button
                      className="send-button"
                      onClick={sendMessage}
                      disabled={loading || !input.trim()}
                    >
                      {loading ? '⏳' : '📤'}
                    </button>
                  </div>
                </div>

                {/* Context Info */}
                <div className="context-info">
                  <p>
                    ℹ️ AI sẽ tự động nhận context: câu hỏi hiện tại
                    {currentAnswer && currentAnswer.trim() && ' + câu trả lời của bạn'}
                  </p>
                  <p>💡 AI có thể sai. Hãy kiểm tra kỹ thông tin.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

AIChat.propTypes = {
  submissionId: PropTypes.string.isRequired,
  questionId: PropTypes.string.isRequired,
  questionText: PropTypes.string,
  currentAnswer: PropTypes.string,
};

export default AIChat;
