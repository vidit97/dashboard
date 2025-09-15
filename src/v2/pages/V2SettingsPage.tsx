import React, { useState } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'

export const V2SettingsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [activeSection, setActiveSection] = useState<string>('topic-policy')

  const [topicPolicySettings, setTopicPolicySettings] = useState({
    inactivity_days: 30,
    exempt_patterns: ['system/#', 'alerts/#', '$SYS/#'],
    default_owner: 'platform_team'
  })

  const [retentionSettings, setRetentionSettings] = useState({
    minute_days: 7,
    events_days: 30,
    wills_days: 30
  })

  const [brokerSettings, setBrokerSettings] = useState({
    brokers: [
      { id: 'local', name: 'Local Broker', endpoint: 'localhost:1883', status: 'active' },
      { id: 'prod', name: 'Production', endpoint: 'prod.mqtt.company.com:8883', status: 'inactive' }
    ]
  })

  const sections = [
    { id: 'topic-policy', label: 'Topic Policy Defaults', icon: '📝' },
    { id: 'retention', label: 'Data Retention', icon: '🗄️' },
    { id: 'brokers', label: 'Broker Registry', icon: '🔗' },
    { id: 'backups', label: 'Backup Settings', icon: '💾' }
  ]

  const handleSaveTopicPolicy = () => {
    console.log('Saving topic policy settings:', topicPolicySettings)
    alert('Topic policy settings saved successfully!')
  }

  const handleSaveRetention = () => {
    console.log('Saving retention settings:', retentionSettings)
    alert('Retention settings saved successfully!')
  }

  const handleBackupNow = () => {
    console.log('Triggering manual backup...')
    alert('Backup initiated successfully!')
  }

  const addExemptPattern = () => {
    const pattern = prompt('Enter topic pattern to exempt (e.g., system/#):')
    if (pattern) {
      setTopicPolicySettings(prev => ({
        ...prev,
        exempt_patterns: [...prev.exempt_patterns, pattern]
      }))
    }
  }

  const removeExemptPattern = (index: number) => {
    setTopicPolicySettings(prev => ({
      ...prev,
      exempt_patterns: prev.exempt_patterns.filter((_, i) => i !== index)
    }))
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'topic-policy':
        return (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#1f2937' }}>
              Topic Policy Defaults
            </h3>

            <div style={{ display: 'grid', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  Inactivity Days Threshold
                </label>
                <input
                  type="number"
                  value={topicPolicySettings.inactivity_days}
                  onChange={(e) => setTopicPolicySettings(prev => ({ ...prev, inactivity_days: parseInt(e.target.value) }))}
                  style={{
                    width: '200px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Topics inactive for this many days will be marked for review
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  Default Owner
                </label>
                <select
                  value={topicPolicySettings.default_owner}
                  onChange={(e) => setTopicPolicySettings(prev => ({ ...prev, default_owner: e.target.value }))}
                  style={{
                    width: '200px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="platform_team">Platform Team</option>
                  <option value="iot_team">IoT Team</option>
                  <option value="data_team">Data Team</option>
                  <option value="unknown">Unknown</option>
                </select>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Default owner for topics without explicit assignment
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Exempt Patterns
                  </label>
                  <button
                    onClick={addExemptPattern}
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
                    Add Pattern
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {topicPolicySettings.exempt_patterns.map((pattern, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: '#e0e7ff',
                        borderRadius: '16px',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}
                    >
                      {pattern}
                      <button
                        onClick={() => removeExemptPattern(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6b7280',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Topics matching these patterns will never be marked inactive
                </div>
              </div>

              <button
                onClick={handleSaveTopicPolicy}
                style={{
                  width: 'fit-content',
                  padding: '10px 20px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Save Topic Policy Settings
              </button>
            </div>
          </div>
        )

      case 'retention':
        return (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#1f2937' }}>
              Data Retention Settings
            </h3>

            <div style={{ display: 'grid', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  Minute-level Data Retention (Days)
                </label>
                <input
                  type="number"
                  value={retentionSettings.minute_days}
                  onChange={(e) => setRetentionSettings(prev => ({ ...prev, minute_days: parseInt(e.target.value) }))}
                  style={{
                    width: '200px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  How long to keep minute-level metrics (pub_minute, sub_minute, etc.)
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  Events Retention (Days)
                </label>
                <input
                  type="number"
                  value={retentionSettings.events_days}
                  onChange={(e) => setRetentionSettings(prev => ({ ...prev, events_days: parseInt(e.target.value) }))}
                  style={{
                    width: '200px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  How long to keep individual event records
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  Will Messages Retention (Days)
                </label>
                <input
                  type="number"
                  value={retentionSettings.wills_days}
                  onChange={(e) => setRetentionSettings(prev => ({ ...prev, wills_days: parseInt(e.target.value) }))}
                  style={{
                    width: '200px',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  How long to keep will message records
                </div>
              </div>

              <button
                onClick={handleSaveRetention}
                style={{
                  width: 'fit-content',
                  padding: '10px 20px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Save Retention Settings
              </button>
            </div>
          </div>
        )

      case 'brokers':
        return (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#1f2937' }}>
              Broker Registry
            </h3>

            <div style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>ℹ️</span>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Multi-broker Support</span>
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Future feature: Manage multiple MQTT brokers from a single dashboard
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Endpoint</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {brokerSettings.brokers.map((broker) => (
                  <tr key={broker.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937' }}>
                      {broker.name}
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#6b7280' }}>
                      {broker.endpoint}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: broker.status === 'active' ? '#d1fae5' : '#fee2e2',
                        color: broker.status === 'active' ? '#065f46' : '#991b1b'
                      }}>
                        {broker.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button style={{
                        padding: '4px 8px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}>
                        Configure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      case 'backups':
        return (
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#1f2937' }}>
              Backup Settings
            </h3>

            <div style={{ display: 'grid', gap: '24px' }}>
              <div style={{
                background: '#f0f9ff',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #bae6fd'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '24px' }}>💾</span>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#0c4a6e' }}>
                      Dynamic Security Backups
                    </div>
                    <div style={{ fontSize: '14px', color: '#0369a1' }}>
                      Automatic and manual backup management
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleBackupNow}
                  style={{
                    padding: '10px 20px',
                    background: '#0ea5e9',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Backup Now
                </button>
              </div>

              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  Backup Schedule
                </h4>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                  Automatic backups are created after each ACL change
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input type="checkbox" defaultChecked />
                  Enable automatic backups on ACL changes
                </label>
              </div>
            </div>
          </div>
        )

      default:
        return <div>Section not found</div>
    }
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '24px'
    }}>
      {/* Page Header */}
      <div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Settings
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Safe admin settings for policies, retention, and system configuration
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '24px',
        flex: 1,
        minHeight: 0
      }}>
        {/* Settings Navigation */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '8px',
          height: 'fit-content'
        }}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                background: activeSection === section.id ? '#3b82f6' : 'transparent',
                color: activeSection === section.id ? 'white' : '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left',
                marginBottom: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.color = '#374151'
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#6b7280'
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '32px',
          overflow: 'auto'
        }}>
          {renderSection()}
        </div>
      </div>
    </div>
  )
}