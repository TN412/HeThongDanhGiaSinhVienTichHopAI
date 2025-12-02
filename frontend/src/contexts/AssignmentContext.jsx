import { createContext, useContext, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';

// Create context
const AssignmentContext = createContext();

// Custom hook to use AssignmentContext
export const useAssignment = () => {
  const context = useContext(AssignmentContext);
  if (!context) {
    throw new Error('useAssignment must be used within AssignmentProvider');
  }
  return context;
};

/**
 * AssignmentProvider
 * Quản lý state và logic cho assignment/submission workflow
 *
 * Features:
 * - Auto-save draft mỗi 30 giây
 * - Track tab switches (visibilitychange)
 * - Manage current question index
 * - Control AI chat panel
 */
export function AssignmentProvider({ children }) {
  // State management
  const [submission, setSubmission] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs for auto-save
  const autoSaveIntervalRef = useRef(null);
  const lastSavedAnswersRef = useRef(null);

  /**
   * Auto-save draft every 30 seconds
   * Only saves if:
   * 1. Submission exists
   * 2. Status is 'draft'
   * 3. Answers have changed since last save
   */
  useEffect(() => {
    if (!submission || submission.status !== 'draft') {
      // Clear interval if submission is not draft
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      return;
    }

    // Setup auto-save interval (30 seconds)
    autoSaveIntervalRef.current = setInterval(async () => {
      try {
        // Check if answers have changed
        const currentAnswers = JSON.stringify(submission.answers);
        if (currentAnswers === lastSavedAnswersRef.current) {
          console.log('⏭️ Auto-save skipped: No changes detected');
          return;
        }

        // Call API to save draft
        await api.put(`/submission/${submission._id}`, {
          answers: submission.answers,
        });

        // Update last saved reference
        lastSavedAnswersRef.current = currentAnswers;

        console.log('✅ Draft auto-saved', {
          submissionId: submission._id,
          answersCount: submission.answers?.length || 0,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('❌ Auto-save failed:', error.response?.data || error.message);
      }
    }, 30000); // 30 seconds

    // Cleanup on unmount or when submission changes
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [submission]);

  /**
   * Track tab switches using visibilitychange event
   * Sends analytics event to backend when user switches away
   */
  useEffect(() => {
    if (!submission) return;

    const handleVisibilityChange = async () => {
      // Only track when tab becomes hidden (user switches away)
      if (document.hidden) {
        try {
          await api.post('/analytics/track-event', {
            submissionId: submission._id,
            eventType: 'tab_switch',
            timestamp: new Date().toISOString(),
            metadata: {
              questionIndex: currentQuestionIndex,
              aiChatOpen,
            },
          });

          console.log('📊 Tab switch tracked', {
            submissionId: submission._id,
            questionIndex: currentQuestionIndex,
          });
        } catch (error) {
          // Don't show error to user - analytics failures are non-critical
          console.warn('⚠️ Failed to track tab switch:', error.message);
        }
      }
    };

    // Add event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [submission, currentQuestionIndex, aiChatOpen]);

  /**
   * Load assignment data
   */
  const loadAssignment = async assignmentId => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/assignment/${assignmentId}`);
      setAssignment(response.data.assignment);
      return response.data.assignment;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to load assignment';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start or load submission
   */
  const loadSubmission = async submissionId => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/submission/${submissionId}`);
      setSubmission(response.data.submission);

      // Initialize last saved reference
      lastSavedAnswersRef.current = JSON.stringify(response.data.submission.answers);

      return response.data.submission;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to load submission';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start new submission
   */
  const startSubmission = async assignmentId => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/submission/start', { assignmentId });
      setSubmission(response.data.submission);

      // Initialize last saved reference
      lastSavedAnswersRef.current = JSON.stringify(response.data.submission.answers);

      console.log('✅ Submission started', {
        submissionId: response.data.submission._id,
        assignmentId,
      });

      return response.data.submission;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to start submission';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update answer for current question
   */
  const updateAnswer = (questionId, answer) => {
    if (!submission) return;

    setSubmission(prev => {
      const updatedAnswers = [...(prev.answers || [])];
      const existingIndex = updatedAnswers.findIndex(a => a.questionId === questionId);

      if (existingIndex >= 0) {
        // Update existing answer
        updatedAnswers[existingIndex] = {
          ...updatedAnswers[existingIndex],
          answer,
        };
      } else {
        // Add new answer
        updatedAnswers.push({
          questionId,
          answer,
          aiInteractionCount: 0,
        });
      }

      return {
        ...prev,
        answers: updatedAnswers,
      };
    });
  };

  /**
   * Manual save (for explicit save button)
   */
  const saveManually = async () => {
    if (!submission || submission.status !== 'draft') {
      throw new Error('Cannot save: submission is not in draft state');
    }

    try {
      await api.put(`/submission/${submission._id}`, {
        answers: submission.answers,
      });

      // Update last saved reference
      lastSavedAnswersRef.current = JSON.stringify(submission.answers);

      console.log('💾 Manual save successful', {
        submissionId: submission._id,
      });

      return true;
    } catch (error) {
      console.error('❌ Manual save failed:', error);
      throw error;
    }
  };

  /**
   * Submit assignment (final submission)
   */
  const submitAssignment = async () => {
    if (!submission) {
      throw new Error('No submission to submit');
    }

    try {
      const response = await api.post(`/submission/${submission._id}/submit`);

      // Update submission with submitted data
      setSubmission(response.data.submission);

      console.log('✅ Assignment submitted', {
        submissionId: submission._id,
        finalScore: response.data.submission.finalScore,
      });

      return response.data;
    } catch (error) {
      console.error('❌ Submit failed:', error);
      throw error;
    }
  };

  /**
   * Navigate to next question
   */
  const nextQuestion = () => {
    if (!assignment) return;
    const maxIndex = assignment.questions.length - 1;
    setCurrentQuestionIndex(prev => Math.min(prev + 1, maxIndex));
  };

  /**
   * Navigate to previous question
   */
  const previousQuestion = () => {
    setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
  };

  /**
   * Go to specific question
   */
  const goToQuestion = index => {
    if (!assignment) return;
    const maxIndex = assignment.questions.length - 1;
    setCurrentQuestionIndex(Math.max(0, Math.min(index, maxIndex)));
  };

  /**
   * Toggle AI chat panel
   */
  const toggleAiChat = () => {
    setAiChatOpen(prev => !prev);
  };

  // Context value
  const value = {
    // State
    submission,
    assignment,
    currentQuestionIndex,
    aiChatOpen,
    loading,
    error,

    // Actions
    setSubmission,
    setAssignment,
    setCurrentQuestionIndex,
    setAiChatOpen,
    loadAssignment,
    loadSubmission,
    startSubmission,
    updateAnswer,
    saveManually,
    submitAssignment,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    toggleAiChat,
  };

  return <AssignmentContext.Provider value={value}>{children}</AssignmentContext.Provider>;
}

AssignmentProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AssignmentContext;
