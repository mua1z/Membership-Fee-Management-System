import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import LandingPageManager from './pages/LandingPageManager'
import NewsManager from './pages/NewsManager'
import ContentManagement from './pages/ContentManagement'
import Profile from './pages/Profile'
import UserManagement from './pages/UserManagement'
import AIAssistant from './pages/AIAssistant'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import Landing from './pages/Landing'
import AboutPage from './pages/AboutPage'
import FeaturesPage from './pages/FeaturesPage'
import GalleryPage from './pages/GalleryPage'
import NewsPage from './pages/NewsPage'
import Platform from './pages/Platform'
import Security from './pages/Security'
import Contact from './pages/Contact'
import Offline from './pages/Offline'
import UpdatePrompt from './components/UpdatePrompt'
import useServiceWorker from './hooks/useServiceWorker'
import useOnlineStatus from './hooks/useOnlineStatus'
import { useEffect } from 'react'
import { ToastProvider } from './components/Toast'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" />
}

function AppContent() {
  const { updateAvailable, applyUpdate } = useServiceWorker()
  const { isOffline } = useOnlineStatus()

  useEffect(() => {
    if (isOffline) {
      document.documentElement.classList.add('is-offline')
    } else {
      document.documentElement.classList.remove('is-offline')
    }
  }, [isOffline])

  return (
    <>
      <Routes>
        <Route path="/offline" element={<Offline />} />

        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/security" element={<Security />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/landing-page" element={<LandingPageManager />} />
          <Route path="settings/news" element={<ContentManagement />} />
          <Route path="profile" element={<Profile />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="ai-assistant" element={<AIAssistant />} />
        </Route>
      </Routes>

      <UpdatePrompt updateAvailable={updateAvailable} onUpdate={applyUpdate} />
    </>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </Router>
  )
}
