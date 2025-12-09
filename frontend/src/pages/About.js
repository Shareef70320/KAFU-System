import React from 'react';
import { 
  BookOpen, 
  Users, 
  Briefcase, 
  Target, 
  Settings, 
  UserCheck, 
  BarChart3,
  Layers,
  MessageSquare,
  Calendar,
  FileText,
  Database,
  Code,
  Shield,
  Zap,
  CheckCircle2,
  Info
} from 'lucide-react';

const About = () => {
  const features = [
    {
      category: "Employee Management",
      icon: Users,
      color: "blue",
      items: [
        "Complete employee database with 1,254+ employees",
        "Card-based layout with search and filtering",
        "Employee profile management with photo upload",
        "Job Competency Profile (JCP) integration",
        "Assessor status indicators",
        "Full CRUD operations for employee data",
        "Group-based exception management (by manager, division, location, unit)"
      ]
    },
    {
      category: "Jobs Management",
      icon: Briefcase,
      color: "green",
      items: [
        "471+ job positions management",
        "Job profile with complete job description (JD)",
        "Job Competency Profile (JCP) linking",
        "JCP code assignment and management",
        "Multi-job JCP grouping capability",
        "Job details view with full information",
        "Statistics: Total Jobs, With JCP, Without JCP"
      ]
    },
    {
      category: "Competency Framework",
      icon: BookOpen,
      color: "purple",
      items: [
        "207+ competencies with complete definitions",
        "Competency types: Technical and Non-Technical",
        "Competency families with centralized management",
        "Four competency levels: Aware, Knowledge, Skilled, Mastery",
        "Competency elements linked to each level",
        "Performance indicators for each element",
        "Competency code system for unique identification",
        "Related division tracking",
        "Export functionality: CSV, JSON, PDF, HTML Editor",
        "Filter by Type, Family, and Related Division",
        "Bulk add elements and indicators",
        "Competency view modal with full details"
      ]
    },
    {
      category: "Job-Competency Mapping",
      icon: Target,
      color: "orange",
      items: [
        "Link multiple jobs to the same competency profile",
        "JCP code assignment and management",
        "Required competency levels per job",
        "Create and edit job competency profiles",
        "Visual indicators for jobs with/without JCP",
        "Group apply JCP to multiple jobs",
        "Profile validation and duplicate prevention"
      ]
    },
    {
      category: "Assessment System",
      icon: UserCheck,
      color: "red",
      items: [
        "Assessment cycle management with activation periods",
        "Assessment components: System, Employee Self, Assessor, Manager",
        "Component-based assessment flow",
        "Question bank for system assessments",
        "Employee self-assessment with level confirmation",
        "Manager assessment for team members",
        "Assessor assessment workflow",
        "Assessment history and tracking",
        "Cycle exceptions (individual and group-based)",
        "Assessment dashboard with all results",
        "Retake assessment functionality"
      ]
    },
    {
      category: "Competency Reviews",
      icon: MessageSquare,
      color: "teal",
      items: [
        "Book review with assessors",
        "Assessor acceptance/rejection workflow",
        "Review scheduling with date and location",
        "Review request history tracking",
        "Review status management",
        "Timeline view of review process"
      ]
    },
    {
      category: "Individual Development Plan (IDP)",
      icon: Layers,
      color: "indigo",
      items: [
        "Create IDP based on competency gaps",
        "Link to Learning & Development interventions",
        "Intervention categories, types, and instances",
        "Active/inactive intervention management",
        "IDP tracking and progress monitoring"
      ]
    },
    {
      category: "Learning & Development",
      icon: FileText,
      color: "pink",
      items: [
        "Intervention categories management",
        "Intervention types with activation control",
        "Intervention instances",
        "Active/inactive toggle for all interventions",
        "Integration with IDP creation"
      ]
    },
    {
      category: "Assessor Management",
      icon: Shield,
      color: "amber",
      items: [
        "Assign assessors to competencies",
        "Assessor dashboard for review management",
        "Accept/reject review requests",
        "Schedule review sessions",
        "Assessor competency mapping"
      ]
    },
    {
      category: "Settings & Configuration",
      icon: Settings,
      color: "gray",
      items: [
        "Competency Levels terminology management",
        "Level display names and activation",
        "Assessment cycle configuration",
        "Assessment components per cycle",
        "Cycle activation periods",
        "Exception management"
      ]
    },
    {
      category: "Development Paths",
      icon: Layers,
      color: "cyan",
      items: [
        "Career development path creation",
        "Path details and progression tracking",
        "User development path viewing"
      ]
    },
    {
      category: "Reports & Analytics",
      icon: BarChart3,
      color: "emerald",
      items: [
        "Dashboard statistics",
        "Competency framework statistics",
        "Job and employee statistics",
        "Assessment completion tracking"
      ]
    }
  ];

  const userRoles = [
    {
      role: "Administrator (ADMIN)",
      description: "Full system access with complete management capabilities",
      access: [
        "Employee Management",
        "Jobs Management",
        "Competency Framework",
        "Job-Competency Mapping",
        "Assessment Configuration",
        "Assessor Management",
        "User Management",
        "Settings & Configuration",
        "Question Bank Management",
        "Development Paths",
        "L&D Interventions"
      ]
    },
    {
      role: "Manager",
      description: "Team management and assessment capabilities for direct reports",
      access: [
        "My Team view (direct and indirect reports)",
        "Team Jobs",
        "Team JCPs",
        "Manager Assessments",
        "IDP creation for team members",
        "Team competency gap analysis"
      ]
    },
    {
      role: "Employee (USER)",
      description: "Self-service portal for personal competency management",
      access: [
        "My Profile",
        "My Competencies",
        "Self-Assessments",
        "Assessment History",
        "My IDP",
        "Competency Reviews",
        "My Development Paths"
      ]
    },
    {
      role: "Assessor",
      description: "Specialized role for conducting competency reviews",
      access: [
        "Assessor Dashboard",
        "Review Request Management",
        "Accept/Reject Reviews",
        "Schedule Review Sessions",
        "Complete Review Assessments"
      ]
    }
  ];

  const processes = [
    {
      name: "Competency Assessment Process",
      steps: [
        "Admin configures assessment cycle with components",
        "Cycle is activated for specific period",
        "Employee receives notification (if applicable)",
        "System Assessment: Employee takes online assessment (if enabled)",
        "Employee Self Assessment: Employee selects their competency level (if enabled)",
        "Manager Assessment: Manager reviews and confirms employee level (if enabled)",
        "Assessor Assessment: Assessor conducts review session (if enabled)",
        "Results are compiled and displayed in dashboard",
        "Gaps are identified for IDP creation"
      ]
    },
    {
      name: "Job Competency Profile Creation",
      steps: [
        "Admin selects job(s) for JCP creation",
        "JCP code is assigned (can be shared across multiple jobs)",
        "Competencies are selected and linked to the job",
        "Required competency levels are set for each competency",
        "Profile is saved and linked to all selected jobs",
        "Employees in those jobs automatically inherit the JCP"
      ]
    },
    {
      name: "Competency Review Booking",
      steps: [
        "Employee views their competencies and assessment results",
        "Employee books review with assigned assessor",
        "Assessor receives review request",
        "Assessor accepts or rejects the request",
        "If accepted, assessor schedules date and location",
        "Employee is notified of scheduled review",
        "Review session is conducted",
        "Results are recorded in the system"
      ]
    },
    {
      name: "IDP Creation Process",
      steps: [
        "Manager identifies competency gap for employee",
        "Manager selects competency requiring development",
        "System shows available L&D interventions",
        "Manager selects appropriate intervention",
        "IDP is created and assigned to employee",
        "Employee can view and track their IDP progress"
      ]
    }
  ];

  const technicalInfo = {
    frontend: [
      "React 18 with modern hooks",
      "React Router for navigation",
      "TanStack Query (React Query) for data fetching",
      "Tailwind CSS for styling",
      "Lucide React for icons",
      "Responsive design (mobile, tablet, desktop)"
    ],
    backend: [
      "Node.js with Express.js",
      "Prisma ORM for database management",
      "PostgreSQL database",
      "RESTful API architecture",
      "Role-based access control (RBAC)"
    ],
    infrastructure: [
      "Docker containerization",
      "PostgreSQL database with migrations",
      "File upload support",
      "Excel import/export functionality",
      "PDF generation capabilities"
    ],
    data: [
      "1,254+ employees",
      "471+ job positions",
      "207+ competencies",
      "Multiple competency families",
      "Assessment cycles and history",
      "Review requests and history"
    ]
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <Info className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">About KAFU System</h1>
            <p className="text-gray-600 mt-1">Knowledge, Assessment, Framework & Understanding</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p className="text-sm text-blue-700 mt-2">
            This page provides a comprehensive overview of the KAFU System features, processes, and capabilities. 
            It is designed to be easily updated as new features are added to the system.
          </p>
        </div>
      </div>

      {/* System Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="h-6 w-6 text-green-600" />
          System Overview
        </h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-gray-700 leading-relaxed mb-4">
            The KAFU (Knowledge, Assessment, Framework & Understanding) System is a comprehensive competency 
            management platform designed for Oman Airports. It enables organizations to manage employee competencies, 
            conduct assessments, track development, and align job requirements with employee capabilities.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">1,254+</div>
              <div className="text-sm text-green-600 mt-1">Employees</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">471+</div>
              <div className="text-sm text-blue-600 mt-1">Job Positions</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-700">207+</div>
              <div className="text-sm text-purple-600 mt-1">Competencies</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features by Module */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          Features by Module
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const colorClasses = {
              blue: "bg-blue-50 border-blue-200 text-blue-700",
              green: "bg-green-50 border-green-200 text-green-700",
              purple: "bg-purple-50 border-purple-200 text-purple-700",
              orange: "bg-orange-50 border-orange-200 text-orange-700",
              red: "bg-red-50 border-red-200 text-red-700",
              teal: "bg-teal-50 border-teal-200 text-teal-700",
              indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
              pink: "bg-pink-50 border-pink-200 text-pink-700",
              amber: "bg-amber-50 border-amber-200 text-amber-700",
              gray: "bg-gray-50 border-gray-200 text-gray-700",
              cyan: "bg-cyan-50 border-cyan-200 text-cyan-700",
              emerald: "bg-emerald-50 border-emerald-200 text-emerald-700"
            };
            return (
              <div 
                key={index}
                className={`bg-white rounded-lg shadow-sm border-2 ${colorClasses[feature.color]?.split(' ')[1]} p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${colorClasses[feature.color]?.split(' ')[0]}`}>
                    <Icon className={`h-5 w-5 ${colorClasses[feature.color]?.split(' ')[2]}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{feature.category}</h3>
                </div>
                <ul className="space-y-2">
                  {feature.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* User Roles & Access */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-green-600" />
          User Roles & Access
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userRoles.map((role, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{role.role}</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm">{role.description}</p>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Access Includes:</h4>
                <ul className="space-y-1">
                  {role.access.map((access, accessIndex) => (
                    <li key={accessIndex} className="text-sm text-gray-600 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{access}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Processes */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-green-600" />
          Key Processes & Workflows
        </h2>
        <div className="space-y-6">
          {processes.map((process, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                {process.name}
              </h3>
              <ol className="space-y-2 ml-6">
                {process.steps.map((step, stepIndex) => (
                  <li key={stepIndex} className="text-gray-700 flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                      {stepIndex + 1}
                    </span>
                    <span className="text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Information */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Code className="h-6 w-6 text-green-600" />
          Technical Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-600" />
              Frontend Technology
            </h3>
            <ul className="space-y-2">
              {technicalInfo.frontend.map((tech, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-blue-600 mt-1">▸</span>
                  <span>{tech}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              Backend Technology
            </h3>
            <ul className="space-y-2">
              {technicalInfo.backend.map((tech, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-green-600 mt-1">▸</span>
                  <span>{tech}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Infrastructure
            </h3>
            <ul className="space-y-2">
              {technicalInfo.infrastructure.map((item, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-purple-600 mt-1">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              Current Data
            </h3>
            <ul className="space-y-2">
              {technicalInfo.data.map((item, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-orange-600 mt-1">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Update Instructions */}
      <section className="mb-12">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            <Info className="h-5 w-5 text-yellow-700" />
            How to Update This Page
          </h3>
          <p className="text-sm text-yellow-800 mb-3">
            This About page is designed to be easily updated when new features are added. To update:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
            <li>Open <code className="bg-yellow-100 px-1 rounded">frontend/src/pages/About.js</code></li>
            <li>Locate the relevant section (Features, User Roles, Processes, or Technical Info)</li>
            <li>Add new items to the appropriate array</li>
            <li>Update the "Last Updated" date if needed</li>
            <li>Save and test the changes</li>
          </ol>
        </div>
      </section>

      {/* Footer Note */}
      <div className="text-center text-sm text-gray-500 mt-8 pt-6 border-t border-gray-200">
        <p>KAFU System - Knowledge, Assessment, Framework & Understanding</p>
        <p className="mt-1">© {new Date().getFullYear()} Oman Airports. All rights reserved.</p>
      </div>
    </div>
  );
};

export default About;

