export function randomEventId(): string {
  return `evt_${crypto.randomUUID()}`
}

export function guestEventId(guestDeviceId: string, collection: string, entityId: string): string {
  return `evt_guest_${guestDeviceId}_${collection}_${entityId}`
}

export function newDeviceId(): string {
  return `dev_${crypto.randomUUID()}`
}

export function newGuestDeviceId(): string {
  return `gdev_${crypto.randomUUID()}`
}
