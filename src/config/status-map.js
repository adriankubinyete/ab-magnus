// src/config/status-map.js
export const STATUS_MAP_IXC_TO_MAGNUS = {
  // Baseado em status principal (prioridade alta)
  'P': 1,  // Pré-contrato → ativo no Magnus (ou 0, dependendo da regra)
  'A': 1,  // Ativo → ativo
  'I': 4,  // Inativo → bloqueado
  'N': 4,  // Negativado → bloqueado
  'D': 4,  // Desistiu → bloqueado

  // Se quiser sobrepor usando status_internet (mais granular)
  // status_internet tem precedência se definido
  status_internet: {
    'A': 1,
    'D': 4,
    'CM': 4,
    'CA': 4,
    'FA': 4,
    'AA': 4,
  }
};

export function getMagnusActiveFromIxc(contract) {
  // Prioridade: status_internet > status principal
  if (contract.status_internet && contract.status_internet in STATUS_MAP_IXC_TO_MAGNUS.status_internet) {
    return STATUS_MAP_IXC_TO_MAGNUS.status_internet[contract.status_internet];
  }
  return STATUS_MAP_IXC_TO_MAGNUS[contract.status] ?? 1; // default ativo se desconhecido
}