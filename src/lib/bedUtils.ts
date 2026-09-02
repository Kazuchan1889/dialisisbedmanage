export function isMachineDamagedOrRepaired(machine?: { status: string; notes?: string | null } | null): boolean {
  if (!machine) return false;
  if (machine.status === 'MAINTENANCE') return true; // RUSAK
  if (machine.status === 'AVAILABLE' && machine.notes && machine.notes.startsWith('[REPAIRED]')) {
    return true; // REPAIRED
  }
  return false;
}
