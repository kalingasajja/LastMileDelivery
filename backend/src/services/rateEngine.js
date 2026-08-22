const prisma = require('../lib/prisma');
const { detectZoneByPincode } = require('./zoneDetector');

/**
 * RATE CALCULATION ENGINE
 * ─────────────────────────────────────────────────────────────────
 * 
 * Algorithm:
 *  1. Resolve pickup pincode → pickup zone
 *  2. Resolve drop pincode → drop zone
 *  3. Look up rate card: (zoneFrom, zoneTo, orderType)
 *     - Intra-zone if zoneFrom === zoneTo (same zone, same rate card entry)
 *     - Inter-zone if zoneFrom !== zoneTo
 *  4. Compute volumetric weight = (L × B × H) / 5000
 *  5. Billable weight = MAX(actual_weight, volumetric_weight)
 *  6. Base charge = MAX(billable_weight × ratePerKg, minCharge)
 *  7. COD surcharge = lookup cod_surcharges for orderType (if paymentType = COD)
 *  8. Total = base + codSurcharge
 * Evaluates multiple delivery tier calculation strategies on the backend:
 *   1. STANDARD — Zone Rate Card (or standard distance fallback)
 *   2. EXPRESS  — Direct Point-to-Point Distance Rate (Priority Same-Day)
 *   3. ECONOMY  — Economy Surface Transport (Bulk / Budget Ground)
 */
async function calculateCharge({
  pickupPincode,
  dropPincode,
  length,
  breadth,
  height,
  actualWeight,
  orderType,
  paymentType,
  rateType = 'STANDARD'
}) {
  // ── Step 1 & 2: Zone detection & distance ──────────────────────
  const [pickupZone, dropZone] = await Promise.all([
    detectZoneByPincode(pickupPincode),
    detectZoneByPincode(dropPincode)
  ]);

  const isIntraZone = pickupZone.zoneId === dropZone.zoneId;
  const distanceKm = estimatePincodeDistance(pickupPincode, dropPincode);

  // ── Step 3: Volumetric & Billable Weight ────────────────────────
  const volumetricWeight = (length * breadth * height) / 5000;
  const billableWeight = Math.max(actualWeight, volumetricWeight);

  // ── Step 4: COD surcharge lookup ───────────────────────────────
  let codSurcharge = 0;
  if (paymentType === 'COD') {
    const codConfig = await prisma.codSurcharge.findUnique({
      where: { orderType }
    });
    codSurcharge = codConfig ? codConfig.surchargeFlat : 0;
  }

  // ── Step 5: Evaluate Zone Rate Card ────────────────────────────
  let zoneRateCard = null;
  if (!pickupZone.isUnmapped && !dropZone.isUnmapped) {
    zoneRateCard = await prisma.rateCard.findUnique({
      where: {
        zoneFromId_zoneToId_orderType: {
          zoneFromId: pickupZone.zoneId,
          zoneToId: dropZone.zoneId,
          orderType
        }
      }
    });
  }

  // ── Step 6: Compute Pricing Tiers on Backend ───────────────────
  
  // Option A: STANDARD (Zone rate card or standard distance fallback)
  const standardRatePerKg = zoneRateCard 
    ? zoneRateCard.ratePerKg 
    : parseFloat((22 + (distanceKm * 0.35)).toFixed(2));
  const standardMinCharge = zoneRateCard 
    ? zoneRateCard.minCharge 
    : parseFloat((45 + (distanceKm * 0.8)).toFixed(2));
  const standardBase = Math.max(billableWeight * standardRatePerKg, standardMinCharge);
  const standardTotal = parseFloat((standardBase + codSurcharge).toFixed(2));

  // Option B: EXPRESS (Priority Same-Day / Distance Point-to-Point)
  const expressRatePerKg = parseFloat((Math.max(standardRatePerKg * 1.45, 35 + distanceKm * 0.5)).toFixed(2));
  const expressMinCharge = parseFloat((Math.max(standardMinCharge * 1.5, 75 + distanceKm * 1.2)).toFixed(2));
  const expressBase = Math.max(billableWeight * expressRatePerKg, expressMinCharge);
  const expressTotal = parseFloat((expressBase + codSurcharge).toFixed(2));

  // Option C: ECONOMY (Surface / Budget Ground)
  const economyRatePerKg = parseFloat((Math.max(15, standardRatePerKg * 0.75)).toFixed(2));
  const economyMinCharge = parseFloat((Math.max(30, standardMinCharge * 0.75)).toFixed(2));
  const economyBase = Math.max(billableWeight * economyRatePerKg, economyMinCharge);
  const economyTotal = parseFloat((economyBase + codSurcharge).toFixed(2));

  const options = [
    {
      id: 'STANDARD',
      title: 'Standard Zone Delivery',
      subtitle: 'Standard ground shipping',
      estimatedDelivery: isIntraZone ? 'Next Day (24 hrs)' : '1–2 Business Days',
      ratePerKg: standardRatePerKg,
      minCharge: standardMinCharge,
      baseCharge: parseFloat(standardBase.toFixed(2)),
      codSurcharge: parseFloat(codSurcharge.toFixed(2)),
      totalCharge: standardTotal,
      pricingMethod: zoneRateCard ? 'ZONE_RATE_CARD' : 'DISTANCE_STANDARD'
    },
    {
      id: 'EXPRESS',
      title: 'Express Same-Day Dispatch',
      subtitle: 'Priority direct routing',
      estimatedDelivery: isIntraZone ? 'Same Day (4–6 hrs)' : 'Next Day Priority',
      ratePerKg: expressRatePerKg,
      minCharge: expressMinCharge,
      baseCharge: parseFloat(expressBase.toFixed(2)),
      codSurcharge: parseFloat(codSurcharge.toFixed(2)),
      totalCharge: expressTotal,
      pricingMethod: 'DISTANCE_EXPRESS'
    },
    {
      id: 'ECONOMY',
      title: 'Economy Surface Transport',
      subtitle: 'Budget ground shipping',
      estimatedDelivery: isIntraZone ? '2–3 Days' : '3–5 Business Days',
      ratePerKg: economyRatePerKg,
      minCharge: economyMinCharge,
      baseCharge: parseFloat(economyBase.toFixed(2)),
      codSurcharge: parseFloat(codSurcharge.toFixed(2)),
      totalCharge: economyTotal,
      pricingMethod: 'ECONOMY_SURFACE'
    }
  ];

  // Resolve selected option
  const selectedOption = options.find(o => o.id === rateType) || options[0];

  return {
    pickupZone: { zoneId: pickupZone.zoneId, zoneName: pickupZone.zoneName },
    dropZone: { zoneId: dropZone.zoneId, zoneName: dropZone.zoneName },
    isIntraZone,
    estimatedDistanceKm: distanceKm,
    volumetricWeight: parseFloat(volumetricWeight.toFixed(3)),
    billableWeight: parseFloat(billableWeight.toFixed(3)),

    // Selected Tier Details (used for order creation)
    selectedRateType: selectedOption.id,
    ratePerKg: selectedOption.ratePerKg,
    minCharge: selectedOption.minCharge,
    baseCharge: selectedOption.baseCharge,
    codSurcharge: selectedOption.codSurcharge,
    totalCharge: selectedOption.totalCharge,
    pricingMethod: selectedOption.pricingMethod,
    estimatedDelivery: selectedOption.estimatedDelivery,

    // All evaluated backend calculation options for user selection
    options
  };
}

module.exports = { calculateCharge };
