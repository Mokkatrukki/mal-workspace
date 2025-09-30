# Anime Database Crawler Guide

Simple guide for using the interactive anime data crawler.

## Getting Started

**Start the crawler:**
```bash
npm run anime
```

You'll see a menu with 6 options. Here's what each does:

## Main Operations

### 1. Get more reviews for existing anime
**Use this to:** Add more reviews to anime that don't have enough

**How it works:**
- Finds anime with less than 50 reviews (you can change this)
- Prioritizes popular anime first (by member count)
- Makes real API calls to fetch reviews
- Shows progress: which anime, how many reviews added

**Example:**
```
How many anime to process? 50
Target reviews per anime? 50

[1/50] Processing: Attack on Titan
  Members: 3,123,456 | Current reviews: 23
  Fetching reviews for anime 16498...
  -> Added 27 new reviews
```

### 2. Add new anime to database
**Use this to:** Get basic anime data (titles, scores, genres) from Jikan API

**How it works:**
- Crawls anime by genre from Jikan API
- You specify: how many anime, genres, pages per genre
- Adds basic information to database (no reviews)

**Recommended settings:**
- New users: 1000 anime, 10 genres, 5 pages each
- Large database: 2000+ anime, 20 genres, 10 pages each

### 3. Get reviews for new anime
**Use this to:** Add reviews to anime that have zero reviews

**How it works:**
- Finds anime with 0 reviews
- Prioritizes popular anime first
- Fetches reviews with sentiment analysis

**Example:**
```
How many anime to process? 100
Reviews per anime? 50

Found 3,486 anime without reviews
[1/100] Processing: One Piece
  Members: 2,567,890 | Reviews: 0 -> targeting 50
  -> Added 50 reviews
```

### 4. Show detailed statistics
**Use this to:** See what's in your database

Shows:
- Total anime count
- Review distribution (how many anime have 0, 1-10, 11-30, etc. reviews)
- Most reviewed anime
- Database statistics

### 5. Reset crawler progress
**Use this to:** Start fresh if something goes wrong

Options:
- Reset anime crawler (clears anime crawling checkpoint)
- Reset review crawler (clears review crawling progress)
- Reset both

### 6. Exit
Quit the crawler

## Recommended Workflow

### First Time Setup (Empty Database)
```bash
npm run anime

# 1. Add basic anime data
Choose option 2
- Enter: 1000 (for ~1000 anime)
- Enter: 10 (for 10 genres)
- Enter: 5 (for 5 pages per genre)
- Wait ~30 minutes

# 2. Get reviews for popular anime
Choose option 3
- Enter: 200 (process 200 anime)
- Enter: 50 (target 50 reviews each)
- Wait ~2 hours

# 3. Expand review coverage
Choose option 1
- Enter: 300 (process 300 more anime)
- Enter: 50 (target 50 reviews each)
- Wait ~3 hours
```

### Regular Maintenance
```bash
npm run anime

# Check what you have
Choose option 4

# Add more reviews if needed
Choose option 1
- Enter: 100 (process 100 anime)
- Enter: 75 (increase target to 75 reviews)
```

## Progress Tracking

The crawler shows real-time progress:

```
Current Database State:
  Total anime: 16,457
  Anime with reviews: 5,918
  Total reviews: 111,383
  Average reviews per anime: 18.8
  Anime needing reviews: 3,486

Current Operation: Adding reviews to existing anime
  Processed: 25/100
  Errors: 2
  Runtime: 12m 34s
```

## Tips

1. **Start small**: Try 10-20 anime first to see how it works
2. **Popular anime first**: The crawler automatically prioritizes by member count
3. **Be patient**: API rate limiting means ~2-3 requests per second
4. **Monitor progress**: The screen updates show exactly what's happening
5. **Let it run**: You can minimize the terminal and let it work

## Common Questions

**Q: How long does it take?**
A: ~50 anime with reviews takes about 1 hour due to API rate limits

**Q: Can I stop and resume?**
A: Yes, the crawler saves progress. Just restart and it continues where it left off

**Q: What if I get errors?**
A: Normal to have some errors (anime without reviews, API timeouts). The crawler continues and shows error count

**Q: How do I know it's working?**
A: You'll see "Fetching page 1...", "Saved review 1/50...", etc. in real-time

**Q: Should I run this regularly?**
A: Yes, run option 1 weekly to keep adding reviews to your database

## Troubleshooting

**Problem: Shows 0 reviews added**
- Check if anime already has enough reviews
- Try with anime that have 0 reviews (option 3)

**Problem: Many errors**
- Normal for some anime to have no reviews available
- If >50% errors, check internet connection

**Problem: Slow progress**
- This is normal due to API rate limiting
- Don't try to speed it up, you'll get blocked

**Problem: Wants to start fresh**
- Use option 5 to reset progress
- Then start with option 2 to add anime data