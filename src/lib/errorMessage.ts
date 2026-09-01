/**
 * Ubah error teknis jadi kalimat yang bisa dibaca pengguna.
 * "Failed to fetch" / "Load failed" itu istilah browser saat jaringan putus atau
 * server tidak terjangkau — tidak berarti apa-apa bagi orang yang sedang belajar.
 */
export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";

  if (!raw || /failed to fetch|load failed|networkerror|network request failed/i.test(raw)) {
    return "Can't reach Speakly right now — check your connection and try again.";
  }
  if (/UNAUTHORIZED|HTTP 401|jwt|token/i.test(raw)) {
    return "Your session expired — please sign in again.";
  }
  if (/HTTP 5\d\d|INTERNAL_SERVER_ERROR/i.test(raw)) {
    return "Speakly is having trouble right now. Please try again in a moment.";
  }
  if (/NOT_FOUND/i.test(raw)) {
    return "We couldn't find that. Try refreshing the page.";
  }
  return raw;
}

/**
 * Tampilkan error sebagai toast. `id` dari teksnya sendiri supaya kegagalan
 * beruntun (mis. beberapa request putus bersamaan) tidak menumpuk jadi
 * setumpuk toast yang isinya sama.
 */
export function notifyError(err: unknown): void {
  const message = friendlyError(err);
  import("sonner").then(({ toast }) => toast.error(message, { id: message }));
}
