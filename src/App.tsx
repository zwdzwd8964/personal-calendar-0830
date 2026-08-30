import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from '@/components/common/Layout'
import Today from '@/pages/Today'
import Meals from '@/pages/Meals'
import Tasks from '@/pages/Tasks'
import Archive from '@/pages/Archive'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Today />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
