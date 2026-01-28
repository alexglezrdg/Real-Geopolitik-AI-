# GitHub Actions Autopost Setup

The bot can run automatically every hour via GitHub Actions, even when your PC is off.

## Quick Setup

### 1. Push to GitHub

```bash
git add .github/workflows/autopost.yml
git commit -m "Add GitHub Actions autopost workflow"
git push
```

### 2. Add Secrets to GitHub

Go to your repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 5 secrets:

| Secret Name | Description |
|-------------|-------------|
| `X_CONSUMER_KEY` | Twitter API Consumer Key |
| `X_CONSUMER_SECRET` | Twitter API Consumer Secret |
| `X_ACCESS_TOKEN` | Twitter Access Token |
| `X_ACCESS_TOKEN_SECRET` | Twitter Access Token Secret |
| `ANTHROPIC_API_KEY` | Claude API Key |

### 3. Enable the Workflow

Go to **Actions** tab → Click on **Geopolitik Autopost** → **Enable workflow**

## How It Works

- **Schedule**: Runs every hour at minute 15 (`:15`)
- **Concurrency**: Only one run at a time (prevents duplicates)
- **Cache**: Post history is cached between runs to prevent re-posting
- **Manual trigger**: You can run it anytime from Actions → Run workflow

## Verify It's Working

1. Go to **Actions** tab
2. Click **Run workflow** → **Run workflow** (manual test)
3. Watch the logs to confirm successful execution

## Adjust Schedule

Edit `.github/workflows/autopost.yml` to change the cron schedule:

```yaml
schedule:
  - cron: '15 * * * *'   # Every hour at :15
  # - cron: '0 */2 * * *'  # Every 2 hours
  # - cron: '0 8,14,20 * * *'  # 8am, 2pm, 8pm
```

## Notes

- GitHub Actions free tier: 2,000 minutes/month (plenty for hourly runs)
- Each run takes ~1-2 minutes
- Post history is preserved via GitHub Actions cache
