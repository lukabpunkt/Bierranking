/** Zuletzt genutzte Gruppe als Cookie merken (wird serverseitig auf "/" gelesen). */
export function rememberGroup(groupId: string) {
  document.cookie = `pz_last_group=${groupId}; path=/; max-age=31536000; samesite=lax`;
}

export function forgetGroup() {
  document.cookie = "pz_last_group=; path=/; max-age=0";
}
