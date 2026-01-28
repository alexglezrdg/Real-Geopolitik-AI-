#!/bin/bash
# Install cron entry for autopost-hourly

CRON_CMD='0 * * * * export X_LIVE=1 IMAGE_LIVE=1 && cd "/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost" && ./scripts/autopost-hourly.sh >> logs/cron.log 2>&1'

# Add to crontab if not already there
(crontab -l 2>/dev/null || true; echo "$CRON_CMD") | sort | uniq | crontab -

# Verify
echo "✅ Cron entry installed"
crontab -l | grep autopost
