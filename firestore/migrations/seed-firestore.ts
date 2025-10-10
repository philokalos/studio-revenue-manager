/**
 * Firestore Seed Data Script
 *
 * Creates initial test data for development
 *
 * Usage:
 *   npm run seed
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();
const auth = admin.auth();

/**
 * Create test users
 */
async function seedUsers() {
  console.log('👤 Creating test users...');

  const users = [
    {
      email: 'admin@studio.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
    },
    {
      email: 'staff@studio.com',
      password: 'staff123',
      name: 'Staff User',
      role: 'staff',
    },
    {
      email: 'customer@example.com',
      password: 'customer123',
      name: 'Test Customer',
      role: 'customer',
      phone: '010-1234-5678',
    },
  ];

  for (const user of users) {
    try {
      // Create auth user
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.name,
      });

      // Set custom claims for role
      await auth.setCustomUserClaims(userRecord.uid, { role: user.role });

      // Create Firestore document
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || null,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      console.log(`  ✅ Created ${user.role}: ${user.email}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`  ⚠️  User already exists: ${user.email}`);
      } else {
        console.error(`  ❌ Failed to create ${user.email}:`, error.message);
      }
    }
  }
}

/**
 * Create test reservations
 */
async function seedReservations() {
  console.log('📅 Creating test reservations...');

  const now = new Date();
  const reservations = [
    {
      id: 'R001',
      startTime: new Date(now.getFullYear(), now.getMonth(), 15, 10, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), 15, 14, 0),
      initialHeadcount: 5,
      channel: 'default',
      status: 'CONFIRMED',
      payerName: '김철수',
      phone: '010-1111-2222',
      peopleCount: 5,
      parkingCount: 1,
      shootingPurpose: '프로필 촬영',
    },
    {
      id: 'R002',
      startTime: new Date(now.getFullYear(), now.getMonth(), 20, 14, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), 20, 18, 0),
      initialHeadcount: 3,
      channel: 'hourplace',
      status: 'CONFIRMED',
      payerName: '이영희',
      phone: '010-3333-4444',
      peopleCount: 3,
      parkingCount: 0,
      shootingPurpose: '제품 촬영',
    },
    {
      id: 'R003',
      startTime: new Date(now.getFullYear(), now.getMonth(), 25, 9, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), 25, 13, 0),
      initialHeadcount: 8,
      channel: 'spacecloud',
      status: 'CONFIRMED',
      payerName: '박민수',
      phone: '010-5555-6666',
      peopleCount: 8,
      parkingCount: 2,
      shootingPurpose: '행사 촬영',
    },
  ];

  const batch = db.batch();

  for (const reservation of reservations) {
    const docRef = db.collection('reservations').doc(reservation.id);
    batch.set(docRef, {
      ...reservation,
      startTime: admin.firestore.Timestamp.fromDate(reservation.startTime),
      endTime: admin.firestore.Timestamp.fromDate(reservation.endTime),
      headcountChanges: [],
      needsCorrection: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }

  await batch.commit();
  console.log(`  ✅ Created ${reservations.length} reservations`);
}

/**
 * Create test invoices
 */
async function seedInvoices() {
  console.log('💰 Creating test invoices...');

  const invoices = [
    {
      id: 'INV001',
      reservationId: 'R001',
      expectedAmount: 200000,
      discountAmount: 0,
      finalAmount: 200000,
      status: 'PAID',
    },
    {
      id: 'INV002',
      reservationId: 'R002',
      expectedAmount: 150000,
      discountType: 'rate',
      discountValue: 10,
      discountAmount: 15000,
      finalAmount: 135000,
      status: 'OPEN',
    },
    {
      id: 'INV003',
      reservationId: 'R003',
      expectedAmount: 320000,
      discountAmount: 0,
      finalAmount: 320000,
      status: 'PARTIAL',
      paidAmount: 160000,
    },
  ];

  const batch = db.batch();

  for (const invoice of invoices) {
    const docRef = db.collection('invoices').doc(invoice.id);
    batch.set(docRef, {
      ...invoice,
      discountLogs: [],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }

  await batch.commit();
  console.log(`  ✅ Created ${invoices.length} invoices`);
}

/**
 * Create test monthly data
 */
async function seedMonthlyData() {
  console.log('📊 Creating test monthly data...');

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Create cost
  await db.collection('costs').doc(month).set({
    id: month,
    month: month,
    rent: 1500000,
    utilities: 200000,
    adsTotal: 300000,
    supplies: 100000,
    maintenance: 50000,
    channelBreakdown: {
      naver: 150000,
      google: 100000,
      instagram: 50000,
    },
    description: '테스트 비용 데이터',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  });

  // Create goal
  await db.collection('goals').doc(month).set({
    id: month,
    month: month,
    revenueTarget: 5000000,
    actualRevenue: 655000,
    achievementRate: 0.131,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  });

  // Create monthly summary
  await db.collection('monthlySummaries').doc(month).set({
    id: month,
    month: month,
    totalRevenue: 655000,
    totalCosts: 2150000,
    netProfit: -1495000,
    utilizationRate: 0.12,
    goalAchievementRate: 0.131,
    reservationCount: 3,
    averageReservationValue: 218333,
    lastCalculatedAt: admin.firestore.Timestamp.now(),
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  });

  console.log(`  ✅ Created monthly data for ${month}`);
}

/**
 * Main seed function
 */
async function seed() {
  console.log('🌱 Starting Firestore seed...\n');

  try {
    await seedUsers();
    await seedReservations();
    await seedInvoices();
    await seedMonthlyData();

    console.log('\n✅ Seed completed!');
    console.log('\n📝 Test Accounts:');
    console.log('  Admin:    admin@studio.com / admin123');
    console.log('  Staff:    staff@studio.com / staff123');
    console.log('  Customer: customer@example.com / customer123');
  } catch (error: any) {
    console.error('\n❌ Seed failed:', error.message);
    process.exit(1);
  }
}

// Run seed
seed();
