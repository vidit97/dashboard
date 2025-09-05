import React from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import GreDashboard from './pages/GreDashboard'
import { ApiTablesPage } from './pages/ApiTablesPage'

export default function App() {
  return (
    <Router>
      <div className="app">
        {/* Navigation */}
        <nav className="nav-bar">
          <div className="nav-container">
            <div className="nav-brand">
              <h1>Monitoring Dashboard</h1>
            </div>
            <div className="nav-links">
              <NavLink 
                to="/" 
                className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
              >
                MQTT Dashboard
              </NavLink>
              <NavLink 
                to="/gre" 
                className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
              >
                GRE
              </NavLink>
              <NavLink 
                to="/api-tables" 
                className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
              >
                API Tables
              </NavLink>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/gre" element={<GreDashboard />} />
          <Route path="/api-tables" element={<ApiTablesPage />} />
        </Routes>
      </div>
    </Router>
  )
}
