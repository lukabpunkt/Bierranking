const KEY = "pz_last_group";

/** Zuletzt genutzte Gruppe merken (localStorage – gilt pro Gerät). */
export function rememberGroup(groupId: string) {
  try {
    localStorage.setItem(KEY, groupId);
  } catch {
    /* egal */
  }
}

export function lastGroup(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function forgetGroup() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* egal */
  }
}
