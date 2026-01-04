#!/usr/bin/env bun
/**
 * Load Test Script - Submit 100 Anonymous Reports
 * Usage: bun load-test.ts
 */

const ANONYMIZER_URL = process.env.ANONYMIZER_URL || 'http://localhost:3002';
const NUM_REPORTS = 100;
const CONCURRENT_REQUESTS = 10;

// Sample data for generating reports
const categories = ['corruption', 'violence', 'fraud', 'environmental', 'labor-violation'];
const locations = [
  'Jl. Sudirman No. 123, Jakarta',
  'Jl. Malioboro, Yogyakarta',
  'Jl. Braga, Bandung',
  'Jl. Thamrin, Jakarta Pusat',
  'Jl. Gajah Mada, Semarang',
];

const sampleReports = [
  {
    content: 'Korupsi dana desa oleh Kepala desa bernama Budi Santoso (NIK: 3201234567890123) menggelapkan dana sebesar Rp 500 juta. Kontak: 081234567890. Email: budi.santoso@example.com, Rekening: 1234567890',
    category: 'corruption',
  },
  {
    content: 'Illegal dumping oleh Perusahaan PT XYZ membuang limbah di sungai. Contact person: John Doe, phone: +6281298765432. Lokasi: Jl. Industri No. 45, Tangerang',
    category: 'environmental',
  },
  {
    content: 'Kekerasan domestik - Tetangga saya dengan NIK 3302112233445566 sering melakukan KDRT. Alamat: Jl. Mawar Gg. 3 Rt.05 Rw.02',
    category: 'violence',
  },
];

interface TestResult {
  success: number;
  failed: number;
  totalTime: number;
  avgResponseTime: number;
  piiDetected: number;
}

async function submitReport(index: number): Promise<{ success: boolean; time: number; pii: number }> {
  const startTime = Date.now();
  
  try {
    const sample = sampleReports[index % sampleReports.length];
    const reportText = `${sample.content} [Report #${index}] at ${locations[Math.floor(Math.random() * locations.length)]}`;

    const response = await fetch(`${ANONYMIZER_URL}/scrub`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: reportText }),
    });

    const data = await response.json();
    const endTime = Date.now();

    if (!response.ok) {
      console.error(`❌ Report ${index} failed:`, data.error);
      return { success: false, time: endTime - startTime, pii: 0 };
    }

    const piiCount = data.pii_detected ?? 0;
    console.log(`✅ Request ${index}: scrubbed ${piiCount} PII in ${endTime - startTime}ms`);
    
    return { success: true, time: endTime - startTime, pii: piiCount };
  } catch (error) {
    const endTime = Date.now();
    console.error(`❌ Report ${index} error:`, error);
    return { success: false, time: endTime - startTime, pii: 0 };
  }
}

async function runLoadTest(): Promise<TestResult> {
  console.log(`🚀 Starting load test: ${NUM_REPORTS} reports with ${CONCURRENT_REQUESTS} concurrent requests`);
  console.log(`📍 Target: ${ANONYMIZER_URL}\n`);

  const startTime = Date.now();
  const results: Awaited<ReturnType<typeof submitReport>>[] = [];

  // Process in batches for concurrency control
  for (let i = 0; i < NUM_REPORTS; i += CONCURRENT_REQUESTS) {
    const batch = [];
    for (let j = 0; j < CONCURRENT_REQUESTS && i + j < NUM_REPORTS; j++) {
      batch.push(submitReport(i + j));
    }
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
  const totalPII = results.reduce((sum, r) => sum + r.pii, 0);

  return {
    success: successCount,
    failed: failedCount,
    totalTime,
    avgResponseTime,
    piiDetected: totalPII,
  };
}

// Run the test
console.log('═══════════════════════════════════════════════════');
console.log('  JagaWarga Load Test - Anonymous Report Submission');
console.log('═══════════════════════════════════════════════════\n');

const result = await runLoadTest();

console.log('\n═══════════════════════════════════════════════════');
console.log('  Test Results');
console.log('═══════════════════════════════════════════════════');
console.log(`✅ Successful: ${result.success}/${NUM_REPORTS}`);
console.log(`❌ Failed: ${result.failed}/${NUM_REPORTS}`);
console.log(`⏱️  Total time: ${result.totalTime}ms (${(result.totalTime / 1000).toFixed(2)}s)`);
console.log(`📊 Avg response time: ${result.avgResponseTime.toFixed(2)}ms`);
console.log(`🧹 Total PII detected: ${result.piiDetected}`);
console.log(`📈 Throughput: ${((NUM_REPORTS / result.totalTime) * 1000).toFixed(2)} req/s`);
console.log('═══════════════════════════════════════════════════\n');

// Exit with error code if there were failures
process.exit(result.failed > 0 ? 1 : 0);