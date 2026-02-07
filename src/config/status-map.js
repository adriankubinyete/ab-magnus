export const CLIENT_STATUS = {
  INACTIVE: 0,
  ACTIVE: 1,
  BLOCKED: 4
}

export const STATUS_MAP_IXC_TO_MAGNUS = {
  status: {
    'P': CLIENT_STATUS.ACTIVE,  // Pré-contrato → ativo no Magnus (ou 0, dependendo da regra)
    'A': CLIENT_STATUS.ACTIVE,  // Ativo → ativo
    'I': CLIENT_STATUS.INACTIVE,  // Inativo → bloqueado
    'N': CLIENT_STATUS.BLOCKED,  // Negativado → bloqueado
    'D': CLIENT_STATUS.INACTIVE,  // Desistiu → bloqueado
  },
  status_internet: {
    'A': CLIENT_STATUS.ACTIVE,
    'D': CLIENT_STATUS.BLOCKED,
    'CM': CLIENT_STATUS.BLOCKED,
    'CA': CLIENT_STATUS.BLOCKED,
    'FA': CLIENT_STATUS.BLOCKED,
    'AA': CLIENT_STATUS.BLOCKED,
  }
}

export function getMagnusActiveFromIxc(contract) {
  const statusFromIxc =
    STATUS_MAP_IXC_TO_MAGNUS.status[contract.status] ?? CLIENT_STATUS.INACTIVE;

  // se o contrato nao tiver ativo, vai pelo valor do contrato
  if (statusFromIxc !== CLIENT_STATUS.ACTIVE) {
    return statusFromIxc;
  }

  // se o contrato estiver ativo, vai pelo valor de status_internet (representa basicamente a conexão)
  if (
    contract.status_internet &&
    contract.status_internet in STATUS_MAP_IXC_TO_MAGNUS.status_internet
  ) {
    return STATUS_MAP_IXC_TO_MAGNUS.status_internet[contract.status_internet];
  }

  // n bateu em nenhum mapping = defaulta pra bloqueado
  console.log('no mapping found for contract', contract);
  return CLIENT_STATUS.BLOCKED;
}