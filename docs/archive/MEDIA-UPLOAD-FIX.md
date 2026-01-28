# 🎬 Media Upload Issue & Fix

## Current Status

✅ **Images generate:** DALL-E 3 → 1024×1792 PNG ✅  
✅ **Logo overlays:** Sharp applies RG branding ✅  
✅ **Tweets post:** Text goes to X successfully ✅  
❌ **Media attaches:** 401 Unauthorized error ❌

---

## Error Details

```
❌ Media upload error: Media upload failed 401: 
{"errors":[{"message":"Could not authenticate you","code":32}]}
```

**What this means:**
- Your X API credentials are valid (you can post text)
- The media upload endpoint is rejecting the request
- Reason: Missing "Read and Write" permission on the app

---

## Why This Happens

X API has two permission levels:

| Permission | Can Do | Cannot Do |
|---|---|---|
| **Read only** | Fetch tweets, read profile | Post, upload media |
| **Read and Write** | Post tweets, upload media | Delete others' tweets |

Your app is currently set to **"Read only"** (or missing media upload scope).

---

## Fix (5 Steps)

### 1. Go to X Developer Portal
- https://developer.twitter.com/en/portal/dashboard
- Log in with your account

### 2. Select Your App
- Find "Real Geopolitik" (or your app name)
- Click it

### 3. Open App Settings
- Left menu → **"Settings"**
- Scroll to **"User authentication settings"**

### 4. Check Current Permissions
You'll see:
```
App permissions: [Read only] [dropdown]
```

### 5. Change to Read and Write
- Click the dropdown
- Select **"Read and Write"**
- Click **"Save"**

---

## Regenerate API Keys

Once you change permissions, you may need new tokens:

1. **Go to:** Settings → **"Keys and tokens"**

2. **Copy these values:**
   - Consumer Key (API Key)
   - Consumer Secret (API Secret)
   - Access Token
   - Access Token Secret

3. **Update `.env`:**
   ```env
   X_CONSUMER_KEY=new_value
   X_CONSUMER_SECRET=new_value
   X_ACCESS_TOKEN=new_value
   X_ACCESS_TOKEN_SECRET=new_value
   ```

4. **Restart script:**
   ```bash
   X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
   ```

---

## How to Verify the Fix

Run a LIVE post and check the output:

```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```

**Look for:**

✅ **Success (media attached):**
```
✅ Media uploaded: 1234567890123456789
✅ Thread posted successfully!
   View: https://x.com/i/status/{tweet_id}
```

Then go to the tweet URL and verify:
- Text appears ✅
- Image appears below text ✅

---

❌ **Still failing? Debug steps:**

### Step 1: Verify credentials
```bash
npm run dev  # (without --live)
# Should show: "Testing X connection..."
# If it fails here, credentials are invalid
```

### Step 2: Check .env values
```bash
grep "X_CONSUMER_KEY\|X_ACCESS_TOKEN" .env
# Should show your actual keys, not empty
```

### Step 3: Verify IMAGE_LIVE is set
```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live 2>&1 | grep "Image"
# Should show: "✅ Image ready: out/images/..."
```

### Step 4: Look for 401 specifically
```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live 2>&1 | grep -A 2 "Media upload"
# If you see 401, it's the permission issue described above
```

---

## Architecture (How Media Upload Works)

```
1. openai_image.ts generates PNG
   ↓
2. run_once.ts gets imagePath
   ↓
3. x.ts uploadMedia() function:
   a. Read PNG file from disk
   b. Convert to base64
   c. OAuth 1.0a sign request to Twitter API
   d. POST to https://upload.twitter.com/1.1/media/upload.json
   e. Get media_id back
   ↓
4. x.ts postTweet() attaches media_id to tweet
   ↓
5. X displays tweet + image
```

---

## Alternative: Text-Only Posts (if media keeps failing)

If after trying the fix above media still fails, the system gracefully falls back:

**Current behavior:**
- Image tries to upload
- If fails, skips media
- **Tweet still posts as text-only** ✅

**For production, you probably want images**, so fix the permissions as described above.

---

## Success Signal in Logs

Once fixed, your `logs/autopost-hourly.log` should show:

```
[2026-01-25 21:15:08] [RUN] Attempt 1/3: X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
[2026-01-25 21:15:20] 🎨 Generating image: "CUBA ACUSA A EEUU..."
[2026-01-25 21:15:35] ✅ Image ready: out/images/news-20260125T211535.rg.png
[2026-01-25 21:15:37] ✅ Media uploaded: 1234567890123456789
[2026-01-25 21:15:40] ✅ Thread posted successfully!
[2026-01-25 21:15:40] [SUCCESS] Autopost cycle completed successfully
[2026-01-25 21:15:40] [CYCLE] Waiting 3600s until next cycle...
```

---

## Summary

| Step | Status | Action |
|---|---|---|
| Image generation | ✅ Working | None |
| Logo overlay | ✅ Working | None |
| Text posting | ✅ Working | None |
| **Media upload** | ❌ 401 | Change X app to "Read and Write" |
| Hourly automation | ✅ Ready | Will work once media is fixed |

---

**Once media upload is working, system is 100% production-ready.** 🚀

No code changes needed. Just X app permissions.
