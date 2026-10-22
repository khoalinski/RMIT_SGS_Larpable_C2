import { useCallback } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'

// `message` is the verbatim error, so /spike can show exactly what failed.
export type DecryptResult =
  | { ok: true; tag: string; value: string }
  | { ok: false; tag: string; reason: "denied" | "error"; message?: string }

// Exact error thrown by the SDK's local token-role check in doDecrypt
// (@tidecloak/js lib/tidecloak.js) when the session lacks _tide_<tag>.selfdecrypt.
const deniedMessage = (tag: string) => `User has not been given any access to '${tag}'`

// Fallback design: ciphertext in /api/vault was encrypted by this same session,
// so access is decided purely by this session's _tide_<tag>.selfdecrypt roles.
export function useDecryptField() {
  const { doDecrypt } = useTideCloak()

  const decryptField = useCallback(async (tag: string): Promise<DecryptResult> => {
    try {
      const res = await fetch('/api/vault')
      if (!res.ok) throw new Error(`GET /api/vault failed: ${res.status}`)
      const vault: Record<string, string> = await res.json()
      const encrypted = vault[tag]
      if (!encrypted) throw new Error(`No ciphertext stored for '${tag}'`)

      const [value] = await doDecrypt([{ encrypted, tags: [tag] }])
      return { ok: true, tag, value: String(value) }
    } catch (err: any) {
      // Never fall back to another source: a denial must surface as a denial.
      const message = String(err?.message ?? err)
      return { ok: false, tag, reason: message === deniedMessage(tag) ? "denied" : "error", message }
    }
  }, [doDecrypt])

  return decryptField
}
