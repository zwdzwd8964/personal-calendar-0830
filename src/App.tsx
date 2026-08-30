import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import Layout from '@/components/common/Layout'
import Today from '@/pages/Today'
import Meals from '@/pages/Meals'
import Tasks from '@/pages/Tasks'
import Archive from '@/pages/Archive'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Today />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
