/**
 * Add new city zones: Bengaluru, Hyderabad, Vijayawada
 * Run with: node src/prisma/add_zones.js
 */
require('dotenv').config();
const prisma = require('../lib/prisma');

async function main() {
  console.log('Adding new city zones...\n');

  // ── New Zones ──────────────────────────────────────────────────────
  const newZoneData = [
    { name: 'Bengaluru Central' },
    { name: 'Bengaluru East' },
    { name: 'Bengaluru North' },
    { name: 'Hyderabad Central' },
    { name: 'Hyderabad West' },
    { name: 'Vijayawada' },
  ];

  const zones = {};
  for (const z of newZoneData) {
    zones[z.name] = await prisma.zone.upsert({
      where: { name: z.name },
      update: {},
      create: { name: z.name }
    });
    console.log(`✅ Zone: ${z.name}`);
  }

  // ── New Areas (pincode → zone) ────────────────────────────────────
  const newAreas = [
    // Bengaluru Central
    { name: 'MG Road',        pincode: '560001', zone: 'Bengaluru Central' },
    { name: 'Shivajinagar',   pincode: '560051', zone: 'Bengaluru Central' },
    { name: 'Richmond Town',  pincode: '560025', zone: 'Bengaluru Central' },
    { name: 'Indiranagar',    pincode: '560038', zone: 'Bengaluru Central' },
    // Bengaluru East
    { name: 'Whitefield',     pincode: '560066', zone: 'Bengaluru East' },
    { name: 'Marathahalli',   pincode: '560037', zone: 'Bengaluru East' },
    { name: 'Electronic City',pincode: '560100', zone: 'Bengaluru East' },
    { name: 'BTM Layout',     pincode: '560076', zone: 'Bengaluru East' },
    // Bengaluru North
    { name: 'Hebbal',         pincode: '560024', zone: 'Bengaluru North' },
    { name: 'Yeshwanthpur',   pincode: '560022', zone: 'Bengaluru North' },
    { name: 'Yelahanka',      pincode: '560064', zone: 'Bengaluru North' },
    // Hyderabad Central
    { name: 'Secunderabad',   pincode: '500003', zone: 'Hyderabad Central' },
    { name: 'Begumpet',       pincode: '500016', zone: 'Hyderabad Central' },
    { name: 'Ameerpet',       pincode: '500016', zone: 'Hyderabad Central' },  // different area, same pincode — will skip duplicate
    { name: 'Himayatnagar',   pincode: '500029', zone: 'Hyderabad Central' },
    // Hyderabad West
    { name: 'HITEC City',     pincode: '500081', zone: 'Hyderabad West' },
    { name: 'Gachibowli',     pincode: '500032', zone: 'Hyderabad West' },
    { name: 'Kondapur',       pincode: '500084', zone: 'Hyderabad West' },
    { name: 'Madhapur',       pincode: '500081', zone: 'Hyderabad West' }, // skip — pincode already used
    // Vijayawada
    { name: 'Benz Circle',    pincode: '520010', zone: 'Vijayawada' },
    { name: 'Governorpet',    pincode: '520002', zone: 'Vijayawada' },
    { name: 'Mogalrajpuram',  pincode: '520010', zone: 'Vijayawada' }, // skip — pincode already used
    { name: 'Vijayawada One Town', pincode: '520001', zone: 'Vijayawada' },
    { name: 'Patamata',       pincode: '520007', zone: 'Vijayawada' },
  ];

  let added = 0, skipped = 0;
  // Track pincodes to avoid duplicate insert attempts
  const seen = new Set();
  for (const area of newAreas) {
    if (seen.has(area.pincode)) { skipped++; continue; }
    seen.add(area.pincode);
    try {
      await prisma.area.upsert({
        where: { pincode: area.pincode },
        update: {},
        create: {
          name: area.name,
          pincode: area.pincode,
          zoneId: zones[area.zone].id
        }
      });
      added++;
    } catch (err) {
      console.warn(`  Skipped ${area.pincode}: ${err.message}`);
      skipped++;
    }
  }
  console.log(`\n✅ Areas: ${added} added, ${skipped} skipped (duplicate pincodes)`);

  // ── Rate Cards for new zones ──────────────────────────────────────
  // Load ALL zones (existing + new) so cross-city rates are generated
  const allZones = await prisma.zone.findMany();
  const rateMatrix = {
    'intra-B2B': { ratePerKg: 25, minCharge: 50 },
    'intra-B2C': { ratePerKg: 35, minCharge: 60 },
    'inter-B2B': { ratePerKg: 40, minCharge: 80 },
    'inter-B2C': { ratePerKg: 55, minCharge: 100 }
  };

  const newZoneIds = new Set(Object.values(zones).map(z => z.id));
  let rateCount = 0;

  for (const fromZone of allZones) {
    for (const toZone of allZones) {
      // Only create rate cards where at least one side is a new zone
      if (!newZoneIds.has(fromZone.id) && !newZoneIds.has(toZone.id)) continue;

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
        rateCount++;
      }
    }
  }
  console.log(`✅ Rate cards: ${rateCount} created/updated`);
  console.log('\n🎉 Done! New zones are live.\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
