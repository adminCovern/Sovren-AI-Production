#!/usr/bin/env python3
"""
SOVREN MCP Server Deployment Script
Complete production deployment with safety checks
ZERO PLACEHOLDERS - FULL FUNCTIONALITY
"""

import asyncio
import subprocess
import sys
import os
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MCPServerDeployer:
    """Complete MCP Server deployment system"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.mcp_dir = self.project_root / "src" / "mcp"
        self.venv_path = self.project_root / "venv_mcp"
        
    def check_system_requirements(self) -> bool:
        """Check system requirements"""
        logger.info("🔍 Checking system requirements...")
        
        # Check Python version
        if sys.version_info < (3, 8):
            logger.error("Python 3.8+ required")
            return False
        
        # Check NVIDIA drivers
        try:
            result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
            if result.returncode != 0:
                logger.error("NVIDIA drivers not found or not working")
                return False
            logger.info("✅ NVIDIA drivers detected")
        except FileNotFoundError:
            logger.error("nvidia-smi not found - NVIDIA drivers required")
            return False
        
        # Check CUDA
        try:
            import torch
            if not torch.cuda.is_available():
                logger.error("CUDA not available")
                return False
            gpu_count = torch.cuda.device_count()
            logger.info(f"✅ CUDA available with {gpu_count} GPUs")
        except ImportError:
            logger.warning("PyTorch not installed - will install during setup")
        
        # Check available memory
        import psutil
        memory_gb = psutil.virtual_memory().total / (1024**3)
        if memory_gb < 16:
            logger.error(f"Insufficient RAM: {memory_gb:.1f}GB (16GB+ required)")
            return False
        logger.info(f"✅ System memory: {memory_gb:.1f}GB")
        
        return True
    
    def create_virtual_environment(self) -> bool:
        """Create Python virtual environment"""
        logger.info("🐍 Creating Python virtual environment...")
        
        try:
            # Remove existing venv if present
            if self.venv_path.exists():
                import shutil
                shutil.rmtree(self.venv_path)
            
            # Create new venv
            subprocess.run([
                sys.executable, '-m', 'venv', str(self.venv_path)
            ], check=True)
            
            logger.info("✅ Virtual environment created")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to create virtual environment: {e}")
            return False
    
    def install_dependencies(self) -> bool:
        """Install all dependencies"""
        logger.info("📦 Installing dependencies...")
        
        # Get pip path
        if os.name == 'nt':  # Windows
            pip_path = self.venv_path / "Scripts" / "pip.exe"
            python_path = self.venv_path / "Scripts" / "python.exe"
        else:  # Linux/Mac
            pip_path = self.venv_path / "bin" / "pip"
            python_path = self.venv_path / "bin" / "python"
        
        try:
            # Upgrade pip
            subprocess.run([
                str(python_path), '-m', 'pip', 'install', '--upgrade', 'pip'
            ], check=True)
            
            # Install PyTorch with CUDA support
            logger.info("Installing PyTorch with CUDA support...")
            subprocess.run([
                str(pip_path), 'install', 'torch', 'torchvision', 'torchaudio',
                '--index-url', 'https://download.pytorch.org/whl/cu121'
            ], check=True)
            
            # Install requirements
            requirements_file = self.mcp_dir / "requirements.txt"
            if requirements_file.exists():
                subprocess.run([
                    str(pip_path), 'install', '-r', str(requirements_file)
                ], check=True)
            
            logger.info("✅ Dependencies installed")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to install dependencies: {e}")
            return False
    
    def verify_gpu_access(self) -> bool:
        """Verify GPU access from Python"""
        logger.info("🔧 Verifying GPU access...")
        
        # Get python path
        if os.name == 'nt':  # Windows
            python_path = self.venv_path / "Scripts" / "python.exe"
        else:  # Linux/Mac
            python_path = self.venv_path / "bin" / "python"
        
        test_script = """
import torch
import GPUtil

print(f"PyTorch CUDA available: {torch.cuda.is_available()}")
print(f"PyTorch GPU count: {torch.cuda.device_count()}")

gpus = GPUtil.getGPUs()
print(f"GPUtil GPU count: {len(gpus)}")

for i, gpu in enumerate(gpus):
    print(f"GPU {i}: {gpu.name} - {gpu.memoryTotal}MB total memory")

# Test CUDA tensor creation
if torch.cuda.is_available():
    x = torch.randn(1000, 1000).cuda()
    y = torch.randn(1000, 1000).cuda()
    z = torch.matmul(x, y)
    print("✅ CUDA tensor operations working")
else:
    print("❌ CUDA not available")
"""
        
        try:
            result = subprocess.run([
                str(python_path), '-c', test_script
            ], capture_output=True, text=True, check=True)
            
            logger.info("GPU verification output:")
            for line in result.stdout.strip().split('\n'):
                logger.info(f"  {line}")
            
            if "CUDA tensor operations working" in result.stdout:
                logger.info("✅ GPU access verified")
                return True
            else:
                logger.error("❌ GPU access verification failed")
                return False
                
        except subprocess.CalledProcessError as e:
            logger.error(f"GPU verification failed: {e}")
            logger.error(f"stderr: {e.stderr}")
            return False
    
    def create_systemd_service(self) -> bool:
        """Create systemd service for MCP server"""
        if os.name == 'nt':  # Windows
            logger.info("Skipping systemd service creation on Windows")
            return True
        
        logger.info("🔧 Creating systemd service...")
        
        # Get python path
        python_path = self.venv_path / "bin" / "python"
        mcp_server_path = self.mcp_dir / "SOVRENMCPServer.py"
        
        service_content = f"""[Unit]
Description=SOVREN MCP Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory={self.project_root}
Environment=PYTHONPATH={self.project_root}
ExecStart={python_path} {mcp_server_path}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""
        
        try:
            service_file = Path("/etc/systemd/system/sovren-mcp.service")
            
            # Write service file (requires sudo)
            with open("/tmp/sovren-mcp.service", "w") as f:
                f.write(service_content)
            
            subprocess.run([
                'sudo', 'mv', '/tmp/sovren-mcp.service', str(service_file)
            ], check=True)
            
            # Reload systemd
            subprocess.run(['sudo', 'systemctl', 'daemon-reload'], check=True)
            
            # Enable service
            subprocess.run(['sudo', 'systemctl', 'enable', 'sovren-mcp'], check=True)
            
            logger.info("✅ Systemd service created and enabled")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to create systemd service: {e}")
            return False
        except PermissionError:
            logger.error("Permission denied - run with sudo for systemd service")
            return False
    
    def test_mcp_server(self) -> bool:
        """Test MCP server functionality"""
        logger.info("🧪 Testing MCP server...")
        
        # Get python path
        if os.name == 'nt':  # Windows
            python_path = self.venv_path / "Scripts" / "python.exe"
        else:  # Linux/Mac
            python_path = self.venv_path / "bin" / "python"
        
        # Start server in background
        mcp_server_path = self.mcp_dir / "SOVRENMCPServer.py"
        
        try:
            # Start server process
            server_process = subprocess.Popen([
                str(python_path), str(mcp_server_path)
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Wait for server to start
            time.sleep(10)
            
            # Test health endpoint
            import requests
            response = requests.get("http://localhost:8000/health", timeout=5)
            
            if response.status_code == 200:
                logger.info("✅ MCP server health check passed")
                
                # Test status endpoint
                response = requests.get("http://localhost:8000/status", timeout=5)
                if response.status_code == 200:
                    status_data = response.json()
                    logger.info(f"✅ MCP server status: {len(status_data['gpus'])} GPUs detected")
                    
                    # Terminate server
                    server_process.terminate()
                    server_process.wait(timeout=5)
                    
                    return True
                else:
                    logger.error("Status endpoint failed")
            else:
                logger.error("Health check failed")
            
            # Terminate server
            server_process.terminate()
            server_process.wait(timeout=5)
            return False
            
        except Exception as e:
            logger.error(f"MCP server test failed: {e}")
            try:
                server_process.terminate()
            except:
                pass
            return False
    
    async def deploy_complete_system(self) -> bool:
        """Deploy complete MCP server system"""
        logger.info("🚀 DEPLOYING SOVREN MCP SERVER - COMPLETE SYSTEM")
        
        # Step 1: System requirements
        if not self.check_system_requirements():
            logger.error("❌ System requirements check failed")
            return False
        
        # Step 2: Virtual environment
        if not self.create_virtual_environment():
            logger.error("❌ Virtual environment creation failed")
            return False
        
        # Step 3: Dependencies
        if not self.install_dependencies():
            logger.error("❌ Dependency installation failed")
            return False
        
        # Step 4: GPU verification
        if not self.verify_gpu_access():
            logger.error("❌ GPU access verification failed")
            return False
        
        # Step 5: Systemd service (Linux only)
        if not self.create_systemd_service():
            logger.warning("⚠️ Systemd service creation failed (continuing anyway)")
        
        # Step 6: Test server
        if not self.test_mcp_server():
            logger.error("❌ MCP server test failed")
            return False
        
        logger.info("🎉 SOVREN MCP SERVER DEPLOYMENT COMPLETE")
        logger.info("🛡️ Infrastructure protection active")
        logger.info("📊 Resource management operational")
        logger.info("🔧 Emergency protocols enabled")
        
        return True

async def main():
    """Main deployment function"""
    deployer = MCPServerDeployer()
    
    success = await deployer.deploy_complete_system()
    
    if success:
        logger.info("✅ DEPLOYMENT SUCCESSFUL")
        logger.info("To start the MCP server:")
        logger.info("  Linux: sudo systemctl start sovren-mcp")
        logger.info("  Manual: python src/mcp/SOVRENMCPServer.py")
        sys.exit(0)
    else:
        logger.error("❌ DEPLOYMENT FAILED")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
