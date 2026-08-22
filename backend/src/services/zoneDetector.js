const prisma = require('../lib/prisma');

/**
 * Zone Detector — resolves a pincode to its zone via the areas table.
 * 
 * This is intentionally pincode-based (no external geocoding API needed).
 * Admins configure pincode → zone mappings via the Area management UI.
 * 
 * @param {string} pincode - 6-digit pincode
 * @returns {Promise<{ areaId, areaName, zoneId, zoneName }>}
 * @throws Error if pincode is not mapped to any zone
 */
async function detectZoneByPincode(pincode) {
  const area = await prisma.area.findUnique({
    where: { pincode: pincode.trim() },
    include: { zone: true }
  });

  if (!area) {
    throw new Error(`No zone found for pincode "${pincode}". Please ensure it is configured in admin.`);
  }

  return {
    areaId: area.id,
    areaName: area.name,
    zoneId: area.zone.id,
    zoneName: area.zone.name
  };
}

module.exports = { detectZoneByPincode };
