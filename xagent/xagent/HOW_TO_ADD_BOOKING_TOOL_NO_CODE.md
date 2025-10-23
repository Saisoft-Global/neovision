# ✅ Add Booking Tool - ZERO CODING Required!

## 🎯 **What You Get:**

After following these steps, your agents will **automatically**:
- ✅ Search for flights when user asks
- ✅ Search for hotels when user needs accommodation
- ✅ Create complete itineraries from conversation history
- ✅ Book flights with user approval
- ✅ Check booking status
- ✅ Remember all travel preferences for future trips

**NO CODE CHANGES NEEDED!** Just upload a JSON file! 🎉

---

## 📋 **Step-by-Step Instructions (5 Minutes)**

### **Step 1: Get Amadeus API Key (Free Tier Available)**

1. Go to: https://developers.amadeus.com
2. Sign up for free account
3. Create a new app
4. Copy your API key (looks like: `AmadeusApiKey12345...`)

---

### **Step 2: Upload the Booking Tool JSON**

#### **Option A: Via UI (Recommended)**

1. **Open your app:** http://localhost:5173
2. **Navigate to:** Settings → Tools → Dynamic Tools
3. **Click:** "Upload Tool" button
4. **Select:** `booking-tool.json` (the file I just created in your project root)
5. **Enter API Key:** Paste your Amadeus API key when prompted
6. **Click:** "Register"

#### **Option B: Via JSON Editor**

1. **Open:** Settings → Tools → Dynamic Tools
2. **Click:** "New Tool" or JSON Editor
3. **Paste:** Contents of `booking-tool.json`
4. **Click:** "Register from Editor"

---

### **Step 3: Enable for Your Organization**

1. Go to: Organization Settings → Tools
2. Find: "Travel Booking Tool"
3. Click: "Enable"
4. Configure:
   - API Key: `{{AMADEUS_API_KEY}}`
   - Usage limits: (optional)
   - Allowed roles: All members

---

### **Step 4: Attach to Your Agent**

#### **Option A: Via UI**

1. Go to: Agents → Select any agent (e.g., Productivity Agent)
2. Click: "Manage Tools"
3. Select: "Travel Booking Tool"
4. Click: "Attach"

#### **Option B: Automatic**

If your agent has `auto_attach_tools: true` in config, it will automatically have access to all organization-enabled tools!

---

### **Step 5: TEST IT! 🎉**

**Open chat with any agent and say:**

```
"I want to visit Italy next month for 5 days"
```

**What happens automatically:**
```javascript
Agent thinks:
  🧠 Intent: travel planning
  🔍 Available skills: search_flights, search_hotels, create_itinerary
  ✅ Best skill: create_itinerary
  📊 Parameters from message:
     destination: "Italy"
     duration: 5 days
     startDate: "2025-11-20" (calculated "next month")
  
  🔄 Executing: create_itinerary
  
  💾 Also retrieving from memory:
     - User mentioned budget of $2000 (from last week)
     - User prefers boutique hotels (from past trip)
     - User is vegetarian (from previous chat)
  
Agent responds:
  "I've created a 5-day Italy itinerary for you!
  
  Based on your preferences:
  - Budget: $2000 (from our previous conversation)
  - Hotels: Boutique accommodations (you loved them in Paris!)
  - Restaurants: Vegetarian-friendly options
  
  Day 1: Rome - Colosseum, Vatican
  Day 2: Rome - Food tour (vegetarian)
  ...
  
  Shall I search for flights from Dubai to Rome?"
```

**Then say:**
```
"Yes, find me flights"
```

**Agent automatically:**
```javascript
  🧠 Intent: flight search
  ✅ Best skill: search_flights
  📊 Parameters:
     origin: "DXB" (from your profile/location)
     destination: "FCO" (Rome airport)
     departureDate: "2025-11-20"
     adults: 1
  
  🔄 Executing: search_flights
  
Agent responds:
  "I found 15 flights from Dubai to Rome:
  
  1. Emirates EK123 - $450 - Direct - 7h 30m
  2. Qatar QR456 - $380 - 1 stop - 9h 15m
  3. Etihad EY789 - $420 - Direct - 7h 45m
  
  Which one would you like to book?"
```

**Then say:**
```
"Book the first one"
```

**Agent automatically:**
```javascript
  🧠 Intent: flight booking
  ⚠️  Approval required!
  
Agent responds:
  "Before I book Emirates EK123, please confirm:
  
  Flight: EK123 Dubai → Rome
  Date: Nov 20, 2025
  Price: $450
  Passenger: [Your name from profile]
  
  Reply 'confirm' to proceed with booking."
```

**You say:**
```
"confirm"
```

**Agent automatically:**
```javascript
  ✅ Best skill: book_flight
  📊 Parameters:
     flightId: "EK123-offer-id"
     passengerInfo: {name, passport, contact} (from your profile)
     approved: true
  
  🔄 Executing: book_flight
  
  💾 Storing in memory:
     - Booking confirmation
     - Travel preferences
     - Payment method used
  
Agent responds:
  "✅ Flight booked successfully!
  
  Confirmation: PNR-ABC123
  Emirates EK123
  Dubai → Rome
  Nov 20, 2025, 10:30 AM
  
  I've stored this in memory. Would you like me to 
  search for hotels in Rome now?"
```

---

## 🎯 **Complete Workflow Example:**

### **User Journey (NO CODE!):**

```
User: "Plan a vacation for me"

Agent: 🧠 Analyzing...
       📚 Checking past conversations...
       💡 You mentioned wanting to visit Europe!
       
       "Based on our previous chats, you were interested in Europe.
       Where would you like to go? Italy? France? Spain?"

User: "Italy sounds great, 5 days next month"

Agent: 🧠 Intent: create_itinerary
       🔍 Skill: create_itinerary
       📊 Extracting parameters:
          destination: "Italy"
          duration: 5
          startDate: "2025-11-20"
       
       💾 Using memory:
          Budget: $2000 (from 2 weeks ago)
          Hotel preference: Boutique (from Paris trip)
          Diet: Vegetarian
       
       🔄 Creating itinerary...
       
       "I've created a 5-day Italy itinerary!
       Day 1: Rome - Colosseum...
       
       Shall I search for flights?"

User: "Yes"

Agent: 🧠 Intent: search_flights
       🔍 Skill: search_flights
       📊 Auto-extracting:
          origin: "DXB" (from user profile)
          destination: "FCO"
          date: "2025-11-20"
       
       🔄 Calling Amadeus API...
       
       "Found 15 flights. Top 3:..."

User: "Book the Emirates one"

Agent: 🧠 Intent: book_flight
       ⚠️  Approval workflow triggered
       
       "Before booking, please confirm:
       Emirates EK123 - $450
       Passenger: John Doe
       
       Reply 'confirm' to book."

User: "confirm"

Agent: 🧠 Intent: book_flight
       ✅ Approved: true
       🔍 Skill: book_flight
       
       🔄 Booking flight...
       💾 Storing confirmation...
       
       "✅ Booked! Confirmation: PNR-ABC123"
```

**Everything automatic!** Agent:
- ✅ Picked correct skills
- ✅ Extracted all parameters
- ✅ Called APIs
- ✅ Asked for approval
- ✅ Stored in memory
- ✅ Used RAG for preferences

**USER WROTE ZERO CODE!** 🎊

---

## 📊 **What You Need:**

### **Just These 3 Things:**

1. ✅ **JSON file** - `booking-tool.json` (I created it - it's in your project root)
2. ✅ **API key** - Free Amadeus account (5 minutes signup)
3. ✅ **Upload via UI** - Drag & drop (30 seconds)

**That's it!** No coding, no deployment, no server changes!

---

## 🎯 **Summary:**

### **ZERO Coding Required Because:**

✅ **Tool framework** - Already built  
✅ **JSON parser** - Already built  
✅ **Intent analyzer** - Already built (uses LLM)  
✅ **Skill selector** - Already built (AI-powered)  
✅ **Parameter extractor** - Already built (LLM extracts)  
✅ **API executor** - Already built  
✅ **Memory integration** - Already built  
✅ **RAG integration** - Already built  
✅ **Approval workflow** - Already built  
✅ **Error handling** - Already built  

### **You Just Need:**

1. **Upload JSON** - 30 seconds
2. **Add API key** - 1 minute
3. **Test** - Chat with agent

**Total time:** 5 minutes  
**Code required:** 0 lines  
**Result:** Full travel booking AI agent! ✈️

---

## 🚀 **Ready to Try?**

**I've created `booking-tool.json` in your project root.**

Next steps:
1. Get Amadeus API key (free)
2. Upload `booking-tool.json` via UI
3. Chat: "Plan a trip to Paris for me"
4. Watch the magic happen! ✨

**No coding required - your system handles everything!** 🎉


