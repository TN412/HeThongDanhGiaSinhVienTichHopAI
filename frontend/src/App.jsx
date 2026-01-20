import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AssignmentProvider } from './contexts/AssignmentContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import InstructorRegisterPage from './pages/InstructorRegisterPage';
import InstructorDashboard from './pages/InstructorDashboard';
import InstructorAssignmentListPage from './pages/InstructorAssignmentListPage';
import AssignmentPreviewPage from './pages/AssignmentPreviewPage';
import AssignmentPage from './pages/AssignmentPage';
import AssignmentCreatePage from './pages/AssignmentCreatePage';
import AILogsViewerPage from './pages/AILogsViewerPage';
import GradingPage from './pages/GradingPage';
import StudentAssignmentListPage from './pages/StudentAssignmentListPage';
import AssignmentTakingPage from './pages/AssignmentTakingPage';
import StudentResultsPage from './pages/StudentResultsPage';
import SubmissionPage from './pages/SubmissionPage';
import ReviewPage from './pages/ReviewPage';
import AssignmentView from './pages/AssignmentView';
import MySubmissionsPage from './pages/MySubmissionsPage';
import AIAssessmentReport from './pages/AIAssessmentReport';
import './App.css';

// Component để redirect legacy routes
function RedirectToStudentResults() {
  const { submissionId } = useParams();
  return <Navigate to={`/student/results/${submissionId}`} replace />;
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <AssignmentProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/register/instructor" element={<InstructorRegisterPage />} />

            {/* Protected routes with layout */}
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/login" replace />} />
              {/* Instructor routes - require instructor role */}
              <Route
                path="/instructor/dashboard"
                element={
                  <ProtectedRoute requiredRole="instructor">
                    <InstructorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/assignments"
                element={
                  <ProtectedRoute requiredRole="instructor">
                    <InstructorAssignmentListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/assignment/create"
                element={
                  <ProtectedRoute requiredRole="instructor">
                    <AssignmentCreatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/assignment/edit/:id"
                element={
                  <ProtectedRoute requiredRole="instructor">
                    <AssignmentCreatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assignment/:id/preview"
                element={
                  <ProtectedRoute requiredRole="instructor">
                    <AssignmentPreviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/ai-logs/:submissionId"
                element={
                  <ProtectedRoute requiredRole="instructor">
                    <AILogsViewerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/grade/:submissionId"
                element={
                  <ProtectedRoute requiredRole="instructor">
                    <GradingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/instructor/assessment/:submissionId"
                element={
                  <ProtectedRoute requiredRole="instructor">
                    <AIAssessmentReport />
                  </ProtectedRoute>
                }
              />
              {/* Student routes - require student role */}
              <Route
                path="/student/assignments"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentAssignmentListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/assignment/:submissionId"
                element={
                  <ProtectedRoute requiredRole="student">
                    <AssignmentTakingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/results/:submissionId"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/my-submissions"
                element={
                  <ProtectedRoute requiredRole="student">
                    <MySubmissionsPage />
                  </ProtectedRoute>
                }
              />{' '}
              {/* Assignment routes - any authenticated user */}
              <Route
                path="/assignment/:id"
                element={
                  <ProtectedRoute>
                    <AssignmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submission/:id"
                element={
                  <ProtectedRoute>
                    <SubmissionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assignment-view/:id"
                element={
                  <ProtectedRoute requiredRole="student">
                    <AssignmentView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/review/:submissionId"
                element={
                  <ProtectedRoute>
                    <ReviewPage />
                  </ProtectedRoute>
                }
              />
              {/* Legacy routes - redirect for backward compatibility */}
              <Route path="/results/:submissionId" element={<RedirectToStudentResults />} />
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AssignmentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
