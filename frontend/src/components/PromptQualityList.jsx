/**
 * Prompt Quality List Component
 * Displays best and worst prompts with quality analysis
 */

import React, { useState } from 'react';
import './PromptQualityList.css';

const PromptQualityList = ({ topPrompts }) => {
  const [activeTab, setActiveTab] = useState('best');

  const { best = [], worst = [] } = topPrompts;

  const getQualityColor = level => {
    const colors = {
      'Xuất sắc': '#10b981',
      Tốt: '#3b82f6',
      'Trung bình': '#f59e0b',
      Yếu: '#ef4444',
      'Rất yếu': '#dc2626',
    };
    return colors[level] || '#6b7280';
  };

  const formatTime = dateString => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderPromptCard = (promptData, index) => {
    const { prompt, score, level, factors, timestamp } = promptData;

    return (
      <div key={index} className="prompt-card">
        <div className="prompt-header">
          <span className="prompt-rank">#{index + 1}</span>
          <span
            className="prompt-quality-badge"
            style={{ backgroundColor: getQualityColor(level), color: 'white' }}
          >
            {level} ({score}/5)
          </span>
          <span className="prompt-time">{formatTime(timestamp)}</span>
        </div>

        <div className="prompt-text">{prompt}</div>

        <div className="prompt-factors">
          <h5>Phân tích chi tiết:</h5>
          <div className="factors-grid">
            <div className={`factor ${factors.hasGoal ? 'pass' : 'fail'}`}>
              {factors.hasGoal ? '✅' : '❌'} Có mục tiêu rõ ràng
            </div>
            <div className={`factor ${factors.hasConstraints ? 'pass' : 'fail'}`}>
              {factors.hasConstraints ? '✅' : '❌'} Có ràng buộc/yêu cầu
            </div>
            <div className={`factor ${factors.hasContext ? 'pass' : 'fail'}`}>
              {factors.hasContext ? '✅' : '❌'} Cung cấp context
            </div>
            <div className={`factor ${factors.hasIteration ? 'pass' : 'fail'}`}>
              {factors.hasIteration ? '✅' : '❌'} Cải thiện từ prompt trước
            </div>
            <div className={`factor ${factors.showsThinking ? 'pass' : 'fail'}`}>
              {factors.showsThinking ? '✅' : '❌'} Thể hiện tư duy
            </div>
            <div className={`factor ${factors.isSpecific ? 'pass' : 'fail'}`}>
              {factors.isSpecific ? '✅' : '❌'} Cụ thể, chi tiết
            </div>
          </div>
        </div>
      </div>
    );
  };

  const prompts = activeTab === 'best' ? best : worst;

  return (
    <div className="prompt-quality-list">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'best' ? 'active' : ''}`}
          onClick={() => setActiveTab('best')}
        >
          🌟 Top 5 Prompts Tốt Nhất
        </button>
        <button
          className={`tab ${activeTab === 'worst' ? 'active' : ''}`}
          onClick={() => setActiveTab('worst')}
        >
          ⚠️ Top 5 Prompts Cần Cải Thiện
        </button>
      </div>

      <div className="prompts-container">
        {prompts.length > 0 ? (
          prompts.map((prompt, idx) => renderPromptCard(prompt, idx))
        ) : (
          <div className="empty-state">
            <p>Không có dữ liệu</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptQualityList;
