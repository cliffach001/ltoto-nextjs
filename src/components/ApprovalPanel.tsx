'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  fetchPendingDeletionRequests,
  updateActivityLogStatus,
  deleteSupabaseRecord,
} from '@/lib/utils';
import type { DeletionRequest } from '@/lib/types';

interface ApprovalPanelProps {
  onRefresh?: () => void;
}

export default function ApprovalPanel({ onRefresh }: ApprovalPanelProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin';

  const loadRequests = useCallback(async () => {
    const data = await fetchPendingDeletionRequests();
    setRequests(data);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadRequests();

    // Real-time subscription for new deletion requests
    const channel = supabase
      .channel('deletion-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs',
          filter: `action=eq.delete_request`,
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, loadRequests]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Approve deletion
  const handleApprove = async (req: DeletionRequest) => {
    setLoading(true);
    await updateActivityLogStatus(req.id, 'approved', user?.fullName || 'Admin');
    await deleteSupabaseRecord(req.record_id);
    await loadRequests();
    onRefresh?.();
    setLoading(false);
  };

  // Reject deletion
  const handleReject = async (req: DeletionRequest) => {
    setLoading(true);
    await updateActivityLogStatus(req.id, 'rejected', user?.fullName || 'Admin');
    await loadRequests();
    setLoading(false);
  };

  if (!isAdmin) return null;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell icon with count badge */}
      <button
        className="approval-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Approval requests"
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '8px',
          fontSize: '18px',
          color: 'var(--text)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {requests.length > 0 && (
          <span className="approval-badge">{requests.length}</span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="approval-dropdown">
          <div className="approval-header">
            <h3>Persetujuan Penghapusan</h3>
            <span className="approval-count">{requests.length} pending</span>
          </div>
          <div className="approval-list">
            {requests.length === 0 ? (
              <div className="approval-empty">
                <i className="fa-solid fa-check-circle"></i>
                <p>Tidak ada permintaan pending</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="approval-item">
                  <div className="approval-item-info">
                    <strong>{req.switch_gear_name}</strong>
                    <span>Diminta oleh: {req.requested_by}</span>
                    <span className="approval-time">{req.requested_at}</span>
                  </div>
                  <div className="approval-item-actions">
                    <button
                      className="button success small"
                      onClick={() => handleApprove(req)}
                      disabled={loading}
                    >
                      <i className="fa-solid fa-check"></i> Setuju
                    </button>
                    <button
                      className="button danger small"
                      onClick={() => handleReject(req)}
                      disabled={loading}
                    >
                      <i className="fa-solid fa-xmark"></i> Tolak
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
