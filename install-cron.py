#!/usr/bin/env python3
import subprocess
import sys

cron_cmd = '0 * * * * export X_LIVE=1 IMAGE_LIVE=1 && cd "/Users/alexgonzalez/Youtube WorkSpace/geopolitik-x-autopost" && ./scripts/autopost-hourly.sh >> logs/cron.log 2>&1'

try:
    # Get current crontab
    result = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
    current_cron = result.stdout if result.returncode == 0 else ""
    
    # Add new entry if not already there
    if 'autopost-hourly' not in current_cron:
        new_cron = current_cron + "\n" + cron_cmd + "\n"
        # Set new crontab
        process = subprocess.Popen(['crontab', '-'], stdin=subprocess.PIPE, text=True)
        process.communicate(input=new_cron)
        
        print("✅ Cron entry installed")
        
        # Verify
        result = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
        for line in result.stdout.split('\n'):
            if 'autopost-hourly' in line:
                print(f"   {line}")
    else:
        print("✅ Cron entry already exists")
        result = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
        for line in result.stdout.split('\n'):
            if 'autopost-hourly' in line:
                print(f"   {line}")
                
except Exception as e:
    print(f"❌ Error: {e}", file=sys.stderr)
    sys.exit(1)
