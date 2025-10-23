/**
 * Safety Rails Component
 * Provides confirmation dialogs and safety checks for risky agent actions
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

export interface ActionConfirmation {
  action: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  requires_2fa?: boolean;
  consequences: string[];
  reversible: boolean;
  estimated_impact?: string;
}

interface SafetyRailsProps {
  confirmation: ActionConfirmation;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const SafetyRails: React.FC<SafetyRailsProps> = ({
  confirmation,
  onConfirm,
  onCancel,
  isOpen,
}) => {
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen) return null;

  const riskColors = {
    low: 'bg-green-50 border-green-200 text-green-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    high: 'bg-orange-50 border-orange-200 text-orange-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
  };

  const riskIcons = {
    low: <CheckCircle className="w-6 h-6 text-green-500" />,
    medium: <Info className="w-6 h-6 text-yellow-500" />,
    high: <AlertTriangle className="w-6 h-6 text-orange-500" />,
    critical: <AlertTriangle className="w-6 h-6 text-red-500" />,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
        {/* Header */}
        <div className={`flex items-center gap-3 p-4 rounded-lg border mb-4 ${riskColors[confirmation.risk_level]}`}>
          {riskIcons[confirmation.risk_level]}
          <div>
            <h2 className="text-xl font-bold">Confirm Action</h2>
            <p className="text-sm opacity-80">
              {confirmation.risk_level.toUpperCase()} RISK ACTION
            </p>
          </div>
        </div>

        {/* Action Details */}
        <div className="mb-6">
          <h3 className="font-semibold text-lg mb-2">{confirmation.action}</h3>
          <p className="text-gray-600 mb-4">{confirmation.description}</p>

          {/* Consequences */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold mb-2">What will happen:</h4>
            <ul className="space-y-2">
              {confirmation.consequences.map((consequence, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="text-gray-700">{consequence}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Reversibility Warning */}
          {!confirmation.reversible && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Warning: This action cannot be undone!</span>
              </div>
            </div>
          )}

          {/* Impact Estimate */}
          {confirmation.estimated_impact && (
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <span className="text-sm text-blue-800">
                <strong>Estimated Impact:</strong> {confirmation.estimated_impact}
              </span>
            </div>
          )}
        </div>

        {/* 2FA if Required */}
        {confirmation.requires_2fa && (
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">
              Two-Factor Authentication Code
            </label>
            <input
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        )}

        {/* Acknowledgment */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I understand the consequences and want to proceed
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!acknowledged || (confirmation.requires_2fa && twoFactorCode.length !== 6)}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              !acknowledged || (confirmation.requires_2fa && twoFactorCode.length !== 6)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : confirmation.risk_level === 'critical'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Confirm & Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for managing safety confirmations
 */
export const useSafetyRails = () => {
  const [pendingConfirmation, setPendingConfirmation] = useState<ActionConfirmation | null>(null);

  const requestConfirmation = (confirmation: ActionConfirmation): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingConfirmation(confirmation);

      // Store resolve in a ref-like manner
      (window as any).__safetyRailsResolve = resolve;
    });
  };

  const handleConfirm = () => {
    (window as any).__safetyRailsResolve?.(true);
    setPendingConfirmation(null);
  };

  const handleCancel = () => {
    (window as any).__safetyRailsResolve?.(false);
    setPendingConfirmation(null);
  };

  return {
    SafetyRailsComponent: pendingConfirmation ? (
      <SafetyRails
        confirmation={pendingConfirmation}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isOpen={true}
      />
    ) : null,
    requestConfirmation,
  };
};

/**
 * Define safety rules for different actions
 */
export const SAFETY_RULES: Record<string, ActionConfirmation> = {
  send_email_to_executive: {
    action: 'Send Email to Executive',
    description: 'AI agent wants to send an email to a C-level executive',
    risk_level: 'high',
    requires_2fa: false,
    consequences: [
      'Email will be sent immediately',
      'Executive will receive notification',
      'This represents your company publicly',
    ],
    reversible: false,
    estimated_impact: 'High - Executive communication',
  },

  block_bank_card: {
    action: 'Block Bank Card',
    description: 'Permanently block the specified credit/debit card',
    risk_level: 'critical',
    requires_2fa: true,
    consequences: [
      'Card will be blocked immediately',
      'Cannot be used for any transactions',
      'New card will need to be issued (3-5 days)',
      'Any recurring payments will fail',
    ],
    reversible: false,
    estimated_impact: 'Critical - User will not have access to funds',
  },

  book_flight: {
    action: 'Book Flight',
    description: 'Purchase airline ticket using provided payment method',
    risk_level: 'high',
    requires_2fa: false,
    consequences: [
      'Payment will be charged immediately',
      'Ticket is subject to airline cancellation policy',
      'Changes may incur fees',
    ],
    reversible: true,
    estimated_impact: 'High - Financial transaction',
  },

  send_bulk_emails: {
    action: 'Send Bulk Emails',
    description: 'Send personalized emails to multiple prospects',
    risk_level: 'medium',
    requires_2fa: false,
    consequences: [
      `Emails will be sent to ${100} recipients`,
      'Your domain reputation could be affected',
      'Recipients may mark as spam',
    ],
    reversible: false,
    estimated_impact: 'Medium - Brand reputation',
  },

  auto_respond_email: {
    action: 'Auto-Respond to Email',
    description: 'Automatically send a response without your review',
    risk_level: 'low',
    requires_2fa: false,
    consequences: [
      'Response will be sent immediately',
      'Recipient will think it came from you personally',
    ],
    reversible: false,
    estimated_impact: 'Low - Standard communication',
  },
};


