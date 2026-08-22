const prisma = require('../lib/prisma');

/**
 * AUTO-ASSIGNMENT ENGINE
 * ─────────────────────────────────────────────────────────────────
 * 
 * Strategy (zone-tagged approach — no GPS needed):
 *  1. Find all agents with is_available = true in the pickup zone (preferred)
 *  2. If no agents in pickup zone, fall back to ANY available agent
 *  3. Pick first available (zone-local preferred, then any)
 *  4. Mark agent as unavailable, assign to order
 *  5. Append AGENT_ASSIGNED to tracking_history
 * 
 * @param {string} orderId
 * @param {string} pickupZoneId
 * @param {string} actorId - admin or system performing the assignment
 * @param {string} actorRole
 * @returns {Promise<{ agentId, agentName }>}
 */
async function autoAssign(orderId, pickupZoneId, actorId, actorRole) {
  // Step 1: Look for available agents in pickup zone
  let agentProfile = await prisma.agentProfile.findFirst({
    where: {
      zoneId: pickupZoneId,
      isAvailable: true
    },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } }
  });

  // Step 2: Fallback — any available agent
  if (!agentProfile) {
    agentProfile = await prisma.agentProfile.findFirst({
      where: { isAvailable: true },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } }
    });
  }

  if (!agentProfile) {
    throw new Error('No available delivery agents at this time. Please try manual assignment or retry later.');
  }

  // Step 3: Assign agent and mark as unavailable (in a transaction)
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { agentId: agentProfile.userId, status: 'AGENT_ASSIGNED' }
    }),
    prisma.agentProfile.update({
      where: { id: agentProfile.id },
      data: { isAvailable: false }
    }),
    prisma.trackingHistory.create({
      data: {
        orderId,
        status: 'AGENT_ASSIGNED',
        changedById: actorId,
        changedByRole: actorRole,
        note: `Auto-assigned to agent: ${agentProfile.user.name} (Zone: ${agentProfile.zoneId === pickupZoneId ? 'pickup zone match' : 'fallback — any available'})`
      }
    })
  ]);

  return {
    agentId: agentProfile.userId,
    agentName: agentProfile.user.name
  };
}

/**
 * MANUAL ASSIGNMENT — admin assigns a specific agent
 * @param {string} orderId
 * @param {string} targetAgentId - userId of the agent
 * @param {string} actorId
 * @param {string} actorRole
 */
async function manualAssign(orderId, targetAgentId, actorId, actorRole) {
  const agentProfile = await prisma.agentProfile.findUnique({
    where: { userId: targetAgentId },
    include: { user: { select: { id: true, name: true } } }
  });

  if (!agentProfile) throw new Error('Agent profile not found');

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { agentId: targetAgentId, status: 'AGENT_ASSIGNED' }
    }),
    prisma.agentProfile.update({
      where: { id: agentProfile.id },
      data: { isAvailable: false }
    }),
    prisma.trackingHistory.create({
      data: {
        orderId,
        status: 'AGENT_ASSIGNED',
        changedById: actorId,
        changedByRole: actorRole,
        note: `Manually assigned to agent: ${agentProfile.user.name}`
      }
    })
  ]);

  return { agentId: targetAgentId, agentName: agentProfile.user.name };
}

module.exports = { autoAssign, manualAssign };
