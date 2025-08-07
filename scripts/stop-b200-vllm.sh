#!/bin/bash

# B200 VLLM STOP SCRIPT
# Gracefully stops VLLM inference server and MCP server

echo "🛑 Stopping B200 VLLM System..."

# Read PIDs if available
if [ -f ".vllm_pid" ]; then
    VLLM_PID=$(cat .vllm_pid)
    echo "🔄 Stopping VLLM Server (PID: $VLLM_PID)..."
    kill -TERM $VLLM_PID 2>/dev/null || true
    sleep 5
    kill -KILL $VLLM_PID 2>/dev/null || true
    rm -f .vllm_pid
    echo "✅ VLLM Server stopped"
fi

if [ -f ".mcp_pid" ]; then
    MCP_PID=$(cat .mcp_pid)
    echo "🔄 Stopping MCP Server (PID: $MCP_PID)..."
    kill -TERM $MCP_PID 2>/dev/null || true
    sleep 3
    kill -KILL $MCP_PID 2>/dev/null || true
    rm -f .mcp_pid
    echo "✅ MCP Server stopped"
fi

# Kill any remaining processes
echo "🧹 Cleaning up remaining processes..."
pkill -f "VLLMInferenceServer.py" 2>/dev/null || true
pkill -f "SOVRENMCPServer.py" 2>/dev/null || true

echo "✅ B200 VLLM System stopped successfully"
