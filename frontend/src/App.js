import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import { UserProvider } from './contexts/UserContext';
import Layout from './components/Layout';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import AdminRoute from './components/AdminRoute';
import UserRoute from './components/UserRoute';
import ClinicRoute from './components/ClinicRoute';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Employees from './pages/Employees';
import EditEmployee from './pages/EditEmployee';
import Competencies from './pages/Competencies';
import ViewCompetency from './pages/ViewCompetency';
import EditCompetency from './pages/EditCompetency';
import AddCompetency from './pages/AddCompetency';
import CompetencyFamilies from './pages/CompetencyFamilies';
import Jobs from './pages/Jobs';
import ViewJob from './pages/ViewJob';
import EditJob from './pages/EditJob';
import JobCompetencyMapping from './pages/JobCompetencyMapping';
import AddMapping from './pages/AddMapping';
import EditMapping from './pages/EditMapping';
import JobCriticality from './pages/JobCriticality';
import JobEvaluation from './pages/JobEvaluation';
import DevelopmentPaths from './pages/DevelopmentPaths';
import PathDetails from './pages/PathDetails';
import LDInterventions from './pages/LDInterventions';
import Assessors from './pages/Assessors';
import Assessments from './pages/Assessments';
import NewAssessments from './pages/NewAssessments';
import QuestionBank from './pages/QuestionBank';
import Dashboard from './pages/Dashboard';
import Test from './pages/Test';
import UserLogin from './pages/UserLogin';
import UserProfile from './pages/user/UserProfile';
import MyCompetencies from './pages/user/MyCompetencies';
import UserAssessments from './pages/user/UserAssessments';
import MyIDP from './pages/user/MyIDP';
import Reviews from './pages/user/Reviews';
import UserDashboard from './pages/user/UserDashboard';
// removed DevelopmentTimeline
import MyDevelopmentPaths from './pages/user/MyDevelopmentPaths';
import PathDetailsUser from './pages/user/PathDetailsUser';
import PhotoUpload from './pages/PhotoUpload';
// Manager Routes
import ManagerDashboard from './pages/manager/ManagerDashboard';
import TeamEmployees from './pages/manager/TeamEmployees';
import TeamJobs from './pages/manager/TeamJobs';
import TeamJCPs from './pages/manager/TeamJCPs';
import ManagerAssessments from './pages/manager/ManagerAssessments';
// Admin Routes
import AssessorDashboard from './pages/AssessorDashboard';
import Settings from './pages/Settings';
import About from './pages/About';
import KafuClinic from './pages/KafuClinic';
import EditCompetencyClinic from './pages/EditCompetencyClinic';
import EditRequestReview from './pages/EditRequestReview';
import ViewJCP from './pages/ViewJCP';
import EditJCPClinic from './pages/EditJCPClinic';
import ExportData from './pages/ExportData';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route
                path="/"
                element={<Layout />}
              >
                <Route index element={<RoleBasedRedirect />} />
                <Route path="dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
                <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
                <Route path="groups" element={<AdminRoute><Groups /></AdminRoute>} />
                <Route path="employees" element={<AdminRoute><Employees /></AdminRoute>} />
                <Route path="employees/edit/:sid" element={<AdminRoute><EditEmployee /></AdminRoute>} />
                <Route path="competencies" element={<AdminRoute><Competencies /></AdminRoute>} />
                <Route path="competencies/add" element={<AdminRoute><AddCompetency /></AdminRoute>} />
                <Route path="competencies/edit/:id" element={<AdminRoute><EditCompetency /></AdminRoute>} />
                <Route path="competencies/view/:id" element={<ClinicRoute><ViewCompetency /></ClinicRoute>} />
                <Route path="competency-families" element={<AdminRoute><CompetencyFamilies /></AdminRoute>} />
                <Route path="jobs" element={<AdminRoute><Jobs /></AdminRoute>} />
                <Route path="jobs/view/:id" element={<AdminRoute><ViewJob /></AdminRoute>} />
                <Route path="jobs/edit/:id" element={<AdminRoute><EditJob /></AdminRoute>} />
                <Route path="job-competency-mapping" element={<AdminRoute><JobCompetencyMapping /></AdminRoute>} />
                <Route path="add-mapping" element={<AdminRoute><AddMapping /></AdminRoute>} />
                <Route path="edit-mapping/:jobId" element={<AdminRoute><EditMapping /></AdminRoute>} />
                <Route path="job-criticality" element={<AdminRoute><JobCriticality /></AdminRoute>} />
                <Route path="job-evaluation" element={<AdminRoute><JobEvaluation /></AdminRoute>} />
                <Route path="assessors" element={<AdminRoute><Assessors /></AdminRoute>} />
                <Route path="development-paths" element={<AdminRoute><DevelopmentPaths /></AdminRoute>} />
                <Route path="development-paths/:id" element={<AdminRoute><PathDetails /></AdminRoute>} />
                <Route path="ld-interventions" element={<AdminRoute><LDInterventions /></AdminRoute>} />
                <Route path="assessor-dashboard" element={<UserRoute><AssessorDashboard /></UserRoute>} />
                <Route path="assessments" element={<AdminRoute><NewAssessments /></AdminRoute>} />
                <Route path="question-bank" element={<AdminRoute><QuestionBank /></AdminRoute>} />
                <Route path="photo-upload" element={<AdminRoute><PhotoUpload /></AdminRoute>} />
                <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
                <Route path="settings/level-terminology" element={<AdminRoute><Settings /></AdminRoute>} />
                <Route path="settings/assessment-cycle" element={<AdminRoute><Settings /></AdminRoute>} />
                <Route path="settings/export-data" element={<AdminRoute><ExportData /></AdminRoute>} />
                <Route path="about" element={<About />} />
                <Route path="kafu-clinic" element={<ClinicRoute><KafuClinic /></ClinicRoute>} />
                <Route path="kafu-clinic/competency/edit/:id" element={<ClinicRoute><EditCompetencyClinic /></ClinicRoute>} />
                <Route path="kafu-clinic/jcp/view/:jcpCode" element={<ClinicRoute><ViewJCP /></ClinicRoute>} />
                <Route path="kafu-clinic/jcp/edit/:jcpCode" element={<ClinicRoute><EditJCPClinic /></ClinicRoute>} />
                <Route path="kafu-clinic/edit-requests" element={<AdminRoute><EditRequestReview /></AdminRoute>} />
                <Route path="test" element={<Test />} />
                {/* User Login */}
                <Route path="user-login" element={<UserLogin />} />
                {/* Unified User Routes (includes manager functionality) */}
                <Route path="user" element={<UserRoute><UserDashboard /></UserRoute>} />
                <Route path="user/profile" element={<UserRoute><UserProfile /></UserRoute>} />
                <Route path="user/competencies" element={<UserRoute><MyCompetencies /></UserRoute>} />
                <Route path="user/assessments" element={<UserRoute><UserAssessments /></UserRoute>} />
                <Route path="user/my-idp" element={<UserRoute><MyIDP /></UserRoute>} />
                {/* removed user/development route */}
                <Route path="user/my-development-paths" element={<UserRoute><MyDevelopmentPaths /></UserRoute>} />
                <Route path="user/my-development-paths/:id" element={<UserRoute><PathDetailsUser /></UserRoute>} />
                <Route path="user/reviews" element={<UserRoute><Reviews /></UserRoute>} />
                <Route path="user/team" element={<UserRoute><TeamEmployees /></UserRoute>} />
                <Route path="user/jobs" element={<UserRoute><TeamJobs /></UserRoute>} />
                <Route path="user/jcps" element={<UserRoute><TeamJCPs /></UserRoute>} />
                <Route path="user/manager-assessments" element={<UserRoute><ManagerAssessments /></UserRoute>} />
              </Route>
            </Routes>
            <Toaster />
          </div>
        </Router>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
// Force deployment - Sun Oct 19 10:56:35 +04 2025
