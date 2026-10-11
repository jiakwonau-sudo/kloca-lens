# KLoCa Lens v2 · SAFE PREVIEW QA

**Date:** 2026-10-11. **Verdict:** PARTIAL / development preview only, **not AI vision production**.

## Verified source and changes

- Input: `KLoCa_Lens_v2_20261010.zip` Drive source (9 items), kept unchanged.
- Source direct browser Gemini API key placeholder and browser-side Gemini request **removed**.
- No live provider key or external billable API calls permitted. `VISION_PROXY_ENABLED=false` by default.
- Any future recognition requires a same-origin secure API endpoint, server-side secret, abuse controls and renewed key. The old unverified Worker/Apps Script files were not included for deployment.
- Visible Korean preview disclosure on scan and confirmation screens. Unrecognized photo cannot be accepted until manual food selection.
- HTML SHA256: `92ccf0920915649ee329effa7cf1cd40b66f7ca11fcffcd169d3befd255e482d`.

## Tests (10/10 PASS)

1. Browser boot and preview notice.
2. No embedded provider key.
3. Scan entry screen.
4. Local image upload and preview; explicit offline recognition status.
5. Zero AI network requests.
6. Manual search candidate.
7. Manual food selection.
8. Nutrition result from local database.
9. History stored via localStorage shim.
10. Zero JavaScript runtime pageerror in tested path.

Execution used headless Chromium Playwright `set_content` because browser URL navigation is blocked in this test environment; in-memory localStorage shim used. Screenshot evidence: `QA_boot_390.png`, `QA_photo_390.png`, `QA_result_390.png`.

## Release blockers / unknown

- AI photo recognition is deliberately **OFF**. No Gemini service test has been made. **Never expose API keys in HTML.**
- GitHub secret scan alert for older public `kloca-lens` history still needs manual confirm/revoke/rotate and documented closure.
- No real Android device, actual HTTPS persistent storage, or cross-browser QA in this run.
- Production v1.2.3 stays unchanged. Publish v2 only to independent preview until full checklist is passed.
- Any server-side public proxy must enforce durable per-client quota / rate limiting to prevent abuse and unexpected spending.
