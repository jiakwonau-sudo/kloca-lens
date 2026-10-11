# KLoCa Lens v2 · SAFE PREVIEW (2026-10-11)

Based on original Google Drive `KLoCa_Lens_v2_20261010.zip`, unchanged original retained.

This intentionally **does not contain or call a provider API key**. The image recognition proxy is disabled. Photo upload preview, manual food search, confirmation, nutrition result, history, and cart are testable without external API spending.

Do not enable `VISION_PROXY_ENABLED` until a same-origin `/api/recognize` server endpoint has:
- replaced and revoked any previously exposed provider keys
- validated user access and given explicit usage limits
- enforced reliable server-side per-user/per-IP rate limiting, abuse monitoring, image/MIME/size limits and timeouts
- withheld provider credentials from HTML / browser JS
- been independently tested and approved by KLoCa QA

`worker.js` / `Code.gs` from the original ZIP were **not deployed** because they have no verified abuse controls.

Test evidence is stored separately. An unconfigured AI endpoint is a feature limitation, not a PASS of AI recognition.
