# 🧪 **RAG TESTING GUIDE - Step-by-Step**

## 🎯 **WHAT WE'RE TESTING:**

1. ✅ RAG activates for all agents
2. ✅ Vector search finds relevant documents
3. ✅ Knowledge graph discovers relationships
4. ✅ Memory retrieves past interactions
5. ✅ Conversation is summarized (token optimization)
6. ✅ Agent responses are contextual and accurate

---

## 🚀 **QUICK START (5 Minutes):**

### **Step 1: Start the Application**

```bash
# In the project directory:
npm run dev
```

**Expected output:**
```
VITE v4.5.14  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### **Step 2: Open Browser**

Navigate to: `http://localhost:5173`

You should see the XAgent dashboard.

### **Step 3: Login**

Use your credentials to login (or sign up if first time).

### **Step 4: Go to Chat**

Click on **"Chat"** in the sidebar.

### **Step 5: Select an Agent**

From the agent dropdown, select **"HR Assistant"** (or any agent).

### **Step 6: Ask a Simple Question**

Type: `"What can you help me with?"`

**Expected: Agent responds normally (no RAG needed for this question)**

---

## 📚 **FULL RAG TEST (15 Minutes):**

### **TEST 1: Vector Search (Document Retrieval)**

#### **Setup:**
1. Go to **"Documents"** page
2. Upload a test document (PDF, DOCX, or TXT)
   - Example: Create `company_policies.txt` with content:
     ```
     VACATION POLICY
     All full-time employees receive 15 days of annual leave per year.
     Part-time employees receive pro-rated leave based on hours worked.
     Leave must be requested at least 2 weeks in advance.
     
     REMOTE WORK POLICY
     Employees may work remotely up to 3 days per week.
     Manager approval is required for remote work arrangements.
     ```
3. Wait for "✅ Document processed successfully"

#### **Test:**
1. Go back to **Chat**
2. Select **HR Assistant**
3. Ask: `"What's the vacation policy?"`

#### **Expected Console Output:**
```
🧠 Using RAG-powered response for agent: 2
🔍 Loading agent instance: 2
✅ Agent instance created and cached: 2 (hr)
🧠 Building RAG context for: "What's the vacation policy?"
✅ RAG Context built: {
  vectorResults: 1,
  graphNodes: 0,
  memories: 0,
  tokenSavings: 0
}
💬 Generating RAG-powered response...
✅ RAG-powered response generated (0 tokens saved)
💾 Interaction stored for future RAG retrieval
```

#### **Expected Response:**
Agent should reference the document content:
```
"Based on our company policies, all full-time employees 
receive 15 days of annual leave per year. Part-time 
employees receive pro-rated leave. You'll need to 
request leave at least 2 weeks in advance."
```

✅ **PASS**: If response includes document content
❌ **FAIL**: If response is generic without document reference

---

### **TEST 2: Memory Retrieval (Past Interactions)**

#### **Test:**
1. In the same chat, ask: `"What did I just ask you about?"`

#### **Expected Console Output:**
```
🧠 Building RAG context for: "What did I just ask you about?"
✅ RAG Context built: {
  vectorResults: 1,
  graphNodes: 0,
  memories: 1,     ← Memory found!
  tokenSavings: 150
}
```

#### **Expected Response:**
```
"You just asked me about our vacation policy."
```

✅ **PASS**: If agent remembers previous question
❌ **FAIL**: If agent doesn't remember

---

### **TEST 3: Token Optimization (Conversation Summarization)**

#### **Setup:**
Have a longer conversation (6+ messages):

1. `"Tell me about vacation policy"`
2. `"How do I request leave?"`
3. `"What about remote work?"`
4. `"Can I work from home 4 days a week?"`
5. `"What's the approval process?"`
6. `"Do I need manager approval?"`

#### **Expected Console Output:**
```
🧠 Building RAG context for: "Do I need manager approval?"
✅ RAG Context built: {
  vectorResults: 1,
  graphNodes: 0,
  memories: 5,
  tokenSavings: 2400  ← Token savings!
}
💬 Generating RAG-powered response...
✅ RAG-powered response generated (2400 tokens saved)
```

✅ **PASS**: If tokenSavings > 0 after 6+ messages
❌ **FAIL**: If tokenSavings = 0

---

### **TEST 4: Multi-Agent RAG**

#### **Test Different Agents:**

**4a. Finance Assistant:**
1. Switch to **Finance Assistant**
2. Upload a finance document (budget, expense policy)
3. Ask: `"What's our expense reimbursement policy?"`

**Expected:** Finance agent uses RAG to find answer in document

**4b. Knowledge Agent:**
1. Switch to **Knowledge Agent**
2. Upload a technical document
3. Ask: `"Explain [topic from document]"`

**Expected:** Knowledge agent uses RAG to explain from document

✅ **PASS**: All agents use RAG
❌ **FAIL**: Only some agents use RAG

---

## 🔍 **CONSOLE MONITORING:**

### **Open Browser DevTools:**

**Chrome/Edge:**
- Press `F12` or `Ctrl+Shift+I`
- Go to **Console** tab

**Firefox:**
- Press `F12` or `Ctrl+Shift+K`
- Go to **Console** tab

### **What to Look For:**

#### **✅ GOOD SIGNS (RAG Working):**
```
🧠 Using RAG-powered response for agent: X
🔍 Loading agent instance: X
✅ Agent instance created and cached: X
🧠 Building RAG context for: "..."
✅ RAG Context built: { vectorResults: X, ... }
💬 Generating RAG-powered response...
✅ RAG-powered response generated (X tokens saved)
💾 Interaction stored for future RAG retrieval
```

#### **⚠️ WARNING SIGNS (Fallback Used):**
```
⚠️ Using basic fallback (no RAG, no history)
```

#### **❌ ERROR SIGNS:**
```
❌ Error loading agent instance
❌ RAG context building error
❌ Vector search error
```

---

## 📊 **ADVANCED TESTING:**

### **TEST 5: Knowledge Graph (Entity Relationships)**

#### **Setup:**
1. Upload multiple related documents:
   - `employees.txt`: "John Doe works in Marketing"
   - `departments.txt`: "Marketing department handles brand strategy"
   - `projects.txt`: "Brand refresh project led by Marketing"

2. Wait for all documents to be processed

#### **Test:**
Ask: `"Tell me about Marketing department"`

#### **Expected:**
Agent should connect information from multiple documents using knowledge graph.

---

### **TEST 6: Multimodal RAG (Image + Text)**

#### **Setup:**
1. Upload an image with text (screenshot, invoice, form)
2. Wait for OCR processing

#### **Test:**
Ask: `"What's in the document I just uploaded?"`

#### **Expected:**
Agent extracts text from image and uses it in response.

---

### **TEST 7: Performance Testing**

#### **Test:**
1. Open browser DevTools → Network tab
2. Ask a question
3. Check timing

#### **Expected Timing:**
```
RAG Pipeline: ~500ms
LLM Response: ~2000ms
Total: ~2500ms
```

---

## 🎯 **SUCCESS CRITERIA:**

### **✅ MINIMUM (Must Pass):**
- [ ] Console shows "🧠 Using RAG-powered response"
- [ ] Agent references uploaded document content
- [ ] Token savings shown after 6+ messages
- [ ] All agent types work (HR, Finance, Knowledge)

### **✅ RECOMMENDED (Should Pass):**
- [ ] Memory retrieves past interactions
- [ ] Agent remembers conversation context
- [ ] Response quality improves with documents
- [ ] No errors in console

### **✅ ADVANCED (Nice to Have):**
- [ ] Knowledge graph connects related info
- [ ] Multimodal (image) processing works
- [ ] Performance under 3 seconds
- [ ] Token savings > 50%

---

## 🐛 **TROUBLESHOOTING:**

### **Problem: No RAG logs in console**

**Cause:** RAG not activating

**Fix:**
1. Check userId is passed: Look for `userId: effectiveUserId` in console
2. Verify agent has ID: Agent should have `id` property
3. Check database: Agent must exist in `agents` table

### **Problem: "Agent not found" error**

**Cause:** Agent doesn't exist in database

**Fix:**
1. Go to Agent Builder
2. Create a new agent or verify existing agent
3. Note the agent ID
4. Try again

### **Problem: No vector results**

**Cause:** Document not vectorized or Pinecone not configured

**Fix:**
1. Check environment: `VITE_PINECONE_API_KEY` set?
2. Re-upload document
3. Wait for processing (check Documents page)

### **Problem: "OpenAI not configured" error**

**Cause:** Missing OpenAI API key

**Fix:**
1. Create `.env` file in root
2. Add: `VITE_OPENAI_API_KEY=your-key-here`
3. Restart dev server

### **Problem: Token savings = 0**

**Cause:** Conversation too short

**Fix:**
- Have at least 6 messages in conversation
- Token optimization only kicks in after 4+ messages

---

## 📝 **TEST CHECKLIST:**

```
Basic RAG Test:
[ ] 1. Start application (npm run dev)
[ ] 2. Login to system
[ ] 3. Upload a document
[ ] 4. Ask question about document
[ ] 5. Verify agent uses document in response
[ ] 6. Check console for RAG logs

Memory Test:
[ ] 7. Have multi-turn conversation
[ ] 8. Ask "What did I ask before?"
[ ] 9. Verify agent remembers

Token Optimization Test:
[ ] 10. Have 6+ message conversation
[ ] 11. Check console for token savings
[ ] 12. Verify savings > 0

Multi-Agent Test:
[ ] 13. Test HR Assistant with RAG
[ ] 14. Test Finance Assistant with RAG
[ ] 15. Test Knowledge Agent with RAG
[ ] 16. Verify all work consistently
```

---

## 🎉 **EXPECTED RESULTS:**

### **✅ If Everything Works:**

```
Console Output:
- "🧠 Using RAG-powered response" ✅
- "✅ RAG Context built" ✅
- "✅ RAG-powered response generated (X tokens saved)" ✅
- No errors ✅

Agent Behavior:
- References uploaded documents ✅
- Remembers past conversation ✅
- Provides contextual responses ✅
- Optimizes tokens automatically ✅

Performance:
- Response time < 3 seconds ✅
- Token savings 50-80% ✅
- No lag or delays ✅
```

**🎊 RAG IS FULLY FUNCTIONAL!**

---

## 📞 **QUICK TEST COMMANDS:**

### **Terminal 1: Start App**
```bash
npm run dev
```

### **Terminal 2: Check Logs**
```bash
# Watch for RAG logs in real-time
# (Browser console is better, but if you want server logs:)
tail -f logs/app.log
```

---

## 🚀 **NEXT STEPS AFTER TESTING:**

1. **If tests pass:** Deploy to production!
2. **If tests fail:** Check troubleshooting guide
3. **Want to improve:** Fine-tune RAG parameters
4. **Need help:** Check `RAG_WIRED_ALL_AGENTS_COMPLETE.md`

---

## 💡 **PRO TIPS:**

1. **Use Real Documents:** Test with actual company documents for best results
2. **Multiple Documents:** Upload 3-5 related documents to test knowledge graph
3. **Long Conversations:** Have 10+ message conversations to see full token optimization
4. **Different Agents:** Test all agent types to verify consistency
5. **Monitor Performance:** Keep an eye on response times
6. **Check Memory:** Ask "What did we discuss?" periodically

---

**HAPPY TESTING!** 🎉

Your RAG-powered multi-agent platform is ready to impress! 🚀

