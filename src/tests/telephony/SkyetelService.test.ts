/**
 * Skyetel Service Tests
 * Comprehensive testing for Skyetel API integration and phone number provisioning
 */

import { SkyetelService, UserPhoneAllocation, PhoneNumberOrder } from '../../lib/telephony/SkyetelService';
import { GeographicAreaCodeMapper } from '../../lib/telephony/GeographicAreaCodeMapper';

// Mock the GeographicAreaCodeMapper
jest.mock('../../lib/telephony/GeographicAreaCodeMapper');

describe('SkyetelService', () => {
  let skyetelService: SkyetelService;
  let mockAreaCodeMapper: jest.Mocked<GeographicAreaCodeMapper>;

  const mockConfig = {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    baseUrl: 'https://api.skyetel.com/v1',
    sipDomain: 'sip.sovren.ai'
  };

  beforeEach(() => {
    mockAreaCodeMapper = new GeographicAreaCodeMapper() as jest.Mocked<GeographicAreaCodeMapper>;
    skyetelService = new SkyetelService(mockConfig, mockAreaCodeMapper);

    // Mock area code mapper responses
    mockAreaCodeMapper.getAreaCodesForLocation.mockResolvedValue(['415', '628']);
    mockAreaCodeMapper.validateAreaCode.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Phone Number Provisioning', () => {
    it('should provision phone numbers for sovren_proof tier successfully', async () => {
      // Mock successful API responses
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            available_numbers: [
              '+14155551001', '+14155551002', '+14155551003', 
              '+14155551004', '+14155551005'
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            order_id: 'skyetel-order-123',
            phone_numbers: [
              '+14155551001', '+14155551002', '+14155551003', 
              '+14155551004', '+14155551005'
            ],
            total_cost: 25.00,
            monthly_rate: 5.00
          })
        });

      const result = await skyetelService.provisionUserPhoneNumbers(
        'test-user-123',
        'sovren_proof',
        'San Francisco, CA'
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe('test-user-123');
      expect(result.subscriptionTier).toBe('sovren_proof');
      expect(result.geography).toBe('San Francisco, CA');
      expect(result.areaCode).toBe('415');
      expect(result.phoneNumbers.sovrenAI).toBe('+14155551001');
      expect(result.phoneNumbers.executives.cfo).toBe('+14155551002');
      expect(result.phoneNumbers.executives.cmo).toBe('+14155551003');
      expect(result.phoneNumbers.executives.clo).toBe('+14155551004');
      expect(result.phoneNumbers.executives.cto).toBe('+14155551005');
      expect(result.skyetelOrderIds).toEqual(['skyetel-order-123']);
      expect(result.monthlyRate).toBe(25.00);
    });

    it('should provision phone numbers for sovren_proof_plus tier successfully', async () => {
      // Mock successful API responses for 9 numbers
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            available_numbers: [
              '+14155551001', '+14155551002', '+14155551003', 
              '+14155551004', '+14155551005', '+14155551006',
              '+14155551007', '+14155551008', '+14155551009'
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            order_id: 'skyetel-order-456',
            phone_numbers: [
              '+14155551001', '+14155551002', '+14155551003', 
              '+14155551004', '+14155551005', '+14155551006',
              '+14155551007', '+14155551008', '+14155551009'
            ],
            total_cost: 45.00,
            monthly_rate: 9.00
          })
        });

      const result = await skyetelService.provisionUserPhoneNumbers(
        'test-user-456',
        'sovren_proof_plus',
        'San Francisco, CA'
      );

      expect(result).toBeDefined();
      expect(result.subscriptionTier).toBe('sovren_proof_plus');
      expect(result.phoneNumbers.executives.coo).toBeDefined();
      expect(result.phoneNumbers.executives.chro).toBeDefined();
      expect(result.phoneNumbers.executives.cso).toBeDefined();
      expect(result.phoneNumbers.executives.cio).toBeDefined();
      expect(result.monthlyRate).toBe(45.00);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error'
        })
      });

      await expect(
        skyetelService.provisionUserPhoneNumbers(
          'test-user-error',
          'sovren_proof',
          'San Francisco, CA'
        )
      ).rejects.toThrow();
    });

    it('should handle insufficient available numbers', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          available_numbers: ['+14155551001', '+14155551002'] // Only 2 numbers available
        })
      });

      await expect(
        skyetelService.provisionUserPhoneNumbers(
          'test-user-insufficient',
          'sovren_proof',
          'San Francisco, CA'
        )
      ).rejects.toThrow('Insufficient phone numbers available');
    });
  });

  describe('Phone Number Search', () => {
    it('should search available phone numbers successfully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          available_numbers: [
            '+14155551001', '+14155551002', '+14155551003'
          ],
          total_available: 150
        })
      });

      const result = await skyetelService.searchAvailableNumbers('415', 5);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe('+14155551001');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/numbers/search'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic')
          })
        })
      );
    });

    it('should handle search API errors', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'No numbers available in area code'
        })
      });

      await expect(
        skyetelService.searchAvailableNumbers('999', 5)
      ).rejects.toThrow();
    });
  });

  describe('Phone Number Purchase', () => {
    it('should purchase phone numbers successfully', async () => {
      const phoneNumbers = ['+14155551001', '+14155551002', '+14155551003'];
      
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          order_id: 'skyetel-purchase-789',
          phone_numbers: phoneNumbers,
          total_cost: 15.00,
          monthly_rate: 3.00,
          setup_fee: 0.00
        })
      });

      const result = await skyetelService.purchasePhoneNumbers(phoneNumbers, '415');

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('skyetel-purchase-789');
      expect(result.phoneNumbers).toEqual(phoneNumbers);
      expect(result.totalCost).toBe(15.00);
    });

    it('should handle purchase failures', async () => {
      const phoneNumbers = ['+14155551001'];
      
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Phone number no longer available'
        })
      });

      const result = await skyetelService.purchasePhoneNumbers(phoneNumbers, '415');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Phone number no longer available');
    });
  });

  describe('Number Assignment', () => {
    it('should assign numbers to executives correctly for sovren_proof', () => {
      const phoneNumbers = [
        '+14155551001', '+14155551002', '+14155551003', 
        '+14155551004', '+14155551005'
      ];

      const allocation = skyetelService['assignNumbersToExecutives'](
        'test-user',
        'sovren_proof',
        'San Francisco, CA',
        phoneNumbers,
        '415',
        ['order-123'],
        25.00
      );

      expect(allocation.phoneNumbers.sovrenAI).toBe('+14155551001');
      expect(allocation.phoneNumbers.executives.cfo).toBe('+14155551002');
      expect(allocation.phoneNumbers.executives.cmo).toBe('+14155551003');
      expect(allocation.phoneNumbers.executives.clo).toBe('+14155551004');
      expect(allocation.phoneNumbers.executives.cto).toBe('+14155551005');
      
      // Should not have premium executives
      expect(allocation.phoneNumbers.executives.coo).toBeUndefined();
      expect(allocation.phoneNumbers.executives.chro).toBeUndefined();
    });

    it('should assign numbers to executives correctly for sovren_proof_plus', () => {
      const phoneNumbers = [
        '+14155551001', '+14155551002', '+14155551003', 
        '+14155551004', '+14155551005', '+14155551006',
        '+14155551007', '+14155551008', '+14155551009'
      ];

      const allocation = skyetelService['assignNumbersToExecutives'](
        'test-user',
        'sovren_proof_plus',
        'San Francisco, CA',
        phoneNumbers,
        '415',
        ['order-456'],
        45.00
      );

      expect(allocation.phoneNumbers.sovrenAI).toBe('+14155551001');
      expect(allocation.phoneNumbers.executives.cfo).toBe('+14155551002');
      expect(allocation.phoneNumbers.executives.cmo).toBe('+14155551003');
      expect(allocation.phoneNumbers.executives.clo).toBe('+14155551004');
      expect(allocation.phoneNumbers.executives.cto).toBe('+14155551005');
      expect(allocation.phoneNumbers.executives.coo).toBe('+14155551006');
      expect(allocation.phoneNumbers.executives.chro).toBe('+14155551007');
      expect(allocation.phoneNumbers.executives.cso).toBe('+14155551008');
      expect(allocation.phoneNumbers.executives.cio).toBe('+14155551009');
    });
  });

  describe('Authentication', () => {
    it('should create correct authorization header', () => {
      const authHeader = skyetelService['createAuthHeader']();
      const expectedAuth = Buffer.from(`${mockConfig.apiKey}:${mockConfig.apiSecret}`).toString('base64');
      
      expect(authHeader).toBe(`Basic ${expectedAuth}`);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        skyetelService.searchAvailableNumbers('415', 5)
      ).rejects.toThrow('Network error');
    });

    it('should handle malformed API responses', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(
        skyetelService.searchAvailableNumbers('415', 5)
      ).rejects.toThrow('Invalid JSON');
    });
  });
});
