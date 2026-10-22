# KHOA_TASKS.md — Claude Code brief (TideCloak owner)

You are helping **Khoa** build his part of **Leashed ID Agent**, team Larpable's entry for RMIT Hackathon 2026, Challenge 2 (Tide UNLOCKED).
Repo: https://github.com/michen-dev/RMIT_SGS_Larpable_C2

**Hard deadline: 18:00 Vietnam time (UTC+7), Thu 22 Oct 2026.** Feature freeze 15:30. Submission 17:30.
Speed matters more than polish. Prefer the smallest change that works.

---

## 1. The product in one paragraph

A user types their Vietnamese national ID (CCCD) details. The browser encrypts each field with its own TideCloak tag, so the server only stores ciphertext. An AI agent, logged in as its **own TideCloak account**, fills a Vietnamese hotel form. It holds decrypt roles for name, date of birth and ID number only. When a hostile form injects a request for the home address, the **Tide network refuses**, even if the AI is fully fooled. Widening the agent's access needs a 2-of-3 admin quorum (the ID owner is one of the admins).

The single demo moment that must work: **agent requests `cccd_address` → denied.**

---

## 2. Who owns what (do not build other people's parts)

| Person | Owns |
|---|---|
| **Khoa (you are helping him)** | TideCloak server, Next.js scaffold, tag roles, user/agent/admin accounts, both spikes, the real `decryptField`, the `/me` page if time allows |
| Khánh | `/agent` page: LLM label→tag mapping (server API route), form filling, "Simulate compromised agent" toggle. Builds against a FAKE `decryptField` until integration |
| Duy | `/hotel` fake third-party form with the injection, ciphertext view, README |
| Minh | Fake CCCD data, Vietnamese labels, video |

Create placeholder pages for `/agent` and `/hotel` only (a heading, nothing else) so teammates have a place to work. Do not implement them.

---

## 3. Rules

- **No secrets in git.** `.gitignore` must contain `node_modules`, `.next`, `.env`, `.env.local`, `web/data/`. Commit only `.env.example`. Before committing `tidecloak.json`, show Khoa its contents and confirm it has no secrets.
- **Fake data only.** Never use a real ID. Sample: name `NGUYỄN VĂN MẪU`, dob `1990-01-01`, number `000000000001`, address `123 Đường Mẫu, Phường Mẫu, TP.HCM`.
- **Use Raziel first.** The Tide MCP server (`tide-pack`) is connected. Before writing any TideCloak auth, encryption or role code, query Raziel for the correct pattern. Do not guess Tide APIs from memory.
- **Stop at human steps.** Tide enrolment links, admin-console clicks, logging in as different accounts, and interactive prompts need Khoa. Say exactly what to do, then wait.
- **Keep files few.** Prefer editing existing files over creating new ones. Only the files listed in section 6 are expected.
- English for code, comments and commit messages. Commit after each task with a clear message.
- Never claim "unhackable". The claim is: *the agent cannot decrypt any field it was not granted.*

---

## 4. Environment

- TideCloak dev server in Docker on Khoa's laptop at `http://localhost:8080`. Teammates cannot reach it. Integration and the recorded demo happen on Khoa's machine.
- Next.js app scaffolded with Tide's official generator into the folder **`web/`** (not `app/`, to avoid `app/app/`).
- Agent account is used from a second browser profile or an incognito window, because Tide decryption completes in the browser.

---

## 5. Tasks, in order

### T0 — Repo hygiene (5 min)
1. `git mv REDME.md README.md` (the file name has a typo).
2. Create `.gitignore` per section 3.
3. Commit: `chore: fix README name, add gitignore`.

### T1 — TideCloak + scaffold (15 min)
1. Start the server (skip if already running: check `docker ps`):
   ```bash
   docker run -d -p 8080:8080 \
     -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
     -e KC_BOOTSTRAP_ADMIN_PASSWORD=password \
     tideorg/tidecloak-dev:latest
   ```
2. Scaffold: `npm init @tidecloak/nextjs@latest web`. **It pauses for Tide enrolment and prints a link.** If the prompt is interactive or hangs in your terminal, stop and ask Khoa to run it in his own VS Code terminal, then continue.
3. `cd web && npm install && npm run dev`. Confirm login works at the printed URL.
4. Add placeholder routes: `/me`, `/agent`, `/hotel`, `/spike`.
5. Commit and **push to `main` immediately** so teammates can start. Then tell Khoa: "Scaffold pushed — tell the team."

### T2 — Tags, roles, accounts (15 min, mostly Khoa in the admin console)
Ask Raziel how to create tag roles in this TideCloak version. Expected names per the SDK docs: `_tide_<tag>.selfencrypt` and `_tide_<tag>.selfdecrypt`. Confirm with Raziel.

Tags: `cccd_name`, `cccd_dob`, `cccd_number`, `cccd_address`.

| Account | Roles |
|---|---|
| `demo-user` | encrypt + decrypt for all 4 tags |
| `agent` | decrypt for `cccd_name`, `cccd_dob`, `cccd_number` only. **Never `cccd_address`.** |
| `admin-1`, `admin-2`, `admin-3` | realm admins (for Spike 2); `admin-1` represents the ID owner |

If Raziel says roles can be created via the admin REST API safely, write a small script. Otherwise give Khoa a click-by-click checklist.

### T3 — Spike 1: can the agent decrypt the user's data? (20 min, decides the whole project)
Build `/spike` as a throwaway test page:
1. **Encrypt panel** (logged in as `demo-user`): encrypt the 4 sample fields, each with its own tag, via `doEncrypt` from `useTideCloak`. POST the ciphertext to `/api/vault`.
2. **`/api/vault`** route: `GET` returns the stored record, `POST` saves it to `web/data/vault.json`. Stores ciphertext only.
3. **Decrypt panel** (logged in as `agent` in another browser profile): GET the vault, call `doDecrypt` on each tag separately, and show for each: success value OR the exact error message.

Expected outcome: name, dob and number decrypt; address fails.

Record, verbatim, in a section at the bottom of this file called `## Spike results`:
- Did cross-account decrypt work? (yes/no)
- The exact error message and object for the address denial.
- Whether the denial came from the SDK's local token-role check or from the Tide nodes (ORKs). The SDK checks roles in the token first, then the nodes check again. Both are fine for the demo; we need to know which one to describe accurately.

**If cross-account decrypt fails:** ask Raziel exactly this: *"Is `_tide_<tag>.selfdecrypt` limited to the user who encrypted the data? Which role or pattern lets a different user decrypt data tagged `cccd_name`?"* Apply the answer and retest. Tell Khoa immediately; he must post the result to the team.

### T4 — Spike 2: quorum on role grants (hard timebox: 20 min)
1. Ask Raziel how quorum-enforced governance (change requests) works for role assignment, and whether each admin must be Tide-enrolled.
2. Guide Khoa to enrol the 3 admins and try granting `agent` the role `_tide_cccd_address.selfdecrypt`.
3. Success = the grant sits as a **pending change request** needing approval. Ask Khoa to screenshot it (video beat 5). **Do not approve it.**
4. If not working after 20 minutes, stop. Record "quorum: dropped" in Spike results. The denial demo still stands.

### T5 — Real `decryptField` for Khánh (target: pushed by 15:00)
Implement the agreed contract in **`web/lib/decryptField.ts`**:

```ts
export type DecryptResult =
  | { ok: true; tag: string; value: string }
  | { ok: false; tag: string; reason: "denied" | "error" };

// Public shape the agent console calls:
decryptField(tag: string): Promise<DecryptResult>
```

- Expose it as a hook, `useDecryptField()`, that returns `decryptField`. Inside it: read the ciphertext for `tag` from `/api/vault`, call `doDecrypt([{ encrypted, tags: [tag] }])`, and return `ok: true` with the value.
- Map the exact denial error recorded in Spike 1 to `reason: "denied"`. Any other failure → `"error"`. Do not use a loose regex once the real error is known.
- **Never** catch a denial and fall back to another source. The denial must surface.
- Add a tiny check on `/spike`: call `decryptField` for all 4 tags and show the 4 results.
- Commit, push, then tell Khoa: "Real decryptField pushed — tell Khánh."

### T6 — `/me` page (only if T5 is done before ~15:00)
A form with 4 fields (labels in English with Vietnamese in brackets: Full name (Họ và tên), Date of birth (Ngày sinh), ID number (Số CCCD), Permanent address (Nơi thường trú)). On save: encrypt each field with its own tag, POST to `/api/vault`, then show "Saved — server holds ciphertext only" with a short ciphertext preview. Reuse the code from `/spike`; do not duplicate logic into new files.

---

## 6. Files you are expected to create or change

- `README.md` (rename only; Duy writes content)
- `.gitignore`, `web/.env.example`
- `web/` (scaffold output)
- `web/app/me/page.tsx`, `web/app/agent/page.tsx` (placeholder), `web/app/hotel/page.tsx` (placeholder), `web/app/spike/page.tsx`
- `web/app/api/vault/route.ts`
- `web/lib/decryptField.ts`

Adjust paths if the scaffold uses a different structure (e.g. `src/`), and tell Khoa.

---

## 7. Time gates

| Time | Gate | If it fails |
|---|---|---|
| ASAP | T1 scaffold pushed | Everyone is blocked: top priority |
| ~14:30 | Spike 1 answered (yes/no posted to team) | Ask Raziel + Tide Discord; Khoa decides with team |
| ~14:50 | Spike 2 done or dropped | Drop the quorum claim |
| 15:00 | Real `decryptField` pushed | Khánh keeps the fake; integrate by 15:30 |
| **15:30** | **Feature freeze** | No new features after this; fixes only |

---

## 8. How to report

After each task, give Khoa 2–4 lines: what was done, what he must do by hand (if anything), and what the next task is. Keep going without waiting unless a human step is needed.

## Spike results

_(fill in during T3 and T4)_
