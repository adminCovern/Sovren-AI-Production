import { SkyetelService } from '@/lib/telephony/SkyetelService';
import { GeographicAreaCodeMapper } from '@/lib/telephony/GeographicAreaCodeMapper';

describe('SkyetelService', () => {
  let skyetelService: SkyetelService;
  let mockAreaCodeMapper: jest.Mocked<GeographicAreaCodeMapper>;

  const mockConfig = {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    baseUrl: 'https://api.skyetel.com/v1',
    sipDomain: 'test.skyetel.com'
  };

  beforeEach(() => {
    mockAreaCodeMapper = new GeographicAreaCodeMapper() as jest.Mocked<GeographicAreaCodeMapper>;
    skyetelService = new SkyetelService(mockConfig);

    // Mock area code mapper responses
    const mockAreaCodes = [
      { 
        areaCode: '415', 
        region: 'San Francisco Bay Area', 
        state: 'CA',
        majorCities: ['San Francisco', 'San Rafael'],
        timezone: 'Pacific',
        priority: 1 
      },
      { 
        areaCode: '628', 
        region: 'San Francisco Bay Area', 
        state: 'CA',
        majorCities: ['San Francisco'],
        timezone: 'Pacific',
        priority: 2 
      }
    ];
    jest.spyOn(GeographicAreaCodeMapper.prototype, 'getAreaCodesForLocation').mockResolvedValue(mockAreaCodes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Phone Number Provisioning', () => {
    test('should provision phone numbers for sovren_proof tier', async () => {
      // Mock successful API responses
      jest.spyOn(skyetelService['apiClient'], 'get').mockResolvedValue({
        data: [
          { number: '+14155551001', monthly_rate: 2.50, setup_fee: 0 },
          { number: '+14155551002', monthly_rate: 2.50, setup_fee: 0 },
          { number: '+14155551003', monthly_rate: 2.50, setup_fee: 0 },
          { number: '+14155551004', monthly_rate: 2.50, setup_fee: 0 },
          { number: '+14155551005', monthly_rate: 2.50, setup_fee: 0 }
        ]
      });

      jest.spyOn(skyetelService['apiClient'], 'post').mockResolvedValue({
        data: { 
          order_id: 'test-order-123',
          success: true
        }
      });

      const result = await skyetelService.provisionUserPhoneNumbers(
        'test-user-123',
        'sovren_proof',
        'San Francisco, CA'
      );

      expect(result.userId).toBe('test-user-123');
      expect(result.subscriptionTier).toBe('sovren_proof');
      expect(result.phoneNumbers.sovrenAI).toBeDefined();
      expect(Object.keys(result.phoneNumbers.executives)).toHaveLength(4);
    });
  });

  describe('API Connection', () => {
    it('should test connection successfully', async () => {
      const mockAxiosResponse = {
        status: 200,
        data: { account: 'test' }
      };

      jest.spyOn(skyetelService['apiClient'], 'get').mockResolvedValue(mockAxiosResponse);

      const result = await skyetelService.testConnection();

      expect(result).toBe(true);
      expect(skyetelService['apiClient'].get).toHaveBeenCalledWith('/account');
    });

    it('should handle connection errors gracefully', async () => {
      jest.spyOn(skyetelService['apiClient'], 'get').mockRejectedValue(new Error('Network error'));

      const result = await skyetelService.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('SIP Trunk Configuration', () => {
    it('should configure SIP trunk successfully', async () => {
      const mockAllocation = {
        userId: 'test-user',
        subscriptionTier: 'sovren_proof' as const,
        geography: 'San Francisco, CA',
        phoneNumbers: {
          sovrenAI: '+14155551001',
          executives: {
            cfo: '+14155551002',
            cmo: '+14155551003'
          }
        },
        areaCode: '415',
        skyetelOrderIds: ['order-123'],
        provisionedAt: new Date(),
        monthlyRate: 10.00
      };

      // Mock API calls
      jest.spyOn(skyetelService['apiClient'], 'get').mockResolvedValue({
        data: [{ id: 'phone-123', number: '+14155551001' }]
      });
      jest.spyOn(skyetelService['apiClient'], 'patch').mockResolvedValue({
        data: { success: true }
      });

      const result = await skyetelService.configureSIPTrunk(mockAllocation);

      expect(result).toBe(true);
    });
  });
});
