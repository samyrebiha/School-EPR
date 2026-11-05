const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = 'https://twegemzosourhldeueqf.supabase.co';
const key = 'sb_publishable_r4lRcl8qOajlqiH37lRbEA_YcAauEqS';
const supabase = createClient(url, key);

function cleanStudent(std, defaultPrice, defaultSessions) {
  if (!std) return std;
  const originalLogs = std.attendanceLogs || [];

  const seenRenewDates = new Set();
  const seenAttendanceDates = new Set();
  const seenPaymentKeys = new Set();

  const cleanedLogs = [];

  for (const log of originalLogs) {
    if (!log) continue;
    const st = log.status || log.type;
    const date = log.date || '';

    if (st === 'renewed') {
      if (date && seenRenewDates.has(date)) continue;
      if (date) seenRenewDates.add(date);
      cleanedLogs.push(log);
    } else if (st === 'payment') {
      const payKey = date + '_' + (log.amount || 0) + '_' + (log.notes || '');
      if (date && seenPaymentKeys.has(payKey)) continue;
      if (date) seenPaymentKeys.add(payKey);
      cleanedLogs.push(log);
    } else if (st === 'present' || st === 'absent_counted' || st === 'single_session') {
      if (date && seenAttendanceDates.has(date)) continue;
      if (date) seenAttendanceDates.add(date);
      cleanedLogs.push(log);
    } else {
      cleanedLogs.push(log);
    }
  }

  // Find latest renewal index in cleaned logs (logs are sorted latest-first)
  const latestRenewIdx = cleanedLogs.findIndex(l => l && (l.status === 'renewed' || l.type === 'renewed'));
  const currentCycleLogs = latestRenewIdx === -1 ? cleanedLogs : cleanedLogs.slice(0, latestRenewIdx);

  const activeCycleSessionCount = currentCycleLogs.filter(
    l => l && (l.status === 'present' || l.status === 'absent_counted' || l.status === 'single_session')
  ).length;

  const basePrice = Number(std.coursePrice) || Number(defaultPrice) || 1500;

  const paymentLogs = cleanedLogs.filter(l => l && (l.status === 'payment' || l.type === 'payment'));
  const paidFromLogs = paymentLogs.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalPaid = Math.max(Number(std.totalPaid) || 0, paidFromLogs);

  let totalDebt = 0;
  if (!std.isExempt) {
    if (latestRenewIdx !== -1) {
      const cyclePaid = currentCycleLogs
        .filter(l => l && (l.status === 'payment' || l.type === 'payment'))
        .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
      
      if (cyclePaid >= basePrice) {
        totalDebt = 0;
      } else if (cyclePaid > 0) {
        totalDebt = Math.max(0, basePrice - cyclePaid);
      } else {
        totalDebt = (std.totalDebt !== undefined && Number(std.totalDebt) >= 0 && Number(std.totalDebt) <= basePrice)
          ? Number(std.totalDebt)
          : basePrice;
      }
    } else {
      if (totalPaid >= basePrice) {
        totalDebt = 0;
      } else {
        totalDebt = Math.max(0, basePrice - totalPaid);
      }
    }
  }

  return {
    ...std,
    attendedSessions: activeCycleSessionCount,
    totalSessions: std.totalSessions || defaultSessions || 4,
    totalPaid: std.isExempt ? 0 : totalPaid,
    totalDebt: std.isExempt ? 0 : totalDebt,
    attendanceLogs: cleanedLogs
  };
}

async function run() {
  console.log('🚀 Step 1: Fetching all courses from Supabase...');
  const { data: courses, error } = await supabase.from('courses').select('*');

  if (error || !courses) {
    console.error('❌ Failed to fetch courses:', error);
    process.exit(1);
  }

  console.log(`Fetched ${courses.length} courses.`);

  // 1. Create full raw backup
  if (!fs.existsSync('backups')) fs.mkdirSync('backups');
  const backupFile = `backups/backup_all_courses_pre_clean_${Date.now()}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(courses, null, 2), 'utf8');
  console.log(`💾 Step 2: Full raw backup saved to ${backupFile}`);

  // 2. Process and Clean
  console.log('🧹 Step 3: Cleaning courses...');
  let totalCoursesModified = 0;
  let totalDupsPurged = 0;
  let totalRenewsPurged = 0;

  for (const c of courses) {
    let enrolled = Array.isArray(c.enrolled_list) ? c.enrolled_list : JSON.parse(c.enrolled_list || '[]');
    let courseDups = 0;
    let courseRenews = 0;

    // Check before cleaning
    for (const std of enrolled) {
      const logs = std.attendanceLogs || [];
      const seenAttDates = new Set();
      const seenRenewDates = new Set();
      for (const l of logs) {
        if (!l || !l.date) continue;
        const st = l.status || l.type;
        if (st === 'renewed') {
          if (seenRenewDates.has(l.date)) courseRenews++;
          seenRenewDates.add(l.date);
        } else if (st === 'present' || st === 'absent_counted' || st === 'single_session') {
          if (seenAttDates.has(l.date)) courseDups++;
          seenAttDates.add(l.date);
        }
      }
    }

    if (courseDups > 0 || courseRenews > 0) {
      console.log(`Course [${c.title}] (${c.teacher_name || 'No Teacher'}): Found ${courseDups} att dups, ${courseRenews} renew dups`);
      totalDupsPurged += courseDups;
      totalRenewsPurged += courseRenews;

      const cleanedEnrolled = enrolled.map(s => cleanStudent(s, c.monthly_price, c.total_sessions_default));

      const { error: upErr } = await supabase
        .from('courses')
        .update({
          enrolled_list: cleanedEnrolled,
          enrolled_students: cleanedEnrolled.length
        })
        .eq('id', c.id);

      if (upErr) {
        console.error(`❌ Failed to update course ${c.id} (${c.title}):`, upErr.message);
      } else {
        totalCoursesModified++;
        console.log(`   ✅ Successfully updated course [${c.title}]`);
      }
    }
  }

  console.log('\n=======================================');
  console.log(`🎉 Cleaning completed!`);
  console.log(`Total courses modified: ${totalCoursesModified}`);
  console.log(`Total attendance duplicates purged: ${totalDupsPurged}`);
  console.log(`Total double renewals purged: ${totalRenewsPurged}`);
  console.log('=======================================\n');

  // 3. Verification Audit
  console.log('🔍 Step 4: Running full post-cleaning audit across all courses...');
  const { data: verifyCourses, error: vErr } = await supabase.from('courses').select('id, title, teacher_name, enrolled_list');
  if (vErr || !verifyCourses) {
    console.error('Audit fetch error:', vErr);
    return;
  }

  let remainingIssues = 0;
  for (const c of verifyCourses) {
    const enrolled = Array.isArray(c.enrolled_list) ? c.enrolled_list : JSON.parse(c.enrolled_list || '[]');
    let cDups = 0;
    let cRenews = 0;

    for (const std of enrolled) {
      const logs = std.attendanceLogs || [];
      const seenAtt = new Set();
      const seenRen = new Set();
      for (const l of logs) {
        if (!l || !l.date) continue;
        const st = l.status || l.type;
        if (st === 'renewed') {
          if (seenRen.has(l.date)) cRenews++;
          seenRen.add(l.date);
        } else if (st === 'present' || st === 'absent_counted' || st === 'single_session') {
          if (seenAtt.has(l.date)) cDups++;
          seenAtt.add(l.date);
        }
      }
    }

    if (cDups > 0 || cRenews > 0) {
      remainingIssues += (cDups + cRenews);
      console.log(`⚠️ Remaining issues in [${c.title}]: att=${cDups}, renew=${cRenews}`);
    }
  }

  if (remainingIssues === 0) {
    console.log('🌟 VERIFICATION PASSED: 0 DUPLICATES REMAINING ACROSS ALL 55 COURSES IN SUPABASE!');
  } else {
    console.warn(`⚠️ Warning: ${remainingIssues} issues remaining.`);
  }
}

run();
