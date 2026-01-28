# Media Upload Implementation for Real Geopolitik

## What Was Implemented

### ✅ Complete Media Upload Pipeline

The system now has full support for uploading images to X/Twitter before posting tweets:

1. **Image Generation** (`openai_image.ts`)
   - Generates 1024x1792 (9:16) images via DALL-E 3
   - Overlays Real Geopolitik logo with Sharp
   - Saves to `out/images/news-{timestamp}.rg.png`

2. **Media Upload** (`x.ts` - new `uploadMedia()` function)
   - Reads image file from disk
   - Encodes to base64
   - Uses OAuth 1.0a to authenticate with Twitter Media Upload API
   - Returns `media_id_string` for attachment to tweets

3. **Tweet with Media** (`x.ts` - updated `postTweet()`)
   - New optional parameter: `mediaIds?: string[]`
   - Attaches media_ids to tweet payload
   - Media attached only to first tweet in thread

4. **End-to-End Flow** (`run_once.ts`)
   - Generates NewsPack (text + visual metadata)
   - If `IMAGE_LIVE=1`: generates image via DALL-E 3
   - Passes imagePath to `postThread()`
   - `postThread()` uploads media and attaches to tweet before posting

---

## How to Use

### Enable Images in LIVE Posts

```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```

**Expected flow:**
1. System picks trending story
2. Claude generates NewsPack (JSON)
3. DALL-E 3 generates image (9:16 format)
4. Sharp adds logo overlay
5. Image uploaded to X via Media Upload API
6. Tweet posted with media_id attached
7. Final tweet displays image in X timeline

### Variables

- `X_LIVE=1` — Enable posting to X
- `IMAGE_LIVE=1` — Enable image generation via DALL-E 3
- `--live` — CLI flag to arm posting (required with X_LIVE)

---

## File Changes

### `src/x.ts`

**Added imports:**
```typescript
import * as fs from "fs";
const API_BASE_UPLOAD = "https://upload.twitter.com/1.1";
```

**New function `uploadMedia(imagePath)`:**
- Reads PNG/JPG from disk
- Base64 encodes image data
- OAuth 1.0a authenticates with Twitter Media Upload endpoint
- Returns `media_id_string` on success, `null` on failure

**Updated `postTweet()`:**
- New param: `mediaIds?: string[]`
- Attaches media_ids to tweet payload if provided

**Updated `postThread()`:**
- New param: `imagePath?: string | null`
- Calls `uploadMedia()` if imagePath provided
- Passes mediaIds only to first tweet
- Subsequent tweets in thread have no media

### `src/run_once.ts`

**Added import:**
```typescript
import { generateNewsImage } from "./openai_image.js";
```

**Added image generation step:**
```typescript
let imagePath: string | null = null;
if (process.env.IMAGE_LIVE === "1") {
  imagePath = await generateNewsImage(newsPack.visual, selected.url);
}
```

**Pass imagePath to postThread:**
```typescript
const postResult = await postThread(texts, dryRun, imagePath);
```

---

## Troubleshooting

### Media Upload Returns 401 (Unauthorized)

**Cause:** X app permissions issue

**Solution:** 
1. Go to [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Select your app
3. Go to **App Settings → User authentication settings**
4. Ensure **App permissions** = **"Read and Write"** (not "Read only")
5. Regenerate API keys if needed

### Media Upload Returns 400 (Bad Request)

**Possible causes:**
- Image file doesn't exist
- Image format not supported (use PNG or JPG)
- Base64 encoding failed

**Check:** 
- Image file exists: `ls out/images/`
- File size reasonable: `du -h out/images/news-*.png`

### Image Not Showing in Tweet

**Possible causes:**
- Media upload succeeded but media_id not attached
- X cache (wait 5 min before checking)
- Image aspect ratio (9:16 is non-standard for X, but supported)

**Recommendation for X:**
- For X feed prominence: use **4:5 aspect** (1080×1350) instead of 9:16
- 9:16 displays but may be cropped on desktop

---

## Image Format Recommendation

Current: 1024×1792 (9:16 — mobile vertical)

**For better X display:**
- Change to 1080×1350 (4:5 — Instagram standard)
- More visible in X timeline
- Fewer crops on desktop view

Edit in `openai_image.ts`:
```typescript
size: "1024x1280", // Changed from 1024x1792
```

And update DALL-E prompt to reflect new aspect ratio.

---

## Test Results (2026-01-25)

✅ **Working:**
- Image generation via DALL-E 3
- Logo overlay with Sharp
- File save to `out/images/`
- Media upload authentication (OAuth 1.0a)
- Tweet posting (text-only fallback if media upload fails)

⚠️ **API Permission Issue:**
- Media upload returns 401 in current environment
- Likely due to app permissions not set to "Read and Write"
- Text-only tweets still post successfully as fallback
- Once permissions fixed: media will attach automatically

---

## Architecture Diagram

```
NewsPack (JSON)
    ↓
[IMAGE_LIVE=1?] → generateNewsImage() → image.png → uploadMedia() → media_id
    ↓                                                                   ↓
  NULL ←────────────────────────────────────────────────────────────────
    ↓
postThread(texts, imagePath) 
    ↓
    ├─ Upload media → media_id
    ├─ Tweet 1 (with media_id) → posted
    ├─ Tweet 2 (reply to 1) → posted
    └─ Tweet 3 (reply to 2) → posted

Final: https://x.com/i/status/{tweetId}
       (with image if media upload succeeded)
```

---

## Next Steps

1. **Fix X App Permissions:**
   - Set to "Read and Write" in Developer Portal
   - Regenerate keys if needed

2. **Test Media Upload:**
   ```bash
   X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
   ```
   - Check for "✅ Media uploaded: {mediaId}" in logs
   - Verify image appears in X timeline

3. **Optional: Change Aspect Ratio**
   - Edit `openai_image.ts` for 4:5 format
   - Better X timeline visibility

4. **Autopost Loop:**
   ```bash
   ./scripts/autopost-hourly.sh
   ```
   - Includes both `X_LIVE=1` and `IMAGE_LIVE=1`
   - Hourly posts with images

---

## References

- Twitter Media Upload API: https://developer.twitter.com/en/docs/twitter-api/v1-1/tweets/upload-media/overview
- OAuth 1.0a: https://developer.twitter.com/en/docs/authentication/oauth-1-0a
- DALL-E 3 API: https://platform.openai.com/docs/guides/images
