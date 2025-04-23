import { describe, it, expect, beforeEach } from 'vitest';

// Mock the Clarity VM environment
const mockVM = {
  txSender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  blockHeight: 100,
  blockTime: 1625097600, // Some Unix timestamp
  maps: {
    'device-compliance': {}
  }
};

// Mock contract functions
const complianceTracker = {
  initializeCompliance: (deviceId, nextRequiredDate) => {
    // Initialize compliance record
    mockVM.maps['device-compliance'][deviceId] = {
      'last-maintenance-date': null,
      'next-required-date': nextRequiredDate,
      'compliance-status': 'pending',
      'certification-id': null,
      'certification-expiry': null
    };
    
    return { type: 'ok', value: true };
  },
  
  updateDeviceCompliance: (deviceId) => {
    // Check if compliance record exists
    const compliance = mockVM.maps['device-compliance'][deviceId];
    if (!compliance) return { type: 'err', value: 1 };
    
    // Calculate next required maintenance (6 months from now)
    const nextDate = mockVM.blockTime + (60 * 60 * 24 * 30 * 6);
    
    // Update compliance record
    compliance['last-maintenance-date'] = mockVM.blockTime;
    compliance['next-required-date'] = nextDate;
    compliance['compliance-status'] = 'compliant';
    
    return { type: 'ok', value: true };
  },
  
  addCertification: (deviceId, certificationId, certificationExpiry) => {
    // Check if compliance record exists
    const compliance = mockVM.maps['device-compliance'][deviceId];
    if (!compliance) return { type: 'err', value: 1 };
    
    // Update certification
    compliance['certification-id'] = certificationId;
    compliance['certification-expiry'] = certificationExpiry;
    
    return { type: 'ok', value: true };
  },
  
  isDeviceCompliant: (deviceId) => {
    const compliance = mockVM.maps['device-compliance'][deviceId];
    if (!compliance) return false;
    
    return compliance['compliance-status'] === 'compliant' &&
        compliance['next-required-date'] > mockVM.blockTime &&
        (!compliance['certification-expiry'] || compliance['certification-expiry'] > mockVM.blockTime);
  },
  
  getComplianceDetails: (deviceId) => {
    return mockVM.maps['device-compliance'][deviceId] || null;
  },
  
  needsMaintenance: (deviceId) => {
    const compliance = mockVM.maps['device-compliance'][deviceId];
    if (!compliance) return false;
    
    return compliance['next-required-date'] < mockVM.blockTime;
  }
};

describe('Compliance Tracker Contract', () => {
  beforeEach(() => {
    // Reset the mock VM state before each test
    mockVM.maps['device-compliance'] = {};
  });
  
  it('should initialize compliance for a device', () => {
    const nextRequiredDate = mockVM.blockTime + (60 * 60 * 24 * 30); // 30 days from now
    const result = complianceTracker.initializeCompliance(1, nextRequiredDate);
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    expect(mockVM.maps['device-compliance'][1]).toBeDefined();
    expect(mockVM.maps['device-compliance'][1]['compliance-status']).toBe('pending');
  });
  
  it('should update device compliance after maintenance', () => {
    // First initialize compliance
    const nextRequiredDate = mockVM.blockTime + (60 * 60 * 24 * 30);
    complianceTracker.initializeCompliance(1, nextRequiredDate);
    
    // Update compliance
    const result = complianceTracker.updateDeviceCompliance(1);
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    expect(mockVM.maps['device-compliance'][1]['compliance-status']).toBe('compliant');
    expect(mockVM.maps['device-compliance'][1]['last-maintenance-date']).toBe(mockVM.blockTime);
  });
  
  it('should add certification to device', () => {
    // First initialize compliance
    const nextRequiredDate = mockVM.blockTime + (60 * 60 * 24 * 30);
    complianceTracker.initializeCompliance(1, nextRequiredDate);
    
    // Add certification
    const certExpiry = mockVM.blockTime + (60 * 60 * 24 * 365); // 1 year from now
    const result = complianceTracker.addCertification(1, 'FDA123456', certExpiry);
    
    expect(result.type).toBe('ok');
    expect(result.value).toBe(true);
    expect(mockVM.maps['device-compliance'][1]['certification-id']).toBe('FDA123456');
    expect(mockVM.maps['device-compliance'][1]['certification-expiry']).toBe(certExpiry);
  });
  
  it('should check if device is compliant', () => {
    // Initialize compliance
    const nextRequiredDate = mockVM.blockTime + (60 * 60 * 24 * 30);
    complianceTracker.initializeCompliance(1, nextRequiredDate);
    
    // Update compliance
    complianceTracker.updateDeviceCompliance(1);
    
    // Check compliance
    const result = complianceTracker.isDeviceCompliant(1);
    expect(result).toBe(true);
  });
});
