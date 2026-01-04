#!/usr/bin/env bun
/**
 * Integration Test - End-to-End Flow
 * Tests: PII scrubbing, report submission, NATS events
 */

const IDENTITY_URL = process.env.IDENTITY_URL || 'http://localhost:3001';
const ANONYMIZER_URL = process.env.ANONYMIZER_URL || 'http://localhost:3002';

interface TestCase {
  name: string;
  input: string;
  expectedPII: number;
}

const testCases: TestCase[] = [
  {
    name: 'NIK Detection',
    input: 'Saya ingin melaporkan korupsi oleh seseorang dengan NIK 3201234567890123',
    expectedPII: 1,
  },
  {
    name: 'Phone + Email',
    input: 'Hubungi saya di 081234567890 atau email test@example.com',
    expectedPII: 2,
  },
  {
    name: 'Multiple PII',
    input: 'NIK: 3201234567890123, Phone: +6281234567890, Email: john.doe@test.com, Alamat: Jl. Sudirman No. 123',
    expectedPII: 4,
  },
];

async function testHealthChecks() {
  console.log('\n🏥 Testing Health Checks...');
  
  try {
    const [identityHealth, anonymizerHealth] = await Promise.all([
      fetch(`${IDENTITY_URL}/health`),
      fetch(`${ANONYMIZER_URL}/health`),
    ]);

    const [identityData, anonymizerData] = await Promise.all([
      identityHealth.json(),
      anonymizerHealth.json(),
    ]);

    console.log('  Identity:', identityData.status === 'healthy' ? '✅' : '❌', identityData.status);
    console.log('  Anonymizer:', anonymizerData.status === 'healthy' ? '✅' : '❌', anonymizerData.status);

    return identityData.status === 'healthy' && anonymizerData.status === 'healthy';
  } catch (error) {
    console.error('  ❌ Health check failed:', error);
    return false;
  }
}

async function testPIIScrubbing() {
  console.log('\n🧹 Testing PII Scrubbing...');
  
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      const response = await fetch(`${ANONYMIZER_URL}/scrub`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testCase.input }),
      });

      const data = await response.json();
      
      if (data.pii_detected >= testCase.expectedPII) {
        console.log(`  ✅ ${testCase.name}: ${data.pii_detected} PII detected`);
        passed++;
      } else {
        console.log(`  ❌ ${testCase.name}: Expected ${testCase.expectedPII}, got ${data.pii_detected}`);
        failed++;
      }
    } catch (error) {
      console.error(`  ❌ ${testCase.name}: Error -`, error);
      failed++;
    }
  }

  console.log(`\n  Result: ${passed}/${testCases.length} passed`);
  return failed === 0;
}

async function testReportSubmission() {
  console.log('\n📝 Testing Report Submission...');

  try {
    const report = {
      content: 'Test report with PII: Contact 081234567890, Email test@example.com, NIK 3201234567890123',
      category: 'corruption',
      location: 'Jl. Test No. 123',
    };

    const response = await fetch(`http://localhost:4000/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });

    const data = await response.json();

    if (data.success && data.report.id) {
      console.log(`  ✅ Report created: ${data.report.id}`);
      console.log(`  🧹 PII scrubbed: ${data.scrubbing.pii_detected} items`);
      return true;
    } else {
      console.log('  ❌ Report creation failed:', data);
      return false;
    }
  } catch (error) {
    console.error('  ❌ Error:', error);
    return false;
  }
}

// Run all tests
console.log('═══════════════════════════════════════════════════');
console.log('  JagaWarga Integration Tests');
console.log('═══════════════════════════════════════════════════');

const healthOk = await testHealthChecks();
if (!healthOk) {
  console.log('\n❌ Services not healthy. Please start the services first.');
  process.exit(1);
}

const scrubOk = await testPIIScrubbing();
const reportOk = await testReportSubmission();

console.log('\n═══════════════════════════════════════════════════');
console.log('  Summary');
console.log('═══════════════════════════════════════════════════');
console.log('  Health Checks:', healthOk ? '✅' : '❌');
console.log('  PII Scrubbing:', scrubOk ? '✅' : '❌');
console.log('  Report Submission:', reportOk ? '✅' : '❌');
console.log('═══════════════════════════════════════════════════\n');

process.exit(healthOk && scrubOk && reportOk ? 0 : 1);