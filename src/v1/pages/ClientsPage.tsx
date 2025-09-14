import React, { useState } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'

interface Client {
  client: string
  username: string
  last_seen: string
  session_state: 'open' | 'closed'
  ip_port: string
  protocol_ver: string
  keepalive: number
  subs_count: number
  pubs_24h: number
  bytes_24h: number
  drops_24h: number
}

export const ClientsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all')

  // Mock data - replace with real API call
  const mockClients: Client[] = [
    {
      client: 'client_001',
      username: 'sensor_user',
      last_seen: '2024-01-15 10:30:00',
      session_state: 'open',
      ip_port: '192.168.1.100:54321',
      protocol_ver: 'MQTT 3.1.1',
      keepalive: 60,
      subs_count: 5,
      pubs_24h: 1440,
      bytes_24h: 52000,
      drops_24h: 2
    },
    {
      client: 'dashboard_client',
      username: 'admin',
      last_seen: '2024-01-15 10:25:00',
      session_state: 'closed',
      ip_port: '192.168.1.50:43210',
      protocol_ver: 'MQTT 5.0',
      keepalive: 30,
      subs_count: 12,
      pubs_24h: 50,
      bytes_24h: 8500,
      drops_24h: 0
    }
  ]

  const filteredClients = mockClients.filter(client => {
    const matchesSearch = filter === '' || 
      client.client.toLowerCase().includes(filter.toLowerCase()) ||
      client.username.toLowerCase().includes(filter.toLowerCase())
    const matchesStatus = statusFilter === 'all' || client.session_state === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Clients
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280', 
          margin: 0 
        }}>
          Find clients and drill into activity
        </p>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search clients, usernames..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            minWidth: '300px'
          }}
        />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'closed')}
          style={{
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        >
          <option value="all">All Status</option>
          <option value="open">Open Sessions</option>
          <option value="closed">Closed Sessions</option>
        </select>

        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedClient ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Main Client Table */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Client List
            </h2>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Client</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Username</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Last Seen</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Subs</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>24h Pubs</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr 
                    key={client.client}
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      background: selectedClient === client.client ? '#eff6ff' : 'white'
                    }}
                  >
                    <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937' }}>
                      {client.client}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {client.username}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: client.session_state === 'open' ? '#d1fae5' : '#fee2e2',
                        color: client.session_state === 'open' ? '#065f46' : '#991b1b'
                      }}>
                        {client.session_state}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                      {client.last_seen}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {client.subs_count}
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>
                      {client.pubs_24h.toLocaleString()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button
                        onClick={() => setSelectedClient(selectedClient === client.client ? null : client.client)}
                        style={{
                          padding: '6px 12px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Client Detail Panel */}
        {selectedClient && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '20px', 
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                Client Details
              </h2>
              <button
                onClick={() => setSelectedClient(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '20px' }}>
              {(() => {
                const client = mockClients.find(c => c.client === selectedClient)
                if (!client) return null
                
                return (
                  <>
                    {/* Identity Section */}
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                        Identity
                      </h3>
                      <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Client:</strong> {client.client}
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Username:</strong> {client.username}
                        </div>
                        <div>
                          <strong>Roles:</strong> <span style={{ color: '#6b7280' }}>admin, sensor_reader</span>
                        </div>
                      </div>
                    </div>

                    {/* Current Session */}
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                        Current Session
                      </h3>
                      <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Status:</strong> {client.session_state}
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>IP:Port:</strong> {client.ip_port}
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>Protocol:</strong> {client.protocol_ver}
                        </div>
                        <div>
                          <strong>Keepalive:</strong> {client.keepalive}s
                        </div>
                      </div>
                    </div>

                    {/* 24h Stats */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                        24h Statistics
                      </h3>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '12px' 
                      }}>
                        <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#0369a1' }}>
                            {client.pubs_24h.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>Publications</div>
                        </div>
                        <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#166534' }}>
                            {(client.bytes_24h / 1024).toFixed(1)}KB
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>Bytes</div>
                        </div>
                        <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#92400e' }}>
                            {client.subs_count}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>Subscriptions</div>
                        </div>
                        <div style={{ background: '#fee2e2', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#991b1b' }}>
                            {client.drops_24h}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>Drops</div>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}