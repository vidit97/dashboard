// V1 Dashboard Types
export interface GlobalState {
  broker: string
  autoRefresh: boolean
  refreshInterval: number // seconds
  searchTerm: string
  sidebarOpen: boolean
  showOriginalNavbar: boolean
}

export interface StatusDot {
  color: 'green' | 'amber' | 'red'
  message: string
}

export interface TopBarProps {
  brokerStatus: StatusDot
  onBrokerChange: (broker: string) => void
  onSearchChange: (term: string) => void
  onRefreshToggle: (enabled: boolean) => void
  onNowClick: () => void
  onSidebarToggle: () => void
  onHomeClick: () => void
  onOriginalNavbarToggle: () => void
  globalState: GlobalState
}

export interface LeftNavProps {
  currentPage: string
  onPageChange: (page: string) => void
  isOpen: boolean
}

// Page definitions matching watchmqtt_ui_setup.md
export const V1_PAGES = [
  { id: 'overview', label: 'Overview', icon: '📊', path: '/v1/overview' },
  { id: 'clients', label: 'Clients', icon: '👥', path: '/v1/clients' },
  { id: 'sessions', label: 'Sessions', icon: '🔄', path: '/v1/sessions' },
  { id: 'subscriptions', label: 'Subscriptions', icon: '📬', path: '/v1/subscriptions' },
  { id: 'topics', label: 'Topics', icon: '📝', path: '/v1/topics' },
  { id: 'acl', label: 'ACL', icon: '🔒', path: '/v1/acl' },
  { id: 'events', label: 'Events', icon: '📅', path: '/v1/events' },
  { id: 'alerts', label: 'Alerts', icon: '⚠️', path: '/v1/alerts' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/v1/settings' },
  { id: 'diagnostics', label: 'Diagnostics', icon: '🔍', path: '/v1/diagnostics' },
] as const

export type V1PageId = typeof V1_PAGES[number]['id']