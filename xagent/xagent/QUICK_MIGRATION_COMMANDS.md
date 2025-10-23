# ⚡ QUICK MIGRATION COMMANDS

## 🎯 **TL;DR - Just run this:**

```bash
# Apply all new migrations
supabase db push
```

---

## 📋 **WHAT GETS APPLIED**

Two new migrations from today:
1. ✅ `20250119000000_autonomous_agents.sql` (5 tables)
2. ✅ `20250119100000_collective_learning.sql` (3 tables)

---

## ✅ **VERIFICATION**

After running `supabase db push`, check in Supabase Dashboard:

**Table Editor → Should see 8 new tables:**
- agent_schedules
- system_events
- agent_goals
- goal_progress
- customer_journeys
- collective_learnings
- agent_learning_profiles
- learning_application_log

**All with green checkmarks ✅**

---

## 🚀 **THEN START YOUR APP**

```bash
npm run dev
```

**Watch console for:**
```
🧠 Collective Learning System initialized
🤖 Autonomous Scheduler initialized
📡 Agent Event Bus initialized
🎯 Goal Manager initialized
```

**Done!** All agents now:
- Learn automatically ✅
- Share knowledge ✅
- Run autonomously ✅
- React to events ✅

---

## 🆘 **IF YOU DON'T HAVE SUPABASE CLI**

### **Manual Application:**

1. **Go to:** https://app.supabase.com → Your Project → SQL Editor

2. **Run Migration 1:**
   - Copy all contents of: `supabase/migrations/20250119000000_autonomous_agents.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for ✅ Success

3. **Run Migration 2:**
   - Copy all contents of: `supabase/migrations/20250119100000_collective_learning.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for ✅ Success

4. **Verify:**
   - Check Table Editor
   - Should see 8 new tables

5. **Done!**
   - Start your app: `npm run dev`

---

## 🎉 **THAT'S ALL!**

**Two migrations → Complete agentic AI system with collective intelligence!** 🚀


