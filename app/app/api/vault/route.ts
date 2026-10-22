import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Stores ciphertext only: { [tag]: ciphertext }. Encryption happens in the browser,
// so the server never sees plaintext CCCD fields.
const VAULT_PATH = path.join(process.cwd(), 'data', 'vault.json')

export async function GET(): Promise<NextResponse> {
  try {
    const raw = await fs.readFile(VAULT_PATH, 'utf8')
    return NextResponse.json(JSON.parse(raw), { status: 200 })
  } catch (err: any) {
    if (err?.code === 'ENOENT') return NextResponse.json({}, { status: 200 })
    console.error('Vault read failed:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null)
  const valid =
    body && typeof body === 'object' && !Array.isArray(body) &&
    Object.values(body).every((v) => typeof v === 'string')
  if (!valid) {
    return NextResponse.json(
      { error: 'Body must be an object of { tag: ciphertext } strings' },
      { status: 400 }
    )
  }

  await fs.mkdir(path.dirname(VAULT_PATH), { recursive: true })
  await fs.writeFile(VAULT_PATH, JSON.stringify(body, null, 2))
  return NextResponse.json({ saved: Object.keys(body) }, { status: 200 })
}
