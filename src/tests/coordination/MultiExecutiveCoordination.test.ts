import { NVLinkFabricCoordinator, ExecutiveCoordinationRequest } from '../../lib/coordination/NVLinkFabricCoordinator';
import { MultiExecutiveCoordinator, CoordinationScenario } from '../../lib/coordination/MultiExecutiveCoordinator';

// Mock dependencies
jest.mock('../../lib/b200/B200ResourceManager');
jest.mock('../../lib/shadowboard/ShadowBoardManager');
jest.mock('../../lib/inference/B200LLMClient');

describe('Multi-Executive Coordination System', () => {
  let nvlinkCoordinator: NVLinkFabricCoordinator;
  let multiExecutiveCoordinator: MultiExecutiveCoordinator;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh instances
    nvlinkCoordinator = new NVLinkFabricCoordinator();
    multiExecutiveCoordinator = new MultiExecutiveCoordinator();
  });

  afterEach(async () => {
    // Cleanup
    if (nvlinkCoordinator) {
      await nvlinkCoordinator.cleanup();
    }
  });

  describe('NVLinkFabricCoordinator', () => {
    test('should initialize fabric topology correctly', async () => {
      expect(nvlinkCoordinator).toBeDefined();
      
      const topology = nvlinkCoordinator.getFabricTopology();
      expect(topology.size).toBe(8); // 8 B200 GPUs
      
      // Verify each GPU has proper NVLink connections
      for (const [gpuId, config] of topology.entries()) {
        expect(gpuId).toBeGreaterThanOrEqual(0);
        expect(gpuId).toBeLessThan(8);
        expect(config.connectedGPUs).toHaveLength(3); // Each GPU connects to 3 others
        expect(config.nvlinkBandwidth).toBe(5400); // 3 × 1800 GB/s
        expect(['primary', 'secondary', 'tertiary']).toContain(config.fabricPosition);
      }
    });

    test('should optimize executive placement across GPUs', async () => {
      const executives = ['sovren-ai', 'cfo', 'cmo', 'cto', 'clo'];
      
      const placement = await nvlinkCoordinator.optimizeExecutivePlacement(executives);
      
      expect(placement.size).toBe(executives.length);
      
      // Verify each executive is assigned to a unique GPU
      const assignedGPUs = new Set(placement.values());
      expect(assignedGPUs.size).toBe(executives.length);
      
      // Verify SOVREN-AI gets priority placement (GPU 0)
      expect(placement.get('sovren-ai')).toBe(0);
      
      // Verify all GPUs are within valid range
      for (const gpuId of placement.values()) {
        expect(gpuId).toBeGreaterThanOrEqual(0);
        expect(gpuId).toBeLessThan(8);
      }
    });

    test('should create coordination session successfully', async () => {
      const executives = ['cfo', 'cmo', 'cto'];
      await nvlinkCoordinator.optimizeExecutivePlacement(executives);
      
      const request: ExecutiveCoordinationRequest = {
        requestId: 'test-coordination-001',
        primaryExecutive: 'cfo',
        supportingExecutives: ['cmo', 'cto'],
        coordinationType: 'parallel',
        priority: 'high',
        estimatedDuration: 300000, // 5 minutes
        requiredBandwidth: 150,
        context: { test: true }
      };
      
      const session = await nvlinkCoordinator.createCoordinationSession(request);
      
      expect(session).toBeDefined();
      expect(session.sessionId).toBe(request.requestId);
      expect(session.status).toBe('initializing');
      expect(session.allocatedGPUs.size).toBe(3);
      expect(session.bandwidth).toBeGreaterThan(0);
      expect(session.latency).toBeGreaterThan(0);
      
      // Verify NVLink connections are calculated
      expect(session.nvlinkConnections.size).toBe(3);
    });

    test('should execute parallel coordination', async () => {
      const executives = ['cfo', 'cmo'];
      await nvlinkCoordinator.optimizeExecutivePlacement(executives);
      
      const request: ExecutiveCoordinationRequest = {
        requestId: 'test-parallel-001',
        primaryExecutive: 'cfo',
        supportingExecutives: ['cmo'],
        coordinationType: 'parallel',
        priority: 'medium',
        estimatedDuration: 180000,
        requiredBandwidth: 100,
        context: {}
      };
      
      const session = await nvlinkCoordinator.createCoordinationSession(request);
      
      const tasks = new Map([
        ['cfo', { task: 'financial_analysis', data: { revenue: 1000000 } }],
        ['cmo', { task: 'market_analysis', data: { segment: 'enterprise' } }]
      ]);
      
      const results = await nvlinkCoordinator.executeParallelCoordination(
        session.sessionId,
        tasks
      );
      
      expect(results.size).toBe(2);
      expect(results.has('cfo')).toBe(true);
      expect(results.has('cmo')).toBe(true);
      
      // Verify results contain expected structure
      for (const [executive, result] of results.entries()) {
        expect(result).toHaveProperty('executive');
        expect(result).toHaveProperty('result');
        expect(result).toHaveProperty('processingTime');
        expect(result.executive).toBe(executive);
      }
    });

    test('should calculate fabric performance metrics', () => {
      const metrics = nvlinkCoordinator.getFabricMetrics();
      
      expect(metrics).toHaveProperty('totalBandwidth');
      expect(metrics).toHaveProperty('utilizedBandwidth');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('throughputEfficiency');
      expect(metrics).toHaveProperty('coordinationSessions');
      expect(metrics).toHaveProperty('executiveDistribution');
      
      expect(metrics.totalBandwidth).toBeGreaterThan(0);
      expect(metrics.throughputEfficiency).toBeGreaterThanOrEqual(0);
      expect(metrics.throughputEfficiency).toBeLessThanOrEqual(1);
    });

    test('should handle session completion', async () => {
      const executives = ['cfo'];
      await nvlinkCoordinator.optimizeExecutivePlacement(executives);
      
      const request: ExecutiveCoordinationRequest = {
        requestId: 'test-completion-001',
        primaryExecutive: 'cfo',
        supportingExecutives: [],
        coordinationType: 'sequential',
        priority: 'low',
        estimatedDuration: 60000,
        requiredBandwidth: 50,
        context: {}
      };
      
      const session = await nvlinkCoordinator.createCoordinationSession(request);
      expect(session.status).toBe('initializing');
      
      await nvlinkCoordinator.completeSession(session.sessionId);
      
      // Verify session is no longer active
      const activeSessions = nvlinkCoordinator.getActiveSessions();
      expect(activeSessions.has(session.sessionId)).toBe(false);
    });
  });

  describe('MultiExecutiveCoordinator', () => {
    test('should initialize executive roles correctly', () => {
      const executiveRoles = multiExecutiveCoordinator.getExecutiveRoles();
      
      expect(executiveRoles.size).toBe(8); // All Shadow Board executives
      
      // Verify SOVREN-AI has highest priority
      const sovrenAI = executiveRoles.get('sovren-ai');
      expect(sovrenAI).toBeDefined();
      expect(sovrenAI?.priority).toBe(10);
      expect(sovrenAI?.decisionWeight).toBe(0.3);
      
      // SECURITY: This test needs to be updated to use secure executive access
      // CFO configuration should be verified through ExecutiveAccessManager
      const cfo = executiveRoles.get('cfo');
      expect(cfo).toBeDefined();
      expect(cfo?.role).toBe('cfo'); // Verify role, not hardcoded name
      expect(cfo?.title).toBe('Chief Financial Officer');
      expect(cfo?.expertise).toContain('financial_analysis');
      
      // Verify all executives have required properties
      for (const [id, role] of executiveRoles.entries()) {
        expect(role).toHaveProperty('id');
        expect(role).toHaveProperty('name');
        expect(role).toHaveProperty('title');
        expect(role).toHaveProperty('expertise');
        expect(role).toHaveProperty('priority');
        expect(role).toHaveProperty('decisionWeight');
        
        expect(Array.isArray(role.expertise)).toBe(true);
        expect(role.priority).toBeGreaterThan(0);
        expect(role.decisionWeight).toBeGreaterThan(0);
        expect(role.decisionWeight).toBeLessThanOrEqual(1);
      }
    });

    test('should coordinate executive response for financial analysis', async () => {
      const scenario: CoordinationScenario = {
        scenarioId: 'financial-analysis-001',
        type: 'financial_analysis',
        description: 'Quarterly financial performance analysis',
        requiredExecutives: ['cfo', 'sovren-ai'],
        optionalExecutives: ['coo'],
        coordinationPattern: 'hierarchical',
        estimatedDuration: 15,
        priority: 'high'
      };
      
      const context = {
        quarter: 'Q4 2024',
        revenue: 5000000,
        expenses: 3500000,
        growth: 0.15
      };
      
      // Mock the B200LLMClient response
      const mockResponse = 'Financial analysis indicates strong performance with 15% growth...';
      jest.spyOn(multiExecutiveCoordinator as any, 'generateExecutiveResponse')
        .mockResolvedValue({
          executiveId: 'cfo',
          response: mockResponse,
          confidence: 0.85,
          reasoning: 'Based on financial data analysis',
          recommendations: ['Increase investment in growth areas', 'Optimize operational costs'],
          timestamp: new Date(),
          processingTime: 250
        });
      
      const result = await multiExecutiveCoordinator.coordinateExecutiveResponse(scenario, context);
      
      expect(result).toBeDefined();
      expect(result.scenarioId).toBe(scenario.scenarioId);
      expect(result.coordinationType).toBe('hierarchical');
      expect(result.executiveResponses.size).toBeGreaterThan(0);
      expect(result.finalDecision).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.consensus).toBeGreaterThanOrEqual(0);
      expect(result.totalProcessingTime).toBeGreaterThan(0);
    });

    test('should handle parallel coordination pattern', async () => {
      const scenario: CoordinationScenario = {
        scenarioId: 'market-analysis-001',
        type: 'market_analysis',
        description: 'Competitive market analysis',
        requiredExecutives: ['cmo', 'cso'],
        optionalExecutives: ['cfo'],
        coordinationPattern: 'parallel',
        estimatedDuration: 20,
        priority: 'medium'
      };
      
      const context = {
        market: 'enterprise_software',
        competitors: ['Company A', 'Company B'],
        timeframe: '2024'
      };
      
      // Mock parallel execution
      jest.spyOn(multiExecutiveCoordinator as any, 'executeParallelCoordination')
        .mockResolvedValue(new Map([
          ['cmo', {
            executiveId: 'cmo',
            response: 'Market analysis shows strong opportunities...',
            confidence: 0.8,
            reasoning: 'Marketing perspective analysis',
            recommendations: ['Expand market presence'],
            timestamp: new Date(),
            processingTime: 200
          }],
          ['cso', {
            executiveId: 'cso',
            response: 'Strategic positioning analysis...',
            confidence: 0.9,
            reasoning: 'Strategic analysis',
            recommendations: ['Focus on differentiation'],
            timestamp: new Date(),
            processingTime: 180
          }]
        ]));
      
      const result = await multiExecutiveCoordinator.coordinateExecutiveResponse(scenario, context);
      
      expect(result.coordinationType).toBe('parallel');
      expect(result.executiveResponses.size).toBe(2);
      expect(result.executiveResponses.has('cmo')).toBe(true);
      expect(result.executiveResponses.has('cso')).toBe(true);
    });

    test('should track coordination history', async () => {
      const initialHistory = multiExecutiveCoordinator.getCoordinationHistory();
      const initialCount = initialHistory.length;
      
      const scenario: CoordinationScenario = {
        scenarioId: 'history-test-001',
        type: 'operational_planning',
        description: 'Test coordination for history tracking',
        requiredExecutives: ['coo'],
        optionalExecutives: [],
        coordinationPattern: 'sequential',
        estimatedDuration: 10,
        priority: 'low'
      };
      
      // Mock the coordination execution
      jest.spyOn(multiExecutiveCoordinator as any, 'executeSequentialCoordination')
        .mockResolvedValue(new Map([
          ['coo', {
            executiveId: 'coo',
            response: 'Operational analysis complete',
            confidence: 0.75,
            reasoning: 'Operations perspective',
            recommendations: ['Optimize processes'],
            timestamp: new Date(),
            processingTime: 150
          }]
        ]));
      
      await multiExecutiveCoordinator.coordinateExecutiveResponse(scenario, {});
      
      const updatedHistory = multiExecutiveCoordinator.getCoordinationHistory();
      expect(updatedHistory.length).toBe(initialCount + 1);
      
      const latestCoordination = updatedHistory[updatedHistory.length - 1];
      expect(latestCoordination.scenarioId).toBe(scenario.scenarioId);
    });

    test('should handle active coordinations tracking', async () => {
      const activeCoordinations = multiExecutiveCoordinator.getActiveCoordinations();
      const initialCount = activeCoordinations.size;
      
      const scenario: CoordinationScenario = {
        scenarioId: 'active-test-001',
        type: 'crisis_management',
        description: 'Test active coordination tracking',
        requiredExecutives: ['sovren-ai', 'cfo'],
        optionalExecutives: [],
        coordinationPattern: 'hierarchical',
        estimatedDuration: 5,
        priority: 'critical'
      };
      
      // Start coordination (this will add to active coordinations)
      const coordinationPromise = multiExecutiveCoordinator.coordinateExecutiveResponse(scenario, {});
      
      // Check that it's added to active coordinations
      const activeAfterStart = multiExecutiveCoordinator.getActiveCoordinations();
      expect(activeAfterStart.size).toBe(initialCount + 1);
      expect(activeAfterStart.has(scenario.scenarioId)).toBe(true);
      
      // Wait for completion
      await coordinationPromise;
      
      // Check that it's removed from active coordinations
      const activeAfterComplete = multiExecutiveCoordinator.getActiveCoordinations();
      expect(activeAfterComplete.size).toBe(initialCount);
      expect(activeAfterComplete.has(scenario.scenarioId)).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    test('should integrate NVLink coordination with multi-executive system', async () => {
      const executives = ['cfo', 'cmo', 'cto'];
      
      // Optimize placement
      const placement = await nvlinkCoordinator.optimizeExecutivePlacement(executives);
      expect(placement.size).toBe(3);
      
      // Create coordination scenario
      const scenario: CoordinationScenario = {
        scenarioId: 'integration-test-001',
        type: 'strategic_planning',
        description: 'Integration test for NVLink and multi-executive coordination',
        requiredExecutives: executives,
        optionalExecutives: [],
        coordinationPattern: 'consensus',
        estimatedDuration: 25,
        priority: 'high'
      };
      
      // Mock consensus coordination
      jest.spyOn(multiExecutiveCoordinator as any, 'executeConsensusCoordination')
        .mockResolvedValue(new Map(executives.map(exec => [
          exec,
          {
            executiveId: exec,
            response: `${exec} strategic analysis`,
            confidence: 0.8 + Math.random() * 0.1,
            reasoning: `${exec} perspective`,
            recommendations: [`${exec} recommendation`],
            timestamp: new Date(),
            processingTime: 200 + Math.random() * 100
          }
        ])));
      
      const result = await multiExecutiveCoordinator.coordinateExecutiveResponse(scenario, {});
      
      expect(result.executiveResponses.size).toBe(3);
      expect(result.coordinationType).toBe('consensus');
      expect(result.nvlinkUtilization).toBeGreaterThan(0);
    });

    test('should handle fabric performance monitoring during coordination', async () => {
      const initialMetrics = nvlinkCoordinator.getFabricMetrics();
      
      const executives = ['sovren-ai', 'cfo'];
      await nvlinkCoordinator.optimizeExecutivePlacement(executives);
      
      const request: ExecutiveCoordinationRequest = {
        requestId: 'performance-test-001',
        primaryExecutive: 'sovren-ai',
        supportingExecutives: ['cfo'],
        coordinationType: 'hierarchical',
        priority: 'high',
        estimatedDuration: 120000,
        requiredBandwidth: 200,
        context: {}
      };
      
      const session = await nvlinkCoordinator.createCoordinationSession(request);
      
      const metricsAfterSession = nvlinkCoordinator.getFabricMetrics();
      expect(metricsAfterSession.coordinationSessions).toBeGreaterThanOrEqual(initialMetrics.coordinationSessions);
      
      await nvlinkCoordinator.completeSession(session.sessionId);
      
      const metricsAfterCompletion = nvlinkCoordinator.getFabricMetrics();
      expect(metricsAfterCompletion.coordinationSessions).toBeLessThanOrEqual(metricsAfterSession.coordinationSessions);
    });
  });
});
