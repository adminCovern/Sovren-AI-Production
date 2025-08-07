#!/usr/bin/env python3
"""
SOVREN MCP Server Test Suite
Comprehensive testing of all MCP server functionality
ZERO PLACEHOLDERS - FULL FUNCTIONALITY
"""

import asyncio
import json
import time
import requests
import websockets
import logging
from typing import Dict, Any, List
import subprocess
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MCPServerTester:
    """Complete MCP server testing system"""
    
    def __init__(self, server_url: str = "http://localhost:8000"):
        self.server_url = server_url
        self.websocket_url = server_url.replace("http", "ws") + "/ws"
        self.test_results = []
        
    def log_test_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        logger.info(f"{status} {test_name}: {details}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': time.time()
        })
    
    def test_health_endpoint(self) -> bool:
        """Test health check endpoint"""
        try:
            response = requests.get(f"{self.server_url}/health", timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if 'status' in data and data['status'] == 'healthy':
                    self.log_test_result(
                        "Health Endpoint",
                        True,
                        f"Server healthy, {data.get('gpu_count', 0)} GPUs"
                    )
                    return True
                else:
                    self.log_test_result("Health Endpoint", False, "Invalid response format")
                    return False
            else:
                self.log_test_result("Health Endpoint", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("Health Endpoint", False, str(e))
            return False
    
    def test_status_endpoint(self) -> bool:
        """Test comprehensive status endpoint"""
        try:
            response = requests.get(f"{self.server_url}/status", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ['timestamp', 'system', 'gpus', 'allocations', 'emergency']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test_result(
                        "Status Endpoint",
                        False,
                        f"Missing fields: {missing_fields}"
                    )
                    return False
                
                # Check GPU data
                gpu_count = len(data['gpus'])
                system_memory = data['system']['memory_total_gb']
                
                self.log_test_result(
                    "Status Endpoint",
                    True,
                    f"{gpu_count} GPUs, {system_memory:.1f}GB RAM"
                )
                return True
                
            else:
                self.log_test_result("Status Endpoint", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("Status Endpoint", False, str(e))
            return False
    
    def test_resource_allocation(self) -> bool:
        """Test resource allocation and deallocation"""
        try:
            # Test allocation request
            allocation_request = {
                'component': 'test_component',
                'gpu_ids': [0],
                'memory_gb': 1.0,
                'cpu_cores': 2,
                'priority': 'normal'
            }
            
            response = requests.post(
                f"{self.server_url}/allocate",
                json=allocation_request,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and 'allocation_id' in data:
                    allocation_id = data['allocation_id']
                    
                    # Test allocation status check
                    status_response = requests.get(
                        f"{self.server_url}/allocate/{allocation_id}",
                        timeout=5
                    )
                    
                    if status_response.status_code == 200:
                        # Test deallocation
                        delete_response = requests.delete(
                            f"{self.server_url}/allocate/{allocation_id}",
                            timeout=5
                        )
                        
                        if delete_response.status_code == 200:
                            self.log_test_result(
                                "Resource Allocation",
                                True,
                                f"Allocated and deallocated {allocation_id}"
                            )
                            return True
                        else:
                            self.log_test_result(
                                "Resource Allocation",
                                False,
                                "Deallocation failed"
                            )
                            return False
                    else:
                        self.log_test_result(
                            "Resource Allocation",
                            False,
                            "Status check failed"
                        )
                        return False
                else:
                    self.log_test_result(
                        "Resource Allocation",
                        False,
                        "Invalid allocation response"
                    )
                    return False
            else:
                self.log_test_result(
                    "Resource Allocation",
                    False,
                    f"Allocation failed: HTTP {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test_result("Resource Allocation", False, str(e))
            return False
    
    def test_safety_limits(self) -> bool:
        """Test safety limit enforcement"""
        try:
            # Try to allocate excessive resources
            excessive_request = {
                'component': 'excessive_test',
                'gpu_ids': [0, 1, 2, 3, 4, 5, 6, 7],  # All GPUs
                'memory_gb': 1000.0,  # Excessive memory
                'priority': 'high'
            }
            
            response = requests.post(
                f"{self.server_url}/allocate",
                json=excessive_request,
                timeout=10
            )
            
            # Should be rejected
            if response.status_code == 400:
                self.log_test_result(
                    "Safety Limits",
                    True,
                    "Excessive allocation properly rejected"
                )
                return True
            else:
                self.log_test_result(
                    "Safety Limits",
                    False,
                    f"Excessive allocation not rejected: HTTP {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test_result("Safety Limits", False, str(e))
            return False
    
    async def test_websocket_monitoring(self) -> bool:
        """Test WebSocket real-time monitoring"""
        try:
            async with websockets.connect(self.websocket_url) as websocket:
                # Wait for first message
                message = await asyncio.wait_for(websocket.recv(), timeout=10)
                data = json.loads(message)
                
                # Validate message structure
                required_fields = ['timestamp', 'system_memory_usage', 'cpu_usage', 'gpu_summary']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test_result(
                        "WebSocket Monitoring",
                        False,
                        f"Missing fields: {missing_fields}"
                    )
                    return False
                
                # Wait for second message to confirm streaming
                message2 = await asyncio.wait_for(websocket.recv(), timeout=10)
                data2 = json.loads(message2)
                
                if data2['timestamp'] != data['timestamp']:
                    self.log_test_result(
                        "WebSocket Monitoring",
                        True,
                        f"Real-time monitoring active, {len(data['gpu_summary'])} GPUs"
                    )
                    return True
                else:
                    self.log_test_result(
                        "WebSocket Monitoring",
                        False,
                        "No timestamp progression"
                    )
                    return False
                    
        except Exception as e:
            self.log_test_result("WebSocket Monitoring", False, str(e))
            return False
    
    def test_gpu_monitoring(self) -> bool:
        """Test GPU monitoring functionality"""
        try:
            response = requests.get(f"{self.server_url}/status", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                gpus = data.get('gpus', [])
                
                if not gpus:
                    self.log_test_result("GPU Monitoring", False, "No GPUs detected")
                    return False
                
                # Check GPU data completeness
                for i, gpu in enumerate(gpus):
                    required_fields = [
                        'gpu_id', 'memory_used_gb', 'memory_total_gb',
                        'utilization_percent', 'temperature_celsius'
                    ]
                    
                    missing_fields = [field for field in required_fields if field not in gpu]
                    if missing_fields:
                        self.log_test_result(
                            "GPU Monitoring",
                            False,
                            f"GPU {i} missing fields: {missing_fields}"
                        )
                        return False
                
                self.log_test_result(
                    "GPU Monitoring",
                    True,
                    f"Complete monitoring data for {len(gpus)} GPUs"
                )
                return True
            else:
                self.log_test_result("GPU Monitoring", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("GPU Monitoring", False, str(e))
            return False
    
    def test_emergency_detection(self) -> bool:
        """Test emergency condition detection"""
        try:
            response = requests.get(f"{self.server_url}/status", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                emergency_data = data.get('emergency', {})
                
                if 'emergency_detected' in emergency_data and 'conditions' in emergency_data:
                    emergency_status = emergency_data['emergency_detected']
                    condition_count = len(emergency_data['conditions'])
                    
                    self.log_test_result(
                        "Emergency Detection",
                        True,
                        f"Emergency system active, status: {emergency_status}, conditions: {condition_count}"
                    )
                    return True
                else:
                    self.log_test_result(
                        "Emergency Detection",
                        False,
                        "Emergency data structure invalid"
                    )
                    return False
            else:
                self.log_test_result("Emergency Detection", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("Emergency Detection", False, str(e))
            return False
    
    async def run_comprehensive_tests(self) -> Dict[str, Any]:
        """Run all tests and return results"""
        logger.info("🧪 STARTING COMPREHENSIVE MCP SERVER TESTS")
        
        # Basic functionality tests
        tests = [
            ("Health Check", self.test_health_endpoint),
            ("Status Endpoint", self.test_status_endpoint),
            ("Resource Allocation", self.test_resource_allocation),
            ("Safety Limits", self.test_safety_limits),
            ("GPU Monitoring", self.test_gpu_monitoring),
            ("Emergency Detection", self.test_emergency_detection),
        ]
        
        # Run synchronous tests
        for test_name, test_func in tests:
            logger.info(f"Running {test_name}...")
            test_func()
        
        # Run async tests
        logger.info("Running WebSocket Monitoring...")
        await self.test_websocket_monitoring()
        
        # Calculate results
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        results = {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': success_rate,
            'test_details': self.test_results
        }
        
        # Log summary
        logger.info("🏁 TEST SUMMARY")
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Passed: {passed_tests}")
        logger.info(f"Failed: {failed_tests}")
        logger.info(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate == 100:
            logger.info("🎉 ALL TESTS PASSED - MCP SERVER FULLY OPERATIONAL")
        else:
            logger.warning("⚠️ SOME TESTS FAILED - CHECK LOGS FOR DETAILS")
        
        return results

async def main():
    """Main test function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test SOVREN MCP Server")
    parser.add_argument(
        "--server-url",
        default="http://localhost:8000",
        help="MCP server URL (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--output-file",
        help="Save test results to JSON file"
    )
    
    args = parser.parse_args()
    
    # Create tester
    tester = MCPServerTester(args.server_url)
    
    # Run tests
    results = await tester.run_comprehensive_tests()
    
    # Save results if requested
    if args.output_file:
        with open(args.output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        logger.info(f"Test results saved to {args.output_file}")
    
    # Exit with appropriate code
    if results['success_rate'] == 100:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
