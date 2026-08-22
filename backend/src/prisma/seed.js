/**
 * Seed script — creates initial admin, zones, areas, rate cards, and COD surcharges.
 * Run with: node src/prisma/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

async function main() {
  console.log('🌱 Starting seed...');

  // ── Admin user ───────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lastmile.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@lastmile.com',
      phone: '9999999999',
      passwordHash: adminPassword,
      role: 'ADMIN'
    }
  });
  console.log('✅ Admin:', admin.email);

  // ── Sample customer ──────────────────────────────────────────────
  const customerPassword = await bcrypt.hash('customer123', 12);
  await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '8888888888',
      passwordHash: customerPassword,
      role: 'CUSTOMER'
    }
  });

  // ── Zones ────────────────────────────────────────────────────────
  const zoneNames = ['North Mumbai', 'South Mumbai', 'Thane', 'Pune', 'Navi Mumbai'];
  const zones = {};
  for (const name of zoneNames) {
    zones[name] = await prisma.zone.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    console.log(`✅ Zone: ${name}`);
  }

  // ── Areas (pincode → zone) ───────────────────────────────────────
  const areaData = [
    // North Mumbai
    { name: 'Borivali',    pincode: '400066', zone: 'North Mumbai' },
    { name: 'Kandivali',   pincode: '400067', zone: 'North Mumbai' },
    { name: 'Malad',       pincode: '400064', zone: 'North Mumbai' },
    { name: 'Andheri',     pincode: '400069', zone: 'North Mumbai' },
    // South Mumbai
    { name: 'Colaba',      pincode: '400005', zone: 'South Mumbai' },
    { name: 'Fort',        pincode: '400001', zone: 'South Mumbai' },
    { name: 'Worli',       pincode: '400018', zone: 'South Mumbai' },
    { name: 'Dadar',       pincode: '400014', zone: 'South Mumbai' },
    // Thane
    { name: 'Thane West',  pincode: '400601', zone: 'Thane' },
    { name: 'Thane East',  pincode: '400603', zone: 'Thane' },
    { name: 'Mulund',      pincode: '400080', zone: 'Thane' },
    // Navi Mumbai
    { name: 'Vashi',       pincode: '400703', zone: 'Navi Mumbai' },
    { name: 'Nerul',       pincode: '400706', zone: 'Navi Mumbai' },
    { name: 'Kharghar',    pincode: '410210', zone: 'Navi Mumbai' },
    // Pune
    { name: 'Shivajinagar', pincode: '411005', zone: 'Pune' },
    { name: 'Hadapsar',    pincode: '411028', zone: 'Pune' },
    { name: 'Kothrud',     pincode: '411038', zone: 'Pune' }
  ];

  for (const area of areaData) {
    await prisma.area.upsert({
      where: { pincode: area.pincode },
      update: {},
      create: {
        name: area.name,
        pincode: area.pincode,
        zoneId: zones[area.zone].id
      }
    });
  }
  console.log(`✅ Areas: ${areaData.length} pincodes mapped`);

  // ── Rate Cards ───────────────────────────────────────────────────
  // Rates (₹/kg): intra-zone is cheaper than inter-zone
  // B2B rates are generally lower than B2C (bulk vs individual)
  const zoneList = Object.values(zones);
  const rateMatrix = {
    'intra-B2B': { ratePerKg: 25, minCharge: 50 },
    'intra-B2C': { ratePerKg: 35, minCharge: 60 },
    'inter-B2B': { ratePerKg: 40, minCharge: 80 },
    'inter-B2C': { ratePerKg: 55, minCharge: 100 }
  };

  for (const fromZone of zoneList) {
    for (const toZone of zoneList) {
      const isIntra = fromZone.id === toZone.id;
      for (const orderType of ['B2B', 'B2C']) {
        const key = `${isIntra ? 'intra' : 'inter'}-${orderType}`;
        const rate = rateMatrix[key];
        await prisma.rateCard.upsert({
          where: {
            zoneFromId_zoneToId_orderType: {
              zoneFromId: fromZone.id,
              zoneToId: toZone.id,
              orderType
            }
          },
          update: rate,
          create: {
            zoneFromId: fromZone.id,
            zoneToId: toZone.id,
            orderType,
            ...rate
          }
        });
      }
    }
  }
  console.log(`✅ Rate cards: ${zoneList.length * zoneList.length * 2} cards created`);

  // ── COD Surcharges ───────────────────────────────────────────────
  await prisma.codSurcharge.upsert({
    where: { orderType: 'B2C' },
    update: { surchargeFlat: 30 },
    create: { orderType: 'B2C', surchargeFlat: 30 }
  });
  await prisma.codSurcharge.upsert({
    where: { orderType: 'B2B' },
    update: { surchargeFlat: 50 },
    create: { orderType: 'B2B', surchargeFlat: 50 }
  });
  console.log('✅ COD surcharges: B2B=₹50, B2C=₹30');

  // ── Sample Agent ─────────────────────────────────────────────────
  const agentPassword = await bcrypt.hash('agent123', 12);
  const agentUser = await prisma.user.upsert({
    where: { email: 'agent1@lastmile.com' },
    update: {},
    create: {
      name: 'Raju Kumar',
      email: 'agent1@lastmile.com',
      phone: '7777777777',
      passwordHash: agentPassword,
      role: 'AGENT'
    }
  });
  await prisma.agentProfile.upsert({
    where: { userId: agentUser.id },
    update: {},
    create: {
      userId: agentUser.id,
      zoneId: zones['North Mumbai'].id,
      isAvailable: true
    }
  });

  const agentUser2 = await prisma.user.upsert({
    where: { email: 'agent2@lastmile.com' },
    update: {},
    create: {
      name: 'Priya Singh',
      email: 'agent2@lastmile.com',
      phone: '6666666666',
      passwordHash: agentPassword,
      role: 'AGENT'
    }
  });
  await prisma.agentProfile.upsert({
    where: { userId: agentUser2.id },
    update: {},
    create: {
      userId: agentUser2.id,
      zoneId: zones['South Mumbai'].id,
      isAvailable: true
    }
  });
  console.log('✅ Sample agents created');

  console.log('\n🎉 Seed completed!\n');
  console.log('Default credentials:');
  console.log('  Admin:    admin@lastmile.com / admin123');
  console.log('  Customer: customer@test.com / customer123');
  console.log('  Agent 1:  agent1@lastmile.com / agent123');
  console.log('  Agent 2:  agent2@lastmile.com / agent123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
