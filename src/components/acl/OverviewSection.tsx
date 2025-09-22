import React, { useState, useEffect } from 'react'
import { ACLApiService, formatTimestamp } from '../../services/aclApi'
import { OverviewData } from '../../config/aclApi'
import { useToast } from '../Toast'

interface OverviewSectionProps {
  onRefresh?: () => void
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ onRefresh }) => {
  const { addToast } = useToast()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOverviewData()
  }, [])

  const loadOverviewData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await ACLApiService.getState()
      if (result.ok && result.data) {
        const processedData = ACLApiService.processStateData(result.data)
        setOverview(processedData)
      } else {
        setError(result.error?.message || 'Failed to load overview data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overview data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadOverviewData()
    onRefresh?.()
  }

  const handleBackup = async () => {
    try {
      const result = await ACLApiService.backupNow()
      if (result.ok && result.data) {
        addToast({
          type: 'success',
          title: 'Backup Created',
          message: `Backup created successfully with ID: ${result.data}`
        })
        loadOverviewData() // Refresh data
      } else {
        addToast({
          type: 'error',
          title: 'Backup Failed',
          message: result.error?.message || 'Failed to create backup'
        })
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Backup Failed',
        message: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }

  if (loading) {
    return (
      <div style={{ 
        padding: '32px', 
        textAlign: 'center', 
        color: '#6b7280' 
      }}>
        Loading ACL overview...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        padding: '32px', 
        textAlign: 'center', 
        color: '#dc2626' 
      }}>
        Error: {error}
        <br />
        <button 
          onClick={loadOverviewData}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!overview) {
    return (
      <div style={{ 
        padding: '32px', 
        textAlign: 'center', 
        color: '#6b7280' 
      }}>
        No ACL data available
      </div>
    )
  }

  return (
    <div>
      {/* Header with Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          ACL Overview
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleRefresh}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Refresh
          </button>
          <button 
            onClick={handleBackup}
            style={{
              padding: '8px 16px',
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Create Backup
          </button>
        </div>
      </div>

      {/* Broker Info Card */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '24px'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Broker Information
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Broker
            </div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>
              {overview.broker}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Version
            </div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>
              {overview.version || 'N/A'}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Last Updated
            </div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>
              {overview.updatedAt ? formatTimestamp(overview.updatedAt) : 'N/A'}
            </div>
          </div>
          
        </div>
      </div>

      {/* Summary Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
            {overview.roleCount}
          </div>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>
            Total Roles
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669', marginBottom: '8px' }}>
            {overview.clientCount}
          </div>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>
            Total Clients
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
            {overview.groupCount}
          </div>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>
            Total Groups
          </div>
        </div>
      </div>
    </div>
  )
}
