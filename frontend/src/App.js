import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import { UserProvider } from './contexts/UserContext';
import Layout from './components/Layout';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Employees from './pages/Employees';
import EditEmployee from './pages/EditEmployee';
import Competencies from './pages/Competencies';
import EditCompetency from './pages/EditCompetency';
import Jobs from './pages/Jobs';
import EditJob from './pages/EditJob';
import JobCompetencyMapping from './pages/JobCompetencyMapping';
import AddMapping from './pages/AddMapping';
import JobCriticality from './pages/JobCriticality';
import JobEvaluation from './pages/JobEvaluation';
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
import Reviews from './pages/user/Reviews';
import UserDashboard from './pages/user/UserDashboard';
import PhotoUpload from './pages/PhotoUpload';
// Manager Routes
import ManagerDashboard from './pages/manager/ManagerDashboard';
import TeamEmployees from './pages/manager/TeamEmployees';
import TeamJobs from './pages/manager/TeamJobs';
import TeamJCPs from './pages/manager/TeamJCPs';
import ManagerAssessments from './pages/manager/ManagerAssessments';

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
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="users" element={<Users />} />
                <Route path="groups" element={<Groups />} />
                <Route path="employees" element={<Employees />} />
                <Route path="employees/edit/:id" element={<EditEmployee />} />
                <Route path="competencies" element={<Competencies />} />
                <Route path="competencies/edit/:id" element={<EditCompetency />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="jobs/edit/:id" element={<EditJob />} />
                <Route path="job-competency-mapping" element={<JobCompetencyMapping />} />
                <Route path="add-mapping" element={<AddMapping />} />
                <Route path="job-criticality" element={<JobCriticality />} />
                <Route path="job-evaluation" element={<JobEvaluation />} />
                <Route path="assessors" element={<Assessors />} />
                <Route path="assessments" element={<NewAssessments />} />
                <Route path="question-bank" element={<QuestionBank />} />
                <Route path="photo-upload" element={<PhotoUpload />} />
                <Route path="test" element={<Test />} />
                {/* User Login */}
                <Route path="user-login" element={<UserLogin />} />
                {/* Unified User Routes (includes manager functionality) */}
                <Route path="user" element={<UserDashboard />} />
                <Route path="user/profile" element={<UserProfile />} />
                <Route path="user/competencies" element={<MyCompetencies />} />
                <Route path="user/assessments" element={<UserAssessments />} />
                <Route path="user/reviews" element={<Reviews />} />
                <Route path="user/team" element={<TeamEmployees />} />
                <Route path="user/jobs" element={<TeamJobs />} />
                <Route path="user/jcps" element={<TeamJCPs />} />
                <Route path="user/manager-assessments" element={<ManagerAssessments />} />
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
