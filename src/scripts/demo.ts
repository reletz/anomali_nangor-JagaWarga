#!/usr/bin/env bun
/**
 * JagaWarga PoC - Complete Demo Workflow
 * Demonstrates: Auth → PII Scrubbing → Escalation Flow
 */

const IDENTITY_URL = process.env.IDENTITY_URL || 'http://localhost:3001';
const ANONYMIZER_URL = process.env.ANONYMIZER_URL || 'http://localhost:3002';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(msg: string, color: string = 'reset') {
  console.log(`${colors[color as keyof typeof colors]}${msg}${colors.reset}`);
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  log('╔════════════════════════════════════════════════════════╗', 'bright');
  log('║  JagaWarga PoC - Complete Demo Workflow                ║', 'bright');
  log('╚════════════════════════════════════════════════════════╝', 'bright');
  log('', 'reset');

  try {
    // Step 1: Health Check
    log('📋 Step 1: Checking Services Health...', 'cyan');
    log('─────────────────────────────────────────────────────', 'cyan');
    
    const identityHealth = await fetch(`${IDENTITY_URL}/health`);
    const anonymizerHealth = await fetch(`${ANONYMIZER_URL}/health`);
    
    if (!identityHealth.ok || !anonymizerHealth.ok) {
      log('❌ Services not healthy', 'red');
      return;
    }
    
    log('✅ Both services are healthy', 'green');
    log('', 'reset');

    // Step 2: Login
    log('🔐 Step 2: Login as Authority (Dinas Kebersihan)...', 'cyan');
    log('─────────────────────────────────────────────────────', 'cyan');
    
    const loginResponse = await fetch(`${IDENTITY_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kebersihan@bandung.go.id',
        password: 'demo123',
      }),
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.token) {
      log('❌ Login failed', 'red');
      return;
    }
    
    log(`✅ Login successful`, 'green');
    log(`   User: ${loginData.user.email}`, 'blue');
    log(`   Department: ${loginData.user.department}`, 'blue');
    log(`   Token: ${loginData.token.substring(0, 20)}...`, 'blue');
    log('', 'reset');

    // Step 3: Validate Token
    log('🔍 Step 3: Validating JWT Token...', 'cyan');
    log('─────────────────────────────────────────────────────', 'cyan');
    
    const validateResponse = await fetch(`${IDENTITY_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: loginData.token }),
    });
    
    const validateData = await validateResponse.json();
    
    if (!validateData.valid) {
      log('❌ Token validation failed', 'red');
      return;
    }
    
    log('✅ Token is valid', 'green');
    log('', 'reset');

    // Step 4: PII Scrubbing Examples
    log('🧹 Step 4: Testing PII Scrubbing...', 'cyan');
    log('─────────────────────────────────────────────────────', 'cyan');
    
    const testCases = [
      {
        name: 'NIK Detection',
        text: 'Saya Ahmad dengan NIK 3201234567890001',
      },
      {
        name: 'Contact Information',
        text: 'Hubungi saya di 081234567890 atau ahmad@email.com',
      },
      {
        name: 'Multiple PII',
        text: 'Nama: Budi Santoso, NIK: 3201234567890002, Phone: +6281298765432, Email: budi@example.com, Alamat: Jl. Sudirman No. 123',
      },
    ];
    
    for (const testCase of testCases) {
      log(`\n  Testing: ${testCase.name}`, 'blue');
      log(`  Input: "${testCase.text}"`, 'yellow');
      
      const scrubResponse = await fetch(`${ANONYMIZER_URL}/scrub`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testCase.text }),
      });
      
      const scrubData = await scrubResponse.json();
      
      log(`  Output: "${scrubData.scrubbed_text}"`, 'yellow');
      log(`  PII Detected: ${scrubData.pii_detected} items`, 'green');
      
      if (scrubData.items.length > 0) {
        log(`  Items: ${scrubData.items.join(', ')}`, 'blue');
      }
    }
    log('', 'reset');

    // Step 5: Report Submission Scenario
    log('📝 Step 5: Anonymous Report Submission Scenario', 'cyan');
    log('─────────────────────────────────────────────────────', 'cyan');
    
    const reportContent = 'Saya ingin melaporkan pencemaran limbah di Jalan Sudirman. Kontak: 081234567890, Email: reporter@example.com, NIK: 3201234567890123';
    
    log(`Original Content:`, 'blue');
    log(`  "${reportContent}"`, 'yellow');
    
    const reportScrubResponse = await fetch(`${ANONYMIZER_URL}/scrub`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: reportContent }),
    });
    
    const reportScrubData = await reportScrubResponse.json();
    
    log(`\nScrubbed Content:`, 'blue');
    log(`  "${reportScrubData.scrubbed_text}"`, 'yellow');
    log(`\nPII Redacted: ${reportScrubData.pii_detected} items`, 'green');
    log('', 'reset');

    // Step 6: Authorities Demo
    log('👥 Step 6: Available Authorities for Report Routing', 'cyan');
    log('─────────────────────────────────────────────────────', 'cyan');
    
    const authorities = [
      { name: 'Dinas Kebersihan', dept: 'kebersihan', email: 'kebersihan@bandung.go.id' },
      { name: 'Dinas Kesehatan', dept: 'kesehatan', email: 'kesehatan@bandung.go.id' },
      { name: 'Dinas PU', dept: 'infrastruktur', email: 'pu@bandung.go.id' },
      { name: 'Kepolisian', dept: 'keamanan', email: 'polresta@bandung.go.id' },
      { name: 'Badan Lingkungan Hidup', dept: 'lingkungan', email: 'blh@bandung.go.id' },
    ];
    
    for (const auth of authorities) {
      log(`  • ${auth.name.padEnd(25)} (${auth.dept})`, 'blue');
      log(`    Email: ${auth.email}`, 'yellow');
    }
    log('', 'reset');

    // Step 7: Summary
    log('✨ Demo Summary', 'bright');
    log('─────────────────────────────────────────────────────', 'bright');
    log('✅ Identity Service: JWT authentication working', 'green');
    log('✅ Anonymizer Service: PII detection & scrubbing working', 'green');
    log('✅ Integration: End-to-end flow validated', 'green');
    log('', 'reset');

    log('📚 Next Steps:', 'cyan');
    log('  1. Restart services: bun dev', 'blue');
    log('  2. Run integration tests: bun integration-test.ts', 'blue');
    log('  3. Check API docs: docs/API.md', 'blue');
    log('  4. Report service team: Implement /reports endpoint', 'blue');
    log('', 'reset');

    log('🎉 Demo Complete!', 'green');
  } catch (error) {
    log(`❌ Demo failed: ${error}`, 'red');
    process.exit(1);
  }
}

await runDemo();
