'use client'

import { useTideCloak } from '@tidecloak/nextjs'
import { useState, useCallback } from 'react'
import { useDecryptField, type DecryptResult } from '../../lib/decryptField'

// Fake sample data only. Each field gets its own tag.
const FIELDS: [tag: string, value: string][] = [
  ["cccd_name", "NGUYỄN VĂN MẪU"],
  ["cccd_dob", "1990-01-01"],
  ["cccd_number", "000000000001"],
  ["cccd_address", "123 Đường Mẫu, Phường Mẫu, TP.HCM"],
]

export default function SpikePage() {
  const { doEncrypt } = useTideCloak()
  const decryptField = useDecryptField()

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const [results, setResults] = useState<DecryptResult[]>([])

  const onEncrypt = useCallback(async () => {
    setBusy(true); setStatus("")
    try {
      const cts = await doEncrypt(FIELDS.map(([tag, data]) => ({ data, tags: [tag] })))
      const record: Record<string, string> = {}
      FIELDS.forEach(([tag], i) => {
        if (typeof cts[i] !== 'string') throw new Error(`Unexpected ciphertext type for '${tag}'`)
        record[tag] = cts[i]
      })
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
      if (!res.ok) throw new Error(`POST /api/vault failed: ${res.status} ${await res.text()}`)
      setStatus(`✅ Stored ciphertext for ${FIELDS.length} tags`)
    } catch (err: any) {
      setStatus(`❌ ${err?.message ?? err}`)
    } finally {
      setBusy(false)
    }
  }, [doEncrypt])

  const onDecrypt = useCallback(async () => {
    setBusy(true); setResults([])
    const out: DecryptResult[] = []
    for (const [tag] of FIELDS) out.push(await decryptField(tag))
    setResults(out)
    setBusy(false)
  }, [decryptField])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 760 }}>
      <h1>Spike 1: per-tag decrypt</h1>

      <button onClick={onEncrypt} disabled={busy}>1. Encrypt 4 fields → /api/vault</button>
      {status && <p>{status}</p>}

      <button onClick={onDecrypt} disabled={busy} style={{ marginTop: '1rem' }}>
        2. decryptField × 4
      </button>
      <ul>
        {results.map((r) => (
          <li key={r.tag}>
            <code>{r.tag}</code>:{' '}
            {r.ok
              ? <span style={{ color: 'green' }}>{r.value}</span>
              : <span style={{ color: 'red' }}>{r.reason}: <code>{r.message}</code></span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
