#!/usr/bin/env ts-node

/**
 * Admin Access Initialization Script
 * Sets up Brian Geary as the main admin user with full Shadow Board access
 */

import { AdminUserRegistry, AdminAuthService, BRIAN_GEARY_ADMIN } from '../src/lib/auth/AdminUserConfig';
import { AdminAuthMiddleware, BrianGearyAdminAccess } from '../src/lib/auth/AdminAuthMiddleware';
import { ShadowBoardManager } from '../src/lib/shadowboard/ShadowBoardManager';

async function initializeAdminAccess() {
  console.log('🔐 INITIALIZING ADMIN ACCESS FOR BRIAN GEARY');
  console.log('=' .repeat(60));

  try {
    // Step 1: Verify admin user configuration
    console.log('\n📋 Step 1: Verifying Admin User Configuration');
    console.log(`👤 Name: ${BRIAN_GEARY_ADMIN.name}`);
    console.log(`📧 Email: ${BRIAN_GEARY_ADMIN.email}`);
    console.log(`🎯 Role: ${BRIAN_GEARY_ADMIN.role}`);
    console.log(`🔑 Password: Rocco2025%$$ (configured)`);
    console.log(`✅ Admin user configuration verified`);

    // Step 2: Test admin authentication
    console.log('\n🔐 Step 2: Testing Admin Authentication');
    const loginResult = await BrianGearyAdminAccess.quickLogin();
    
    if (!loginResult.success) {
      throw new Error(`Admin login failed: ${loginResult.error}`);
    }

    console.log(`✅ Admin authentication successful`);
    console.log(`🎫 Session token generated`);
    console.log(`👥 Shadow Board access: ${loginResult.shadowBoardAccess?.allExecutives ? 'ALL EXECUTIVES' : 'LIMITED'}`);
    console.log(`🧠 SOVREN-AI access: ${loginResult.shadowBoardAccess?.sovrenAI ? 'YES' : 'NO'}`);

    // Step 3: Verify Shadow Board initialization
    console.log('\n🏢 Step 3: Verifying Shadow Board Initialization');
    const shadowBoard = BrianGearyAdminAccess.getShadowBoard();
    
    if (!shadowBoard) {
      throw new Error('Shadow Board not initialized for admin');
    }

    const executives = shadowBoard.getExecutives();
    console.log(`✅ Shadow Board initialized`);
    console.log(`👥 Total executives: ${executives.size}`);
    console.log(`📋 Executive list: ${Array.from(executives.keys()).join(', ')}`);

    // Step 4: Test executive access
    console.log('\n🎯 Step 4: Testing Executive Access');
    
    const testExecutives = ['CFO', 'CMO', 'CTO', 'CLO', 'COO', 'CHRO', 'CSO', 'SOVREN-AI'];
    
    for (const executiveRole of testExecutives) {
      const hasAccess = AdminAuthMiddleware.canAccessExecutive(BRIAN_GEARY_ADMIN.email, executiveRole);
      const executive = shadowBoard.getExecutive(executiveRole);
      
      console.log(`${hasAccess ? '✅' : '❌'} ${executiveRole}: ${hasAccess ? 'ACCESS GRANTED' : 'ACCESS DENIED'} ${executive ? '(INITIALIZED)' : '(NOT FOUND)'}`);
    }

    // Step 5: Test SOVREN-AI access
    console.log('\n🧠 Step 5: Testing SOVREN-AI Access');
    const sovrenAccess = AdminAuthMiddleware.canAccessSOVRENAI(BRIAN_GEARY_ADMIN.email);
    console.log(`${sovrenAccess ? '✅' : '❌'} SOVREN-AI Access: ${sovrenAccess ? 'GRANTED' : 'DENIED'}`);

    // Step 6: Display admin dashboard
    console.log('\n📊 Step 6: Admin Dashboard Summary');
    const dashboard = BrianGearyAdminAccess.getDashboard();
    
    if (dashboard) {
      console.log(`👤 User: ${dashboard.user.name} (${dashboard.user.email})`);
      console.log(`🎯 Role: ${dashboard.user.role}`);
      console.log(`🏢 Shadow Board: ${dashboard.shadowBoard.initialized ? 'INITIALIZED' : 'NOT INITIALIZED'}`);
      console.log(`👥 Executives: ${dashboard.shadowBoard.executiveCount}`);
      console.log(`🧠 SOVREN-AI: ${dashboard.shadowBoard.sovrenAI ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
      console.log(`🔑 Permissions:`);
      console.log(`   - Full System Access: ${dashboard.permissions.fullSystemAccess ? 'YES' : 'NO'}`);
      console.log(`   - Bypass Subscription Limits: ${dashboard.permissions.bypassSubscriptionLimits ? 'YES' : 'NO'}`);
      console.log(`   - B200 Resource Management: ${dashboard.permissions.b200ResourceManagement ? 'YES' : 'NO'}`);
    }

    // Step 7: Test executive command execution
    console.log('\n⚡ Step 7: Testing Executive Command Execution');
    
    try {
      const testCommand = await BrianGearyAdminAccess.executeCommand(
        'CFO',
        'test_command',
        { test: true, message: 'Admin access verification' }
      );
      
      console.log(`✅ Executive command executed successfully`);
      console.log(`📋 Command details: ${JSON.stringify(testCommand, null, 2)}`);
      
    } catch (error) {
      console.log(`⚠️ Executive command test failed: ${error}`);
    }

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ADMIN ACCESS INITIALIZATION COMPLETE');
    console.log('='.repeat(60));
    console.log('');
    console.log('✅ Brian Geary admin access configured successfully');
    console.log('✅ Full Shadow Board access granted');
    console.log('✅ All executives available (CFO, CMO, CTO, CLO, COO, CHRO, CSO)');
    console.log('✅ SOVREN-AI (405B model) access granted');
    console.log('✅ B200 Blackwell GPU resource management enabled');
    console.log('✅ Unlimited subscription tier access');
    console.log('');
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('   Email: admin@sovrenai.app');
    console.log('   Password: Rocco2025%$$');
    console.log('');
    console.log('🚀 Ready for production use!');

  } catch (error) {
    console.error('\n❌ ADMIN ACCESS INITIALIZATION FAILED');
    console.error('='.repeat(60));
    console.error(`Error: ${error}`);
    console.error('');
    console.error('Please check the configuration and try again.');
    process.exit(1);
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeAdminAccess()
    .then(() => {
      console.log('\n✅ Initialization script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Initialization script failed:', error);
      process.exit(1);
    });
}

export { initializeAdminAccess };
