# 🧪 Test Real Booking Functionality

## Prerequisites
1. ✅ Backend running: `python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`
2. ✅ Frontend running: `npm run dev`
3. ✅ Playwright installed: `playwright install chromium`
4. ✅ OpenAI API key configured
5. ✅ Embeddings fixed (model: `text-embedding-ada-002`)

---

## Test 1: Simple Action Detection (HR Agent)

### Input:
Open HR Agent and type:
```
Search for flights from New York to London
```

### Expected Behavior:
```
1. Agent logs: "🌐 Detected action-required task: research"
2. Agent logs: "🚀 Triggering browser automation for real execution..."
3. Backend opens Chrome browser (visible)
4. Browser navigates to Google Flights
5. Fills in: Origin = "New York", Destination = "London"
6. Captures screenshots
7. Returns real flight data with prices
```

### Expected Response Format:
```markdown
✅ **Action Completed Successfully!**

**Website Used:** https://www.google.com/travel/flights

**Steps Completed:**
1. FALLBACK: No tool available for task
2. Browser initialized and page created
3. Search query: 'best flight booking sites new york to london'
4. Found 10 potential sites
5. Selected: Google Flights - Best site for flight searches
6. Navigated to https://www.google.com/travel/flights
7. Step 1: Fill origin city
8. Step 2: Fill destination city
9. Step 3: Click search button
10. Step 4: Extract flight details

**Result Details:**
```json
{
  "flights": [...],
  "prices": [...],
  "airlines": [...]
}
```

📸 **Screenshots captured:** 5
```

---

## Test 2: Real Booking Intent (HR Agent)

### Input:
```
Book a premium flight from San Francisco to Tokyo on 2025-12-25
```

### Expected Behavior:
```
1. Agent detects: "book" + "flight" + "premium" = 0.9 confidence
2. Extracts parameters:
   - origin: "San Francisco"
   - destination: "Tokyo"  
   - date: "2025-12-25"
   - class: "premium"
3. Browser automation activates
4. Searches best booking site
5. Automates booking flow
6. Asks for approval before payment
```

### Expected Response:
```markdown
✅ **Action Completed Successfully!**

**Website Used:** https://www.google.com/travel/flights

**Steps Completed:**
1. Navigated to flight booking site
2. Filled origin: San Francisco
3. Filled destination: Tokyo
4. Selected date: December 25, 2025
5. Selected class: Premium Economy
6. Searched for flights
7. Found 8 flight options
8. Extracted pricing and details

**Result Details:**
{
  "cheapest_flight": {
    "airline": "United Airlines",
    "price": "$1,245",
    "departure": "10:30 AM",
    "arrival": "3:45 PM +1",
    "duration": "11h 15m",
    "stops": "Non-stop"
  },
  "all_options": [...]
}

📸 **Screenshots captured:** 7

💡 **Next Step:** Would you like me to proceed with booking the cheapest option ($1,245)?
```

---

## Test 3: TravelAgent (Specialized)

### Setup:
1. Go to Agent Management
2. Create new agent:
   - Name: "Travel Expert"
   - Type: **travel** (important!)
   - Description: "Expert travel booking agent"

### Input:
```
Compare flight prices from London to Dubai next week
```

### Expected Behavior:
```
1. TravelAgent activates (logs: "✈️ TravelAgent processing...")
2. Searches multiple sites (Google Flights, Kayak, Expedia)
3. AI selects best sites for comparison
4. Opens browsers for each site (parallel)
5. Extracts prices from all sites
6. Returns comprehensive comparison
```

### Expected Response:
```markdown
✅ **Travel Booking Completed Successfully!**

**Price Comparison Results:**

| Site | Best Price | Airline | Duration | Stops |
|------|-----------|---------|----------|-------|
| Google Flights | $645 | Emirates | 7h 10m | Non-stop |
| Kayak | $658 | Emirates | 7h 10m | Non-stop |
| Expedia | $672 | Emirates | 7h 10m | Non-stop |

**Recommendation:** Book via Google Flights ($645) - Lowest price for same flight

**Next Steps:**
1. Click to proceed with booking
2. I'll guide you through the checkout process
3. All details will be stored in memory

📸 **Screenshots captured:** 12 (4 per site)
```

---

## Test 4: Multi-Step Complex Task

### Input:
```
I need to:
1. Find hotels in Paris under $150/night
2. Check availability for March 15-20
3. Book the highest rated one
```

### Expected Behavior:
```
1. Agent breaks down into steps
2. Searches booking.com or similar
3. Applies filters: location=Paris, price<$150, dates=Mar 15-20
4. Sorts by rating
5. Selects top hotel
6. Shows booking details
7. Asks for approval
```

---

## Debugging Tips

### If browser doesn't open:
```bash
# Check Playwright installation
playwright install chromium

# Check backend logs for errors
# Look for: "✅ Playwright browser initialized"
```

### If getting mock data instead:
```bash
# Check these logs in backend:
# Should see: "🌐 FALLBACK ACTIVATED: No tool available for 'task'"
# Should NOT see: "Using mock automation"

# Check frontend logs:
# Should see: "🌐 Detected action-required task: booking"
# Should see: "🚀 Triggering browser automation..."
```

### If embeddings failing:
```bash
# Check: model should be "text-embedding-ada-002"
# NOT: "text-embedding-ada-002-v2" (doesn't exist!)

# Frontend console should show:
# "🔍 [EMBEDDINGS] Response status: 200" ✅
# NOT: "500 Internal Server Error" ❌
```

---

## Success Metrics

### ✅ Real Functionality Working:
- [ ] Browser opens visibly during automation
- [ ] Real websites are accessed (not mock)
- [ ] Screenshots are captured
- [ ] Real data is extracted (prices, availability)
- [ ] Results stored in memory
- [ ] Learning patterns are recorded
- [ ] No "mock" or "simulated" messages

### ✅ AI Intelligence Working:
- [ ] Correct site is selected for task
- [ ] Parameters are extracted accurately
- [ ] Steps are executed in logical order
- [ ] Errors are handled gracefully
- [ ] User approval requested for payments

### ✅ Performance Metrics:
- [ ] Response time: < 30 seconds for simple tasks
- [ ] Browser automation: < 60 seconds
- [ ] Screenshot capture: Working
- [ ] Memory storage: Confirmed saved

---

## Common Issues & Solutions

### Issue: "Browser automation failed"
**Solution:** 
```bash
# Restart backend
# Check Playwright: playwright install chromium
# Verify OPENAI_API_KEY in .env
```

### Issue: "Still getting conversational responses"
**Solution:**
```typescript
// Check detectActionIntent in DirectExecutionAgent
// Should match keywords: "book", "search", "find", etc.
// Confidence should be > 0.7
```

### Issue: "Screenshots not captured"
**Solution:**
```python
# In browser_fallback_service.py
# Verify: screenshot_data = await page.screenshot(...)
# Check: screenshots array is populated
```

---

## Next Test: Create Permanent Tool

After successful browser automation:

### Expected:
```json
{
  "suggestedToolConfig": {
    "id": "flight_booking_google",
    "name": "Google Flights Booking",
    "description": "Book flights via Google Flights",
    "category": "travel",
    "provider": "google_flights",
    "skills": [...]
  }
}
```

### Action:
1. Review suggested tool config
2. Upload to organization_tools table
3. Future bookings will use API instead of browser

---

## 🎉 Success!

When all tests pass, you have:
- ✅ **100% real functionality**
- ✅ **No mock data**
- ✅ **Production-ready automation**
- ✅ **AI-powered intelligence**
- ✅ **Learning system active**

**Your agent system is now more powerful than any competitor!** 🚀




