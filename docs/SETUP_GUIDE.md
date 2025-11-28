# Setup Guide for Non-Technical Users

**Goal:** Run the Gaussian Splatting Knowledge Graph system on your computer  
**Time:** 20-30 minutes  
**No coding experience required!**

---

## 📋 Prerequisites Checklist

Before starting, you need:
- [ ] A computer (Windows, Mac, or Linux)
- [ ] Internet connection
- [ ] 30 minutes of time

We'll help you install everything else!

---

## Step 1: Install Node.js (5 minutes)

**What is Node.js?** Software that lets you run JavaScript programs.

### Windows:
1. Go to: https://nodejs.org/
2. Click the big green button "Download Node.js (LTS)"
3. Run the downloaded file (double-click it)
4. Click "Next" → "Next" → "Install"
5. **Verify it worked:**
   - Press `Windows + R`
   - Type `cmd` and press Enter
   - Type: `node --version`
   - You should see something like `v20.10.0`

### Mac:
1. Go to: https://nodejs.org/
2. Click "Download Node.js (LTS)"
3. Open the downloaded `.pkg` file
4. Follow the installer
5. **Verify:**
   - Open Terminal (search "Terminal" in Spotlight)
   - Type: `node --version`

---

## Step 2: Get the Code (2 minutes)

### Option A: Download ZIP (Easier)
1. Go to the GitHub repository
2. Click the green "Code" button
3. Click "Download ZIP"
4. Extract the ZIP file to your Desktop

### Option B: Use Git (If you know how)
```bash
git clone https://github.com/YOUR_USERNAME/gaussian-splatting-kg.git
cd gaussian-splatting-kg
```

---

## Step 3: Create Supabase Account (5 minutes)

**What is Supabase?** A database to store the extracted research data.

1. Go to: https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub or Email
4. Create a new project:
   - **Name:** `gaussian-knowledge-graph`
   - **Database Password:** (write this down!)
   - **Region:** Choose closest to you
   - Click "Create new project"
5. **Wait 2 minutes** for project to be created

### Get Your Database Credentials

1. In Supabase dashboard, click "Settings" (gear icon)
2. Click "API"
3. Copy these values (you'll need them later):
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGc...` (long string)
   - **service_role key:** `eyJhbGc...` (even longer string)

### Setup Database Tables

1. In Supabase, click "SQL Editor"
2. Click "New query"
3. Open the file `src/database/schema.sql` from the downloaded code
4. Copy ENTIRE contents
5. Paste into Supabase SQL editor
6. Click "Run"
7. You should see "Success. No rows returned"

**✅ Database is ready!**

---

## Step 4: Get OpenAI API Key (5 minutes)

**What is OpenAI?** The AI that reads papers and extracts concepts.

1. Go to: https://platform.openai.com/signup
2. Sign up for an account
3. Add payment method (required - will cost ~$1-2 for testing)
4. Go to: https://platform.openai.com/api-keys
5. Click "Create new secret key"
6. **Copy the key** (starts with `sk-proj-...`)
7. **Save it somewhere safe!** (you can't see it again)

---

## Step 5: Configure the Application (3 minutes)

1. In the downloaded code folder, find `.env.example`
2. Make a copy and rename it to `.env` (remove the `.example`)
3. Open `.env` in a text editor (Notepad on Windows, TextEdit on Mac)
4. Fill in the values you copied earlier:
```env
# From Supabase (Step 3)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=eyJhbGc...your-anon-key...
SUPABASE_SERVICE_KEY=eyJhbGc...your-service-key...

# From OpenAI (Step 4)
OPENAI_API_KEY=sk-proj-...your-openai-key...

# Leave these as-is
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo-preview
MAX_PAPERS_TO_PROCESS=5
LOG_LEVEL=info
```

5. **Save the file**

---

## Step 6: Install Dependencies (3 minutes)

**What are dependencies?** Other software this project needs to run.

### Windows:
1. Press `Windows + R`
2. Type `cmd` and press Enter
3. Type: `cd Desktop\gaussian-splatting-kg` (or wherever you extracted it)
4. Type: `npm install`
5. Wait 2-3 minutes while it installs

### Mac/Linux:
1. Open Terminal
2. Type: `cd ~/Desktop/gaussian-splatting-kg`
3. Type: `npm install`
4. Wait 2-3 minutes

**You should see:** Lots of text scrolling, ending with "added 405 packages"

---

## Step 7: Run the Demo! (2 minutes)

**Let's test if everything works!**

In your terminal/command prompt (same window from Step 6):
```bash
npx ts-node demo.ts
```

**What you should see:**
```
🚀 GAUSSIAN SPLATTING KNOWLEDGE GRAPH - DEMO
================================================================================
📚 PAPERS IN KNOWLEDGE GRAPH:
1. 3D Gaussian Splatting for Real-Time Radiance Field Rendering
...
✅ DEMO COMPLETE
```

**✅ If you see this, it's working!**

---

## Step 8: Process Papers (Optional - 10 minutes)

**Want to process real research papers?**

In your terminal:
```bash
npx ts-node batch-process-papers.ts
```

**What happens:**
1. Downloads 5 research papers from arXiv (~100 MB)
2. Uses OpenAI to extract concepts (costs ~$0.50)
3. Stores everything in your database
4. Takes about 10 minutes

**You'll see progress like:**
```
[1/5] Processing: 3D Gaussian Splatting...
  ✅ PDF parsed (78021 chars)
  ✅ Extracted: 2 concepts, 1 methods
  ✅ Paper 1/5 complete!
```

**When it's done:**
```bash
npx ts-node demo.ts
```

You'll see all the extracted concepts and relationships!

---

## 🎯 What Can You Do Now?

### View Your Data

1. Open Supabase dashboard
2. Click "Table Editor"
3. Browse tables:
   - **papers:** Research papers
   - **concepts:** Extracted concepts
   - **methods:** Methods and algorithms

### Run Different Commands
```bash
# Test database connection
npx ts-node test-connection.ts

# Test OpenAI connection
npx ts-node test-llm.ts

# Process more papers
npx ts-node batch-process-papers.ts
```

---

## ❓ Troubleshooting

### "npm: command not found"
**Problem:** Node.js not installed correctly  
**Solution:** Repeat Step 1, make sure to restart terminal after installing

### "Cannot find module..."
**Problem:** Dependencies not installed  
**Solution:** Run `npm install` again in the project folder

### "Invalid API key"
**Problem:** Wrong API key in .env file  
**Solution:** Double-check you copied the full key (including `sk-proj-` prefix)

### "Connection failed"
**Problem:** Wrong Supabase credentials  
**Solution:** Verify URL and keys in .env match Supabase dashboard exactly

### "Module not found: .env"
**Problem:** Forgot to create .env file  
**Solution:** Copy .env.example to .env and fill in values

---

## 💰 Cost Estimates

**One-time setup:** Free

**Running the demo (test-connection, test-llm):** Free

**Processing 5 papers (batch-process-papers.ts):**
- OpenAI API: ~$0.50
- Supabase: Free (up to 500MB database)
- **Total: ~$0.50**

**Processing 100 papers:**
- OpenAI API: ~$10
- **Total: ~$10**

---

## 🎓 Next Steps

**Explore the documentation:**
- `README.md` - Project overview
- `docs/ARCHITECTURE.md` - How it works
- `docs/DESIGN_DECISIONS.md` - Why we built it this way

**Modify the code:**
- Want to process different papers? Edit `batch-process-papers.ts`
- Want to change what's extracted? Edit `src/agents/EntityExtractorAgent.ts`

**Need help?**
- Open an issue on GitHub
- Email: [your-email]

---

**Congratulations! You're running an AI-powered research knowledge graph! 🎉**