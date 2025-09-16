import React, { useState, useEffect, useCallback } from 'react'
import { useGlobalState } from '../hooks/useGlobalState'
import { GreApiService } from '../../services/greApi'
import { Subscription } from '../../types/api'
// Reusing existing components
import SubscriptionChurn from '../../components/SubscriptionChurn'

export const SubscriptionsPage: React.FC = () => {
  const { state } = useGlobalState()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([])
  const [topicFilter, setTopicFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [qosFilter, setQosFilter] = useState<'all' | '0' | '1' | '2'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  // Fetch subscriptions data
  const fetchSubscriptionsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build filters for API call
      const filters: Record<string, string> = {}

      if (activeFilter === 'active') {
        filters['active'] = 'eq.true'
      } else if (activeFilter === 'inactive') {
        filters['active'] = 'eq.false'
      }

      if (qosFilter !== 'all') {
        filters['qos'] = `eq.${qosFilter}`
      }

      if (topicFilter.trim()) {
        filters['topic'] = `ilike.*${topicFilter.trim()}*`
      }

      if (clientFilter.trim()) {
        filters['og_client'] = `ilike.*${clientFilter.trim()}*`
      }

      const result = await GreApiService.getSubscriptionsPaginated({
        limit: pageSize,
        offset: currentPage * pageSize,
        filters,
        sortColumn: 'created_at',
        sortDirection: 'desc'
      })

      setSubscriptions(result.data)
      setFilteredSubscriptions(result.data)
      setTotalCount(result.totalCount)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch subscriptions data'
      setError(errorMsg)
      console.error('Error fetching subscriptions data:', err)
    } finally {
      setLoading(false)
    }
  }, [activeFilter, qosFilter, topicFilter, clientFilter, currentPage])

  // Apply client-side filtering (for now, server-side filtering is preferred)
  useEffect(() => {
    setFilteredSubscriptions(subscriptions)
  }, [subscriptions])

  // Fetch data on mount and when filters change
  useEffect(() => {
    setCurrentPage(0) // Reset to first page when filters change
    fetchSubscriptionsData()
  }, [topicFilter, clientFilter, activeFilter, qosFilter])

  useEffect(() => {
    fetchSubscriptionsData()
  }, [currentPage])

  // Set up auto-refresh
  useEffect(() => {
    if (state.autoRefresh) {
      const interval = setInterval(fetchSubscriptionsData, state.refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [fetchSubscriptionsData, state.autoRefresh, state.refreshInterval])

  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = currentPage * pageSize

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  return (
    <div style={{
      width: '100%',
      padding: '16px',
      minHeight: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Subscriptions
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: 0
        }}>
          Who listens to what - subscription monitoring and analysis
        </p>
      </div>


      {/* Subscription Churn Chart */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <SubscriptionChurn
            className="chart-full-width"
            refreshInterval={120}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ color: '#dc2626', fontWeight: '500', marginBottom: '8px' }}>
            Error loading subscriptions data
          </div>
          <div style={{ color: '#7f1d1d', fontSize: '14px' }}>
            {error}
          </div>
          <button
            onClick={fetchSubscriptionsData}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Subscriptions Table */}
      <div>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              Subscription Details ({totalCount})
            </h2>
          </div>

          {/* Filters */}
          <div style={{
            padding: '16px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              placeholder="Topic prefix filter..."
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '200px'
              }}
            />

            <input
              type="text"
              placeholder="Client filter..."
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '200px',
                background: '#fef3c7',
                borderColor: '#f59e0b'
              }}
            />

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Subscriptions</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <select
              value={qosFilter}
              onChange={(e) => setQosFilter(e.target.value as 'all' | '0' | '1' | '2')}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="all">All QoS</option>
              <option value="0">QoS 0</option>
              <option value="1">QoS 1</option>
              <option value="2">QoS 2</option>
            </select>

            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {totalCount > 0 ? `${startIndex + 1}-${Math.min(startIndex + pageSize, totalCount)} of ${totalCount}` : '0'} subscription{totalCount !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Client</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Topic</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>QoS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Last Subscribe</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Last Unsubscribe</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                      Loading subscriptions...
                    </td>
                  </tr>
                ) : filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937' }}>
                        {sub.og_client || sub.client || 'Unknown'}
                      </td>
                      <td style={{
                        padding: '16px',
                        color: '#1f2937',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        background: '#f8fafc',
                        maxWidth: '200px',
                        wordBreak: 'break-all'
                      }}>
                        {sub.topic}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: sub.qos === 0 ? '#f3f4f6' : sub.qos === 1 ? '#fef3c7' : '#fee2e2',
                          color: sub.qos === 0 ? '#374151' : sub.qos === 1 ? '#92400e' : '#991b1b'
                        }}>
                          QoS {sub.qos}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: sub.active ? '#d1fae5' : '#fee2e2',
                          color: sub.active ? '#065f46' : '#991b1b'
                        }}>
                          {sub.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {formatTimestamp(sub.last_subscribe_ts || null)}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                        {formatTimestamp(sub.last_unsubscribe_ts || null)}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '500',
                          background: '#e0e7ff',
                          color: '#3730a3'
                        }}>
                          {sub.source || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Showing {startIndex + 1}-{Math.min(startIndex + pageSize, totalCount)} of {totalCount}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  style={{
                    padding: '6px 12px',
                    background: currentPage === 0 ? '#f3f4f6' : '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: currentPage === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>

                <span style={{ padding: '6px 12px', fontSize: '14px', color: '#6b7280' }}>
                  Page {currentPage + 1} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1}
                  style={{
                    padding: '6px 12px',
                    background: currentPage >= totalPages - 1 ? '#f3f4f6' : '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
          marginTop: '16px'
        }}>
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  )
}