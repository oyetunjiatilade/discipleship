import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// ── Guards ──
import { RouteGuard } from '@/components/guards/RouteGuard';
import { PublicRoute } from '@/components/guards/PublicRoute';

// ── Layouts ──
import { AppLayout } from '@/components/layouts/AppLayout';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ConvertLayout } from '@/components/layouts/ConvertLayout';
import { MentorLayout } from '@/components/layouts/MentorLayout';

// ── Loading ──
import { PageLoader } from '@/components/ui/spinner';

// ── Auth pages (eager — needed immediately) ──
import LoginConvert from '@/pages/auth/LoginConvert';
import LoginAdmin from '@/pages/auth/LoginAdmin';
import LoginMentor from '@/pages/auth/LoginMentor';
import NotFound from '@/pages/NotFound';

// ── Lazy-loaded auth pages ──
const RegisterConvert = lazy(() => import('@/pages/auth/RegisterConvert'));

// ── Lazy-loaded convert pages ──
const ConvertDashboard = lazy(() => import('@/pages/convert/ConvertDashboard'));
const LessonsPage = lazy(() => import('@/pages/convert/LessonsPage'));
const LessonDetail = lazy(() => import('@/pages/convert/LessonDetail'));
const QuizPage = lazy(() => import('@/pages/convert/QuizPage'));
const NotificationsPage = lazy(() => import('@/pages/convert/NotificationsPage'));

// ── Lazy-loaded admin pages ──
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminConvertsPage = lazy(() => import('@/pages/admin/AdminConvertsPage'));
const LessonManagement = lazy(() => import('@/pages/admin/LessonManagement'));
const QuizManagement = lazy(() => import('@/pages/admin/QuizManagement'));
const AdminNotificationsPage = lazy(() => import('@/pages/admin/AdminNotificationsPage'));
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage'));

// ── Lazy-loaded convert pages (non-core) ──
const ProfilePage = lazy(() => import('@/pages/convert/ProfilePage'));

// ── New feature pages ──
const ChangePassword = lazy(() => import('@/pages/auth/ChangePassword'));
const MentorsPage = lazy(() => import('@/pages/admin/MentorsPage'));
const AdminFollowUpPage = lazy(() => import('@/pages/admin/AdminFollowUpPage'));
const MentorFlockPage = lazy(() => import('@/pages/mentor/MentorFlockPage'));
const MentorConvertDetailPage = lazy(() => import('@/pages/mentor/MentorConvertDetailPage'));
const CommunityPage = lazy(() => import('@/pages/convert/CommunityPage'));
const ConvertSessionsPage = lazy(() => import('@/pages/convert/SessionsPage'));
const CohortsPage = lazy(() => import('@/pages/admin/CohortsPage'));
const AdminSessionsPage = lazy(() => import('@/pages/admin/SessionsPage'));
const CoursesPage = lazy(() => import('@/pages/convert/CoursesPage'));
const WelcomePage = lazy(() => import('@/pages/convert/WelcomePage'));
const CoursesAdminPage = lazy(() => import('@/pages/admin/CoursesAdminPage'));
const BranchesPage = lazy(() => import('@/pages/admin/BranchesPage'));
const AdminsPage = lazy(() => import('@/pages/admin/AdminsPage'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  // ════════════════════════════════════════════
  //  PUBLIC ROUTES — login / registration
  // ════════════════════════════════════════════
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/login', element: <LoginConvert /> },
          {
            path: '/register',
            element: (
              <SuspenseWrapper>
                <RegisterConvert />
              </SuspenseWrapper>
            ),
          },
          { path: '/admin/login', element: <LoginAdmin /> },
          { path: '/mentor/login', element: <LoginMentor /> },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════
  //  CONVERT ROUTES — authenticated converts
  // ════════════════════════════════════════════
  {
    element: <RouteGuard allowedRole="convert" />,
    children: [
      {
        element: <ConvertLayout />,
        children: [
          {
            path: '/dashboard',
            element: (
              <SuspenseWrapper>
                <ConvertDashboard />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/lessons',
            element: (
              <SuspenseWrapper>
                <LessonsPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/lessons/:lessonId',
            element: (
              <SuspenseWrapper>
                <LessonDetail />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/lessons/:lessonId/quiz',
            element: (
              <SuspenseWrapper>
                <QuizPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/notifications',
            element: (
              <SuspenseWrapper>
                <NotificationsPage />
              </SuspenseWrapper>
            ),
          },
          { path: '/welcome', element: <SuspenseWrapper><WelcomePage /></SuspenseWrapper> },
          { path: '/courses', element: <SuspenseWrapper><CoursesPage /></SuspenseWrapper> },
          { path: '/community', element: <SuspenseWrapper><CommunityPage /></SuspenseWrapper> },
          { path: '/sessions', element: <SuspenseWrapper><ConvertSessionsPage /></SuspenseWrapper> },
          { path: '/profile', element: <SuspenseWrapper><ProfilePage /></SuspenseWrapper> },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════
  //  ADMIN ROUTES — authenticated admins
  // ════════════════════════════════════════════
  {
    element: <RouteGuard allowedRole={['admin', 'super_admin']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            path: '/admin',
            element: (
              <SuspenseWrapper>
                <AdminDashboard />
              </SuspenseWrapper>
            ),
          },
          { path: '/admin/lessons', element: <SuspenseWrapper><LessonManagement /></SuspenseWrapper> },
          { path: '/admin/lessons/:lessonId/quiz', element: <SuspenseWrapper><QuizManagement /></SuspenseWrapper> },
          { path: '/admin/converts', element: <SuspenseWrapper><AdminConvertsPage /></SuspenseWrapper> },
          { path: '/admin/reports', element: <SuspenseWrapper><AdminReportsPage /></SuspenseWrapper> },
          { path: '/admin/care', element: <SuspenseWrapper><AdminFollowUpPage /></SuspenseWrapper> },
          { path: '/admin/mentors', element: <SuspenseWrapper><MentorsPage /></SuspenseWrapper> },
          { path: '/admin/cohorts', element: <SuspenseWrapper><CohortsPage /></SuspenseWrapper> },
          { path: '/admin/sessions', element: <SuspenseWrapper><AdminSessionsPage /></SuspenseWrapper> },
          { path: '/admin/courses', element: <SuspenseWrapper><CoursesAdminPage /></SuspenseWrapper> },
          { path: '/admin/notifications', element: <SuspenseWrapper><AdminNotificationsPage /></SuspenseWrapper> },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════
  //  SUPER ADMIN ROUTES — branch management
  // ════════════════════════════════════════════
  {
    element: <RouteGuard allowedRole="super_admin" />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin/branches', element: <SuspenseWrapper><BranchesPage /></SuspenseWrapper> },
          { path: '/admin/admins', element: <SuspenseWrapper><AdminsPage /></SuspenseWrapper> },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════
  //  MENTOR ROUTES — authenticated mentors
  // ════════════════════════════════════════════
  {
    element: <RouteGuard allowedRole="mentor" />,
    children: [
      {
        element: <MentorLayout />,
        children: [
          { path: '/mentor/flock', element: <SuspenseWrapper><MentorFlockPage /></SuspenseWrapper> },
          { path: '/mentor/converts/:convertId', element: <SuspenseWrapper><MentorConvertDetailPage /></SuspenseWrapper> },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════
  //  CHANGE PASSWORD — any authenticated staff
  // ════════════════════════════════════════════
  {
    element: <RouteGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/change-password', element: <SuspenseWrapper><ChangePassword /></SuspenseWrapper> },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════
  //  ROOT REDIRECT + CATCH-ALL
  // ════════════════════════════════════════════
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <NotFound /> },
]);
