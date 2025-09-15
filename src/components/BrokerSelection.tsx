import React, { useState } from 'react'

interface Broker {
  id: string
  name: string
  endpoint: string
  status: 'connected' | 'disconnected' | 'error'
  description: string
}

interface BrokerSelectionProps {
  onBrokerSelect: (brokerId: string) => void
  onLogout: () => void
  username: string
}

export const BrokerSelection: React.FC<BrokerSelectionProps> = ({ onBrokerSelect, onLogout, username }) => {
  const [selectedBroker, setSelectedBroker] = useState<string>('')
  const [isOpen, setIsOpen] = useState(true)

  const brokers: Broker[] = [
    {
      id: 'local',
      name: 'Local Broker',
      endpoint: 'localhost:1883',
      status: 'connected',
      description: 'Development environment broker running locally'
    },
    {
      id: 'staging',
      name: 'Staging Environment',
      endpoint: 'staging.mqtt.company.com:8883',
      status: 'connected',
      description: 'Pre-production testing environment'
    },
    {
      id: 'production',
      name: 'Production Broker',
      endpoint: 'prod.mqtt.company.com:8883',
      status: 'disconnected',
      description: 'Live production environment'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#10b981'
      case 'disconnected': return '#6b7280'
      case 'error': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return '🟢'
      case 'disconnected': return '⚪'
      case 'error': return '🔴'
      default: return '⚪'
    }
  }

  const handleBrokerSelect = (brokerId: string) => {
    setSelectedBroker(brokerId)
    setTimeout(() => {
      setIsOpen(false)
      setTimeout(() => {
        onBrokerSelect(brokerId)
      }, 300)
    }, 500)
  }

  if (!isOpen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        opacity: 0,
        transition: 'opacity 0.3s ease'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>🚀</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            Loading Dashboard...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        transform: isOpen ? 'scale(1)' : 'scale(0.95)',
        transition: 'transform 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '32px',
          color: 'white',
          position: 'relative'
        }}>
          <button
            onClick={onLogout}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)'
            }}
          >
            Logout
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              backdropFilter: 'blur(4px)'
            }}>
              📡
            </div>
            <div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                margin: '0 0 4px 0'
              }}>
                Welcome, {username}!
              </h1>
              <p style={{
                fontSize: '16px',
                margin: 0,
                opacity: 0.9
              }}>
                Select a broker to connect to
              </p>
            </div>
          </div>
        </div>

        {/* Broker List */}
        <div style={{
          padding: '32px',
          maxHeight: 'calc(80vh - 160px)',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'grid',
            gap: '16px'
          }}>
            {brokers.map((broker) => (
              <div
                key={broker.id}
                onClick={() => handleBrokerSelect(broker.id)}
                style={{
                  border: selectedBroker === broker.id ? '2px solid #667eea' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: broker.status === 'connected' ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  opacity: broker.status === 'connected' ? 1 : 0.6,
                  background: selectedBroker === broker.id ? '#f8fafc' : 'white',
                  transform: selectedBroker === broker.id ? 'scale(1.02)' : 'scale(1)'
                }}
                onMouseEnter={(e) => {
                  if (broker.status === 'connected' && selectedBroker !== broker.id) {
                    e.currentTarget.style.borderColor = '#d1d5db'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (broker.status === 'connected' && selectedBroker !== broker.id) {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0px)'
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1f2937',
                      margin: '0 0 4px 0'
                    }}>
                      {broker.name}
                    </h3>
                    <div style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      fontFamily: 'monospace',
                      marginBottom: '8px'
                    }}>
                      {broker.endpoint}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}>
                      {getStatusIcon(broker.status)}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: getStatusColor(broker.status),
                      textTransform: 'capitalize'
                    }}>
                      {broker.status}
                    </span>
                  </div>
                </div>

                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  {broker.description}
                </p>

                {broker.status === 'connected' && (
                  <div style={{
                    marginTop: '16px',
                    padding: '8px 12px',
                    background: '#f0fdf4',
                    borderRadius: '6px',
                    border: '1px solid #bbf7d0',
                    fontSize: '12px',
                    color: '#166534',
                    textAlign: 'center'
                  }}>
                    Click to connect
                  </div>
                )}

                {broker.status !== 'connected' && (
                  <div style={{
                    marginTop: '16px',
                    padding: '8px 12px',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    {broker.status === 'disconnected' ? 'Currently unavailable' : 'Connection error'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedBroker && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#0369a1',
                fontWeight: '500'
              }}>
                Connecting to {brokers.find(b => b.id === selectedBroker)?.name}...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}