'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import B200ResourceDashboard from '@/components/dashboard/B200ResourceDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, Activity, Cpu, Database } from 'lucide-react';

/**
 * B200 Resource Monitoring Dashboard Page
 * Secure access to real-time GPU monitoring and executive workload visualization
 */

interface UserSession {
  userId: string;
  username: string;
  role: string;
  authenticated: boolean;
}

export default function B200DashboardPage() {
  const router = useRouter();
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication and load user session
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Get user ID from localStorage or session storage
        const storedUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        
        if (!storedUserId) {
          router.push('/login?redirect=/dashboard/b200');
          return;
        }

        // Validate session with backend
        const response = await fetch('/api/auth/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: storedUserId })
        });

        if (!response.ok) {
          throw new Error('Session validation failed');
        }

        const result = await response.json();
        
        if (result.success && result.user) {
          setUserSession({
            userId: storedUserId,
            username: result.user.username || 'Unknown User',
            role: result.user.role || 'user',
            authenticated: true
          });
        } else {
          throw new Error('Invalid session');
        }

      } catch (err) {
        console.error('Authentication error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        
        // Redirect to login after a delay
        setTimeout(() => {
          router.push('/login?redirect=/dashboard/b200');
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    checkAuthentication();
  }, [router]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('userId');
    sessionStorage.removeItem('userId');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading B200 Dashboard</h2>
          <p className="text-gray-600">Authenticating and initializing monitoring systems...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Authentication Error</div>
              <div className="text-sm mb-4">{error}</div>
              <div className="text-sm text-gray-600 mb-4">
                You will be redirected to the login page in a few seconds.
              </div>
              <Button 
                onClick={() => router.push('/login?redirect=/dashboard/b200')}
                className="w-full"
              >
                Go to Login
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!userSession?.authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mb-4">You are not authenticated to view this dashboard.</p>
          <Button onClick={() => router.push('/login')}>
            Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">SOVREN B200 Dashboard</h1>
              </div>
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                <a href="/dashboard" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
                  Main Dashboard
                </a>
                <a href="/dashboard/b200" className="text-blue-600 border-b-2 border-blue-600 px-3 py-2 text-sm font-medium">
                  B200 Resources
                </a>
                <a href="/dashboard/executives" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
                  Shadow Board
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{userSession.username}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Operational</div>
              <p className="text-xs text-muted-foreground">
                All B200 Blackwell GPUs online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GPU Cluster</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8x B200</div>
              <p className="text-xs text-muted-foreground">
                NVIDIA Blackwell Architecture
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Memory</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">640 GB</div>
              <p className="text-xs text-muted-foreground">
                HBM3e High-Bandwidth Memory
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Component */}
        <B200ResourceDashboard userId={userSession.userId} />

        {/* Technical Specifications */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>B200 Blackwell Technical Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Architecture</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• NVIDIA Blackwell</li>
                  <li>• 4nm Process Node</li>
                  <li>• 208 Billion Transistors</li>
                  <li>• Dual-GPU Design</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Memory</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 80GB HBM3e per GPU</li>
                  <li>• 8TB/s Memory Bandwidth</li>
                  <li>• ECC Protection</li>
                  <li>• 640GB Total Cluster</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 20 PetaFLOPS FP4</li>
                  <li>• 10 PetaFLOPS FP8</li>
                  <li>• 5 PetaFLOPS FP16</li>
                  <li>• 2.5 PetaFLOPS FP32</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Connectivity</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• NVLink 5.0</li>
                  <li>• 1.8TB/s NVLink Bandwidth</li>
                  <li>• PCIe Gen 5.0</li>
                  <li>• InfiniBand Support</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>SOVREN B200 Resource Monitoring Dashboard</p>
          <p>Powered by NVIDIA Blackwell Architecture • Real-time GPU Analytics</p>
        </footer>
      </main>
    </div>
  );
}
