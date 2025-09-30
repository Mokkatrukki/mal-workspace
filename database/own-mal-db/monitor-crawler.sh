#!/bin/bash

echo "🔍 Crawler Monitoring Dashboard"
echo "================================"

# Check if crawler process is running
if pgrep -f "crawler:resume" > /dev/null; then
    echo "✅ Crawler is RUNNING (PID: $(pgrep -f 'crawler:resume'))"
else
    echo "❌ Crawler is NOT running"
fi

echo ""
echo "📊 Current Status:"
npm run crawler:status

echo ""
echo "📝 Recent Log Output (last 20 lines):"
echo "------------------------------------"
if [ -f "crawler-final-mega-run.log" ]; then
    tail -20 crawler-final-mega-run.log
elif [ -f "crawler-mega-run.log" ]; then
    tail -20 crawler-mega-run.log
else
    echo "Log file not found yet..."
fi

echo ""
echo "💡 Commands:"
echo "  - Watch live: tail -f crawler-final-mega-run.log"
echo "  - Check status: npm run crawler:status"
echo "  - Stop crawler: pkill -f 'crawler:resume'"
echo "  - Database stats: npx tsx src/scripts/checkTVSpecial.ts" 