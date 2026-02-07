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
      if (dist && dist !== '') {
        allRelevantUsers.set(dist, {
          id: user.id,
          username: user.username,
          name: user.firstname ?? user.lastname ?? 'SEM_NOME',
          status: Number(user.active),
        });
      }
    }

    hasMore = users.length === 9999;
    page++;
  }

  console.log(`Found ${allRelevantUsers.size} users with 'dist' key.`);
  return allRelevantUsers;
}

// export async function syncChangedContracts() {
//   // carrega todos os usuários do Magnus com dist preenchido
//   const magnusIndex = await loadMagnusUsersWithDist();

//   if (magnusIndex.size === 0) {
//     console.log('No Magnus users with dist. Nothing to sync.');
//     return 0;
//   }

//   // busca os contratos do ixc
//   let page = 1;
//   let hasMore = true;
//   let processed = 0;
//   let changesPublished = 0;

//   while (hasMore) {
//     const res = await ixc.listContracts({ page, limit: 1000 });
//     const contracts = res.registros || [];

//     for (const contract of contracts) {
//       const contractId = Number(contract.id);
//       const distKey = String(contractId);

//       const magnusData = magnusIndex.get(distKey);
//       if (!magnusData) {
//         // contrato sem usuário no magnus
//         continue;
//       }

//       const targetActive = getMagnusActiveFromIxc(contract);
//       const currentActive = magnusData.active;

//       if (currentActive !== targetActive) {
//         console.log('Publishing status change for contract', contractId, 'from', currentActive, 'to', targetActive);
//         changesPublished++;
//       }
//       processed++;
//     }
//     hasMore = contracts.length === 1000 && page * 1000 < Number(res.total || 0);
//     page++;
//   }

//   console.log(`Processed ${processed} contracts. Published ${changesPublished} status changes. ${magnusIndex.size} usuários gerenciados.`);
// }

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
      const magnusData = magnusIndex.get(distKey);
      if (!magnusData) continue;

      const currentStatus = magnusData.status;
      const targetStatus = getMagnusActiveFromIxc(contract);
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

    
    hasMore = contracts.length === 1000;
    page++;
  }
  
  console.log(`Processed ${magnusIndex.size} users. ${changes.length} requires status changes.`);
  return changes;
}