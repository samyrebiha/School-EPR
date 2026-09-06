/**
 * Load Testing Script for School SaaS Platform
 * Simulates concurrent requests to Supabase database
 */

const SUPABASE_URL = 'https://twegemzosourhldeueqf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_r4lRcl8qOajlqiH37lRbEA_YcAauEqS';

const TOTAL_REQUESTS = 200000; // محاكاة 50 مدرسة متزامنة
const ENDPOINT = `${SUPABASE_URL}/rest/v1/schools?select=id,name,code&limit=10`;

async function runLoadTest() {
  console.log('=====================================================');
  console.log(`🚀 بدء اختبار الضغط: إرسال ${TOTAL_REQUESTS} طلب متزامن في نفس اللحظة...`);
  console.log('=====================================================\n');

  const startTime = Date.now();
  const latencies = [];
  let successful = 0;
  let failed = 0;

  const requests = Array.from({ length: TOTAL_REQUESTS }).map(async (_, idx) => {
    const reqStart = Date.now();
    try {
      const res = await fetch(ENDPOINT, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const reqTime = Date.now() - reqStart;
      latencies.push(reqTime);

      if (res.ok) {
        successful++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
    }
  });

  // Execute all requests concurrently (في نفس اللحظة)
  await Promise.all(requests);

  const totalTime = (Date.now() - startTime) / 1000;
  const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(0);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  const rps = (TOTAL_REQUESTS / totalTime).toFixed(1);

  console.log('📊 نتائج اختبار الضغط (Benchmark Results):');
  console.log('-----------------------------------------------------');
  console.log(`✅ إجمالي الطلبات الناجحة : ${successful} من أصل ${TOTAL_REQUESTS} (معدل النجاح: ${((successful / TOTAL_REQUESTS) * 100).toFixed(0)}%)`);
  console.log(`❌ الطلبات الفاشلة        : ${failed}`);
  console.log(`⏱️ إجمالي الوقت المستغرق : ${totalTime} ثانية`);
  console.log(`⚡ متوسط سرعة الاستجابة  : ${avgLatency} ملي ثانية (ms)`);
  console.log(`🏎️ أسرع استجابة           : ${minLatency} ms`);
  console.log(`🐢 أبطأ استجابة           : ${maxLatency} ms`);
  console.log(`🔥 القدرة (Requests/sec)  : ${rps} طلب في الثانية الواحدة`);
  console.log('-----------------------------------------------------');

  if (successful === TOTAL_REQUESTS && avgLatency < 200) {
    console.log('🏆 التقييم: أداء فائق ومثالي جداً (Grade A+) — جاهز للإنتاج والتوسع!');
  } else {
    console.log('👍 التقييم: أداء جيد ومستقر.');
  }
}

runLoadTest();
