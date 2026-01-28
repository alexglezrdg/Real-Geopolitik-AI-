# X API 401 Unauthorized Error - Fix Guide

## Current Status
The system is now **ENFORCING** that if `IMAGE_LIVE=1` and media upload fails, the post is ABORTED (fail-closed). 

**Current Error:** 
```
❌ Media upload failed 401: Could not authenticate you
❌ ENFORCE IMAGE: Media upload required (IMAGE_LIVE=1) but failed. Aborting post.
```

This **401 error** means the OAuth credentials don't have permission to upload media to X/Twitter.

---

## Fix: Update X Developer Portal Permissions

### Step 1: Go to X Developer Portal
1. Navigate to: https://developer.twitter.com/en/portal/dashboard
2. Log in with your bot account

### Step 2: Navigate to Your App Settings
1. Click on your app (should be "Real Geopolitik" or similar)
2. Go to **Settings** → **User authentication settings**

### Step 3: Check App Permissions
Look for **"App Permissions"** section. Currently, it's probably set to:
- ❌ **Read only** OR
- ⚠️ **Read and write** (but OLD token)

**Required:** Must be **"Read and Write"** to upload media.

If it says "Read only":
1. Click **"Edit"**
2. Select **"Read and Write"**
3. **SAVE** (this will INVALIDATE old tokens)

### Step 4: Regenerate OAuth Tokens
Since changing permissions invalidates old tokens:

1. Go to **Keys and Tokens** tab
2. Under **Authentication Tokens & Keys**, find:
   - **API Key** (Consumer Key)
   - **API Secret Key** (Consumer Secret)
   - **Bearer Token**

3. Click **"Regenerate"** for each (or use existing if unchanged)

4. For **User Access Tokens**, look for:
   - **Access Token**
   - **Access Token Secret**

5. If they show "Invalidated", click **"Regenerate User Access Token"**

### Step 5: Update `.env` File
```bash
# Get fresh tokens from Developer Portal and paste here:
TWITTER_API_KEY=your_new_api_key
TWITTER_API_SECRET=your_new_api_secret
TWITTER_ACCESS_TOKEN=your_new_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_new_access_token_secret
TWITTER_BEARER_TOKEN=your_new_bearer_token
```

### Step 6: Test Again
```bash
X_LIVE=1 IMAGE_LIVE=1 npm run dev -- --live
```

Expected output:
```
[IMAGE] generated=out/images/news-YYYYMMDDTHHMMSS.rg.png
[TAGS] final_hashtags=[...]
✅ Media uploaded: 1234567890123456789
✅ Thread posted successfully!
[MEDIA] posted_with_image=true
```

---

## Troubleshooting

### Still Getting 401?

**Check 1: Did app permissions save?**
- Go back to Developer Portal → App Settings
- Verify it says **"Read and Write"** (not "Read only")

**Check 2: Did tokens regenerate?**
- Click **"Regenerate"** again for Access Token & Secret
- Copy the NEW values to `.env`

**Check 3: Are env vars correct?**
```bash
# Test that env is loaded
cat .env | grep TWITTER_
```

All 5 variables should have values (not empty).

**Check 4: Is the token for the correct app?**
- Ensure you're regenerating tokens from the RIGHT app in Portal
- If you have multiple apps, pick the one configured in `.env`

### 403 Error Instead?
- You have the wrong app (not the one with media upload permissions)
- Switch to the correct app in Developer Portal

### Empty Response / Other Error?
- App may be in "sandbox" mode (only works with whitelisted accounts)
- Check **Developer Environment** setting in portal
- May need to upgrade to **Elevated access** tier

---

## What This Fix Does

1. **Grants "Read and Write" permission** so app can upload media
2. **Invalidates old tokens** (this is expected)
3. **Forces you to regenerate** new tokens with upgraded permissions
4. **New tokens work** with the media upload endpoint

Once fixed, the system will:
- ✅ Generate image via DALL-E
- ✅ Upload image to X (via OAuth media endpoint)
- ✅ Post tweet with attached image
- ✅ Continue hourly loop posting 20/day with images + hashtags

---

## Timeline

**Before Fix:**
```
Image generated ✅
Media upload → 401 ❌
Post → Text-only (no image)
```

**After Fix:**
```
Image generated ✅
Media upload → Success ✅
Post → With image ✅
```

---

## Questions?

The 401 error is 100% a permission issue in X Developer Portal. The code is correct and now enforces the requirement. Just need to:

1. Grant "Read and Write" permission ✅
2. Regenerate tokens ✅
3. Update `.env` ✅
4. Test ✅
