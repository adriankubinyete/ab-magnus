import ixc from './ixcsoft/client-instance.js';
import magnus from './magnusbilling/client-instance.js';
// import { publishStatusChange } from '../producers/status-change.producer.js';
import { getMagnusActiveFromIxc } from '../config/status-map.js';

async function loadMagnusUsersWithDist() {
  const allRelevantUsers = new Map();

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await magnus.listUsers(page, 9999);
    const users = res.rows || [];

    for (const user of users) {
      const dist = user.dist?.trim();
      if (!dist) continue;

      const formattedUser = {
        id: user.id,
        username: user.username,
        name: user.firstname ?? user.lastname ?? 'SEM_NOME',
        status: Number(user.active),
      };

      if (!allRelevantUsers.has(dist)) {
        allRelevantUsers.set(dist, []);
      }

      allRelevantUsers.get(dist).push(formattedUser);
    }

    hasMore = users.length === 9999;
    page++;
  }

  console.log(`Found ${allRelevantUsers.size} contracts with 'dist' key.`);
  return allRelevantUsers;
}

/**
 * @returns Array[{
 *   contract: number,
 *   from: number,
 *   to: number,
 *   _meta: {
 *     contract: {
 *       id: number,
 *       status: number,
 *       status_internet: number,
 *     },
 *     magnus: {
 *       userId: number,
 *       userStatus: number,
 *       name: string,
 *     }
 *   }
 * }]
 */
export async function getStatusChanges() {
  const magnusIndex = await loadMagnusUsersWithDist();
  const changes = [];

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await ixc.listContracts({ page, limit: 1000 });
    const contracts = res.registros || [];

    for (const contract of contracts) {
      const distKey = String(contract.id);
      const magnusUsers = magnusIndex.get(distKey);
      if (!magnusUsers || magnusUsers.length === 0) continue;

      const targetStatus = getMagnusActiveFromIxc(contract);

      for (const magnusData of magnusUsers) {
        const currentStatus = magnusData.status;

        if (currentStatus !== targetStatus) {
          changes.push({
            contract: contract.id,
            from: currentStatus,
            to: targetStatus,
            _meta: {
              contract: {
                id: contract.id,
                status: contract.status,
                status_internet: contract.status_internet,
              },
              magnus: {
                userId: magnusData.id,
                userStatus: magnusData.status,
                name: magnusData.name,
              }
            },
          });
        }
      }
    }

    hasMore = contracts.length === 1000;
    page++;
  }

  console.log(
    `Processed ${magnusIndex.size} contracts. ${changes.length} requires status changes.`
  );

  return changes;
}


export async function updateMagnusUserStatus(userId, newStatus) {
  const stopUpdate = process.env.DEV_MAGNUSBILLING_STOP_UPDATE === 'true';
  if (stopUpdate) {
    console.log(`Blocked update of Magnus user ${userId} status to ${newStatus} due to DEV_MAGNUSBILLING_STOP_UPDATE`);
    return null;
  };
  return await magnus.updateUserStatus(userId, newStatus);
}