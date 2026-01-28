# DEDUP RULES (7d)

- **Fingerprint v1**: `sha1(YYYY-MM-DD|REGION|top_tokens(title,12))`
- **Signature**: SimHash( title + snippet ), 64-bit, Hamming threshold <=4
- **TTL**: 7 days (env: `DEDUPE_TTL_DAYS`), max signatures scanned: `DEDUPE_SIG_SCAN` (default 200)
- **Reason codes**: `DUP_URL`, `DUP_FP`, `DUP_NEAR(h=…)`
- **Flow**:
  1) On candidate selection: check `hasRecentDuplicate` (48h legacy) + `dedupeStore.checkDuplicate` (7d)
  2) On successful post: `rememberDedup` persists URL hash, fingerprint, signature
- **Canonicalization**: URLs are canonicalized (strip UTM/ref, normalize host/path) before hashing.
- **Near-duplicate**: if any stored signature within 7d has Hamming distance <=4 → drop.
- **Regions**: passed from curator/picker when available; default GLOBAL.
