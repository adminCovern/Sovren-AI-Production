'use client';

import React, { useState } from 'react';

interface ApprovalItem {
  id: string;
  title: string;
  description: string;
  amount?: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
  timestamp: Date;
}

const mockApprovals: ApprovalItem[] = [
  {
    id: '1',
    title: 'Marketing Campaign Budget',
    description: 'Q4 digital marketing campaign approval',
    amount: 50000,
    urgency: 'high',
    requestedBy: 'CMO',
    timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
  },
  {
    id: '2',
    title: 'New Hire Authorization',
    description: 'Senior Developer position approval',
    urgency: 'medium',
    requestedBy: 'CTO',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
  },
  {
    id: '3',
    title: 'Equipment Purchase',
    description: 'Server infrastructure upgrade',
    amount: 25000,
    urgency: 'critical',
    requestedBy: 'CTO',
    timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
  }
];

export function ApprovalQueue() {
  const [approvals, setApprovals] = useState(mockApprovals);

  const handleApproval = (id: string, approved: boolean) => {
    setApprovals(prev => prev.filter(item => item.id !== id));
    // Here you would typically send the approval to your backend
    console.log(`Approval ${id} ${approved ? 'approved' : 'rejected'}`);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-400 bg-red-400/20';
      case 'high': return 'text-orange-400 bg-orange-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'low': return 'text-green-400 bg-green-400/20';
      default: return 'text-neural-400 bg-neural-400/20';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return `${minutes}m ago`;
    }
  };

  return (
    <div className="space-y-3">
      {approvals.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-neural-400 text-sm">No pending approvals</div>
          <div className="text-xs text-neural-500 mt-1">All caught up! 🎉</div>
        </div>
      ) : (
        approvals.map((approval) => (
          <div
            key={approval.id}
            className="bg-neural-700/50 rounded-lg p-3 border border-neural-600/30"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-neural-100 mb-1">
                  {approval.title}
                </h4>
                <p className="text-xs text-neural-300 mb-2">
                  {approval.description}
                </p>
                
                <div className="flex items-center space-x-2 text-xs">
                  <span className={`px-2 py-1 rounded-full ${getUrgencyColor(approval.urgency)}`}>
                    {approval.urgency.toUpperCase()}
                  </span>
                  <span className="text-neural-400">
                    by {approval.requestedBy}
                  </span>
                  <span className="text-neural-500">
                    {formatTimeAgo(approval.timestamp)}
                  </span>
                </div>
                
                {approval.amount && (
                  <div className="mt-2 text-sm font-mono text-neural-200">
                    ${approval.amount.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => handleApproval(approval.id, true)}
                className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs py-2 px-3 rounded transition-colors"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => handleApproval(approval.id, false)}
                className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs py-2 px-3 rounded transition-colors"
              >
                ✗ Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
