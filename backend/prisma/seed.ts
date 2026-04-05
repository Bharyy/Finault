import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

async function main() {
  console.log('Cleaning existing data...');
  await prisma.anomaly.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.smsLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding database with realistic startup scenario...\n');

  // ─── USERS ──────────────────────────────────────────────
  const pw = async (p: string) => bcrypt.hash(p, 12);

  const admin = await prisma.user.create({
    data: {
      email: 'rahul@finault.com',
      passwordHash: await pw('Admin@123'),
      name: 'Rahul Sharma',
      role: 'ADMIN',
      isActive: true,
    },
  });

  const analyst = await prisma.user.create({
    data: {
      email: 'priya@finault.com',
      passwordHash: await pw('Analyst@123'),
      name: 'Priya Menon',
      role: 'ANALYST',
      isActive: true,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'arjun@finault.com',
      passwordHash: await pw('Viewer@123'),
      name: 'Arjun Patel',
      role: 'VIEWER',
      isActive: true,
    },
  });

  // An inactive user to demo status management
  await prisma.user.create({
    data: {
      email: 'neha@finault.com',
      passwordHash: await pw('Inactive@123'),
      name: 'Neha Gupta',
      role: 'ANALYST',
      isActive: false,
    },
  });

  console.log('  Users created:');
  console.log('    Admin:    rahul@finault.com   / Admin@123');
  console.log('    Analyst:  priya@finault.com   / Analyst@123');
  console.log('    Viewer:   arjun@finault.com   / Viewer@123');
  console.log('    Inactive: neha@finault.com    / Inactive@123\n');

  // ─── TRANSACTIONS ───────────────────────────────────────
  // Scenario: A small tech startup over the last 4 months
  // Normal patterns establish a baseline, then anomalies break it

  const txns: Array<{
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    category: string;
    date: Date;
    notes: string;
    userId: string;
  }> = [];

  // ── MONTH 4 (oldest, ~90-120 days ago): Establishing baseline ──

  // Regular salary income - founder pays himself
  txns.push({ amount: 75000, type: 'INCOME', category: 'Salary', date: daysAgo(120), notes: 'January salary - Rahul', userId: admin.id });
  txns.push({ amount: 45000, type: 'INCOME', category: 'Salary', date: daysAgo(120), notes: 'January salary - Priya', userId: admin.id });
  txns.push({ amount: 35000, type: 'INCOME', category: 'Salary', date: daysAgo(120), notes: 'January salary - Arjun', userId: admin.id });

  // Client payments
  txns.push({ amount: 150000, type: 'INCOME', category: 'Freelance', date: daysAgo(115), notes: 'Client: TechNova - Website redesign milestone 1', userId: admin.id });
  txns.push({ amount: 80000, type: 'INCOME', category: 'Freelance', date: daysAgo(105), notes: 'Client: GreenLeaf - Dashboard MVP payment', userId: admin.id });

  // Normal operating expenses
  txns.push({ amount: 25000, type: 'EXPENSE', category: 'Rent & Housing', date: daysAgo(118), notes: 'Office rent - January', userId: admin.id });
  txns.push({ amount: 4500, type: 'EXPENSE', category: 'Utilities', date: daysAgo(116), notes: 'Electricity + internet bill - January', userId: admin.id });
  txns.push({ amount: 12000, type: 'EXPENSE', category: 'Subscriptions', date: daysAgo(114), notes: 'AWS hosting + GitHub + Figma licenses', userId: admin.id });
  txns.push({ amount: 850, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(113), notes: 'Team lunch - client meeting', userId: admin.id });
  txns.push({ amount: 620, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(110), notes: 'Team lunch - sprint review', userId: admin.id });
  txns.push({ amount: 750, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(107), notes: 'Team dinner - project celebration', userId: admin.id });
  txns.push({ amount: 2200, type: 'EXPENSE', category: 'Transport', date: daysAgo(112), notes: 'Cab to client office + fuel', userId: admin.id });
  txns.push({ amount: 3500, type: 'EXPENSE', category: 'Office Supplies', date: daysAgo(108), notes: 'Printer cartridges and paper', userId: admin.id });
  txns.push({ amount: 1500, type: 'EXPENSE', category: 'Entertainment', date: daysAgo(100), notes: 'Team outing - bowling', userId: admin.id });

  // ── MONTH 3 (~60-90 days ago): Steady growth ──

  txns.push({ amount: 75000, type: 'INCOME', category: 'Salary', date: daysAgo(90), notes: 'February salary - Rahul', userId: admin.id });
  txns.push({ amount: 45000, type: 'INCOME', category: 'Salary', date: daysAgo(90), notes: 'February salary - Priya', userId: admin.id });
  txns.push({ amount: 35000, type: 'INCOME', category: 'Salary', date: daysAgo(90), notes: 'February salary - Arjun', userId: admin.id });

  txns.push({ amount: 150000, type: 'INCOME', category: 'Freelance', date: daysAgo(85), notes: 'Client: TechNova - Website redesign milestone 2', userId: admin.id });
  txns.push({ amount: 60000, type: 'INCOME', category: 'Freelance', date: daysAgo(78), notes: 'Client: UrbanFit - Mobile app UI consultation', userId: admin.id });
  txns.push({ amount: 25000, type: 'INCOME', category: 'Investment', date: daysAgo(75), notes: 'FD interest payout - Q4', userId: admin.id });

  txns.push({ amount: 25000, type: 'EXPENSE', category: 'Rent & Housing', date: daysAgo(88), notes: 'Office rent - February', userId: admin.id });
  txns.push({ amount: 4800, type: 'EXPENSE', category: 'Utilities', date: daysAgo(86), notes: 'Electricity + internet bill - February', userId: admin.id });
  txns.push({ amount: 12000, type: 'EXPENSE', category: 'Subscriptions', date: daysAgo(84), notes: 'AWS hosting + GitHub + Figma licenses', userId: admin.id });
  txns.push({ amount: 900, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(82), notes: 'Team lunch - sprint planning', userId: admin.id });
  txns.push({ amount: 780, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(76), notes: 'Team lunch - Friday', userId: admin.id });
  txns.push({ amount: 680, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(70), notes: 'Client meeting lunch - UrbanFit', userId: admin.id });
  txns.push({ amount: 1800, type: 'EXPENSE', category: 'Transport', date: daysAgo(80), notes: 'Monthly cab + metro pass', userId: admin.id });
  txns.push({ amount: 8500, type: 'EXPENSE', category: 'Healthcare', date: daysAgo(73), notes: 'Team health insurance premium - Feb', userId: admin.id });
  txns.push({ amount: 2800, type: 'EXPENSE', category: 'Office Supplies', date: daysAgo(68), notes: 'Keyboard + mouse for new desk', userId: admin.id });

  // ── MONTH 2 (~30-60 days ago): Things are picking up ──

  txns.push({ amount: 75000, type: 'INCOME', category: 'Salary', date: daysAgo(60), notes: 'March salary - Rahul', userId: admin.id });
  txns.push({ amount: 45000, type: 'INCOME', category: 'Salary', date: daysAgo(60), notes: 'March salary - Priya', userId: admin.id });
  txns.push({ amount: 35000, type: 'INCOME', category: 'Salary', date: daysAgo(60), notes: 'March salary - Arjun', userId: admin.id });

  txns.push({ amount: 200000, type: 'INCOME', category: 'Freelance', date: daysAgo(55), notes: 'Client: TechNova - Final delivery payment', userId: admin.id });
  txns.push({ amount: 120000, type: 'INCOME', category: 'Freelance', date: daysAgo(48), notes: 'Client: MediCare - Backend API project', userId: admin.id });

  txns.push({ amount: 25000, type: 'EXPENSE', category: 'Rent & Housing', date: daysAgo(58), notes: 'Office rent - March', userId: admin.id });
  txns.push({ amount: 5100, type: 'EXPENSE', category: 'Utilities', date: daysAgo(56), notes: 'Electricity + internet bill - March', userId: admin.id });
  txns.push({ amount: 12000, type: 'EXPENSE', category: 'Subscriptions', date: daysAgo(54), notes: 'AWS hosting + GitHub + Figma licenses', userId: admin.id });
  txns.push({ amount: 15000, type: 'EXPENSE', category: 'Education', date: daysAgo(52), notes: 'Team Udemy course bundle - React & Node advanced', userId: admin.id });
  txns.push({ amount: 920, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(50), notes: 'Team lunch - sprint review', userId: admin.id });
  txns.push({ amount: 710, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(45), notes: 'Team lunch - Wednesday', userId: admin.id });
  txns.push({ amount: 840, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(40), notes: 'Client meeting lunch', userId: admin.id });
  txns.push({ amount: 2100, type: 'EXPENSE', category: 'Transport', date: daysAgo(49), notes: 'Cab to client + monthly metro', userId: admin.id });
  txns.push({ amount: 3200, type: 'EXPENSE', category: 'Office Supplies', date: daysAgo(42), notes: 'Monitor stand + cables', userId: admin.id });

  // ── MONTH 1 (last 30 days): CURRENT MONTH - with ANOMALIES ──

  // Salaries paid on 1st of month
  txns.push({ amount: 75000, type: 'INCOME', category: 'Salary', date: daysAgo(4), notes: 'April salary - Rahul', userId: admin.id });
  txns.push({ amount: 45000, type: 'INCOME', category: 'Salary', date: daysAgo(4), notes: 'April salary - Priya', userId: admin.id });
  txns.push({ amount: 35000, type: 'INCOME', category: 'Salary', date: daysAgo(4), notes: 'April salary - Arjun', userId: admin.id });

  // Normal client payment
  txns.push({ amount: 175000, type: 'INCOME', category: 'Freelance', date: daysAgo(25), notes: 'Client: MediCare - Phase 2 payment', userId: admin.id });

  // ╔══════════════════════════════════════════════════════════╗
  // ║  ANOMALY TRIGGER 1: Category Spike                      ║
  // ║  Food & Dining avg is ~750-900, this is 8,500 (10x)     ║
  // ╚══════════════════════════════════════════════════════════╝
  txns.push({ amount: 8500, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(20), notes: 'Company anniversary dinner - 15 people at Taj', userId: admin.id });

  // ╔══════════════════════════════════════════════════════════╗
  // ║  ANOMALY TRIGGER 2: Category Spike                      ║
  // ║  Transport avg is ~2000, this is 45,000 (22x)           ║
  // ╚══════════════════════════════════════════════════════════╝
  txns.push({ amount: 45000, type: 'EXPENSE', category: 'Transport', date: daysAgo(15), notes: 'International flight - Bangalore to Dubai for conference', userId: admin.id });

  // ╔══════════════════════════════════════════════════════════╗
  // ║  ANOMALY TRIGGER 3: Category Spike (Income)             ║
  // ║  Freelance avg is ~120k-150k, this is 500k              ║
  // ╚══════════════════════════════════════════════════════════╝
  txns.push({ amount: 500000, type: 'INCOME', category: 'Freelance', date: daysAgo(10), notes: 'Client: GlobalBank - Enterprise dashboard contract signed', userId: admin.id });

  // Normal expenses continue
  txns.push({ amount: 25000, type: 'EXPENSE', category: 'Rent & Housing', date: daysAgo(28), notes: 'Office rent - April', userId: admin.id });
  txns.push({ amount: 5200, type: 'EXPENSE', category: 'Utilities', date: daysAgo(26), notes: 'Electricity + internet bill - April', userId: admin.id });
  txns.push({ amount: 12000, type: 'EXPENSE', category: 'Subscriptions', date: daysAgo(24), notes: 'AWS hosting + GitHub + Figma licenses', userId: admin.id });
  txns.push({ amount: 850, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(18), notes: 'Team lunch - Wednesday', userId: admin.id });
  txns.push({ amount: 920, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(12), notes: 'Team lunch - sprint review', userId: admin.id });
  txns.push({ amount: 2500, type: 'EXPENSE', category: 'Transport', date: daysAgo(22), notes: 'Cab + metro recharge', userId: admin.id });

  // ╔══════════════════════════════════════════════════════════╗
  // ║  ANOMALY TRIGGER 4: Unusual expense in new category     ║
  // ║  No prior 'Travel' expenses, suddenly 85,000            ║
  // ╚══════════════════════════════════════════════════════════╝
  txns.push({ amount: 85000, type: 'EXPENSE', category: 'Travel', date: daysAgo(8), notes: 'Dubai conference - hotel + registration + meals (3 days)', userId: admin.id });

  // ╔══════════════════════════════════════════════════════════╗
  // ║  ANOMALY TRIGGER 5: Large equipment purchase            ║
  // ║  Office Supplies avg is ~3000, this is 65,000           ║
  // ╚══════════════════════════════════════════════════════════╝
  txns.push({ amount: 65000, type: 'EXPENSE', category: 'Office Supplies', date: daysAgo(5), notes: 'MacBook Air M3 for new developer hire', userId: admin.id });

  // Recent small transactions for "recent activity" on dashboard
  txns.push({ amount: 350, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(3), notes: 'Coffee meeting - potential client', userId: admin.id });
  txns.push({ amount: 1200, type: 'EXPENSE', category: 'Groceries', date: daysAgo(2), notes: 'Office pantry restock - snacks and beverages', userId: admin.id });
  txns.push({ amount: 4500, type: 'EXPENSE', category: 'Insurance', date: daysAgo(2), notes: 'Office liability insurance - monthly', userId: admin.id });
  txns.push({ amount: 30000, type: 'INCOME', category: 'Freelance', date: daysAgo(1), notes: 'Client: StartupXYZ - Logo and branding quick project', userId: admin.id });

  // ── Analyst's own transactions (Priya - spanning 4 months) ──
  // Month 4
  txns.push({ amount: 45000, type: 'INCOME', category: 'Salary', date: daysAgo(118), notes: 'January salary', userId: analyst.id });
  txns.push({ amount: 1200, type: 'EXPENSE', category: 'Education', date: daysAgo(110), notes: 'SQL masterclass course', userId: analyst.id });
  // Month 3
  txns.push({ amount: 45000, type: 'INCOME', category: 'Salary', date: daysAgo(88), notes: 'February salary', userId: analyst.id });
  txns.push({ amount: 800, type: 'EXPENSE', category: 'Subscriptions', date: daysAgo(82), notes: 'Personal Tableau license', userId: analyst.id });
  txns.push({ amount: 650, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(75), notes: 'Lunch with data team', userId: analyst.id });
  // Month 2
  txns.push({ amount: 45000, type: 'INCOME', category: 'Salary', date: daysAgo(58), notes: 'March salary', userId: analyst.id });
  txns.push({ amount: 1500, type: 'EXPENSE', category: 'Education', date: daysAgo(50), notes: 'Python data analysis course', userId: analyst.id });
  txns.push({ amount: 800, type: 'EXPENSE', category: 'Subscriptions', date: daysAgo(45), notes: 'Tableau license renewal', userId: analyst.id });
  // Current month (within last 5 days so it shows on dashboard)
  txns.push({ amount: 45000, type: 'INCOME', category: 'Salary', date: daysAgo(4), notes: 'April salary', userId: analyst.id });
  txns.push({ amount: 2500, type: 'EXPENSE', category: 'Transport', date: daysAgo(3), notes: 'Cab to client site for data audit', userId: analyst.id });
  txns.push({ amount: 720, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(2), notes: 'Working lunch - report deadline', userId: analyst.id });
  txns.push({ amount: 800, type: 'EXPENSE', category: 'Subscriptions', date: daysAgo(1), notes: 'Tableau license - April', userId: analyst.id });

  // ── Viewer's own transactions (Arjun - spanning 4 months) ──
  // Month 4
  txns.push({ amount: 35000, type: 'INCOME', category: 'Salary', date: daysAgo(118), notes: 'January salary', userId: viewer.id });
  txns.push({ amount: 450, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(112), notes: 'Team lunch', userId: viewer.id });
  // Month 3
  txns.push({ amount: 35000, type: 'INCOME', category: 'Salary', date: daysAgo(88), notes: 'February salary', userId: viewer.id });
  txns.push({ amount: 1800, type: 'EXPENSE', category: 'Transport', date: daysAgo(80), notes: 'Monthly metro pass', userId: viewer.id });
  // Month 2
  txns.push({ amount: 35000, type: 'INCOME', category: 'Salary', date: daysAgo(58), notes: 'March salary', userId: viewer.id });
  txns.push({ amount: 500, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(48), notes: 'Lunch with vendor', userId: viewer.id });
  // Current month
  txns.push({ amount: 35000, type: 'INCOME', category: 'Salary', date: daysAgo(4), notes: 'April salary', userId: viewer.id });
  txns.push({ amount: 380, type: 'EXPENSE', category: 'Food & Dining', date: daysAgo(2), notes: 'Coffee with client', userId: viewer.id });
  txns.push({ amount: 1500, type: 'EXPENSE', category: 'Transport', date: daysAgo(1), notes: 'Cab to office + metro recharge', userId: viewer.id });

  // Create all transactions
  const created = await prisma.transaction.createMany({ data: txns });
  console.log(`  Created ${created.count} transactions across 4 months\n`);

  // ── Run anomaly detection on all transactions ──
  console.log('  Running anomaly detection...');
  const { anomalyService } = await import('../src/modules/anomaly/anomaly.service');
  const allTxns = await prisma.transaction.findMany({ where: { deletedAt: null } });

  let anomalyCount = 0;
  for (const txn of allTxns) {
    const results = await anomalyService.analyzeTransaction(txn.id);
    if (results.length > 0) {
      anomalyCount += results.length;
      console.log(`    Anomaly: ${results.map(r => r.message).join(', ')}`);
    }
  }
  console.log(`  Detected ${anomalyCount} anomalies\n`);

  // ── Create sample SMS log (to show SMS feature) ──
  await prisma.smsLog.create({
    data: {
      rawMessage: 'Rs.2,500.00 debited from A/c XX4521 on 02-Apr-26 to UPI/Swiggy. Avl Bal: Rs.45,230.50',
      sender: 'HDFCBK',
      parseStatus: 'SUCCESS',
      parsedData: {
        amount: 2500, type: 'EXPENSE', merchant: 'Swiggy',
        category: 'Food & Dining', date: daysAgo(3).toISOString(),
        referenceId: null, balance: 45230.50,
      },
    },
  });

  await prisma.smsLog.create({
    data: {
      rawMessage: 'INR 1,50,000.00 credited to A/c XX4521 on 01-Apr-26. UPI Ref: 412356789012. Avl Bal: INR 1,95,230.50',
      sender: 'SBIBNK',
      parseStatus: 'SUCCESS',
      parsedData: {
        amount: 150000, type: 'INCOME', merchant: null,
        category: 'Uncategorized', date: daysAgo(4).toISOString(),
        referenceId: '412356789012', balance: 195230.50,
      },
    },
  });

  console.log('  Created 2 sample SMS logs\n');

  // ── Summary ──
  console.log('═══════════════════════════════════════════');
  console.log(' SEED COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log(' Login credentials:');
  console.log('   Admin:    rahul@finault.com  / Admin@123');
  console.log('   Analyst:  priya@finault.com  / Analyst@123');
  console.log('   Viewer:   arjun@finault.com  / Viewer@123');
  console.log('   Inactive: neha@finault.com   / Inactive@123');
  console.log('');
  console.log(' What to test:');
  console.log('   1. Admin  → sees all transactions, can CRUD, sees users tab');
  console.log('   2. Analyst → sees only own 3 txns, sees trends + anomaly alerts');
  console.log('   3. Viewer  → sees only own 2 txns, dashboard only (no trends/anomalies)');
  console.log('   4. Inactive → login should fail with "Account is deactivated"');
  console.log('   5. Dashboard → summary shows org-wide totals across all users');
  console.log('   6. Anomalies → spike alerts for Food(8.5k), Transport(45k),');
  console.log('                   Freelance(500k), Travel(85k), Office Supplies(65k)');
  console.log('');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
