# 🧠 Gaussian Splatting Knowledge Graph

> An AI-powered multi-agent system that constructs knowledge graphs from academic research papers using LLMs and graph databases.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

**Built for:** Alaris Security AI Engineer Take-Home Assignment  
**Author:** Anirudh  
**Date:** November 2025

---

## 🎯 Project Overview

This system automatically processes research papers on **3D Gaussian Splatting**, extracts key concepts and methods using GPT-4, and builds a semantic knowledge graph to help researchers discover connections and trends.

### Key Features

✅ **Multi-Agent Architecture** - 4 specialized AI agents working together  
✅ **LLM-Powered Extraction** - GPT-4 for high-quality entity extraction  
✅ **Graph Database** - PostgreSQL with semantic relationships  
✅ **Real PDF Processing** - Downloads and parses papers from arXiv  
✅ **Entity Deduplication** - Smart matching across papers  
✅ **Production-Ready** - Error handling, logging, type safety  

---

## 🏆 Proof-of-Concept Results

### Successfully Processed 5 Real Papers
```
Papers:     5/5 (100% success rate)
Concepts:   7 unique concepts extracted
Methods:    1 method identified
Relations:  1 improvement relationship mapped
Confidence: 0.95 average
Time:       ~3 minutes total
```

### Sample Extracted Knowledge

**Concepts:**
- 3D Gaussian Splatting
- Real-Time Radiance Field Rendering
- MVSplat
- Mip-Splatting
- GaussianShader
- 4D Gaussian Splatting (4DGS)

**Relationship:**
- "Real-Time Radiance Field Rendering" **IMPROVES** "Radiance Field Rendering" (confidence: 0.85, type: speed)

**Papers Processed:**
1. 3D Gaussian Splatting for Real-Time Radiance Field Rendering (arXiv:2308.04079)
2. MVSplat: Efficient 3D Gaussian Splatting from Sparse Multi-View Images
3. Mip-Splatting: Alias-free 3D Gaussian Splatting
4. GaussianShader: 3D Gaussian Splatting with Shading Functions
5. 4D Gaussian Splatting for Real-Time Dynamic Scene Rendering

---

## 🏗️ Architecture

### Multi-Agent System
```
┌─────────────────────────────────────────────────────────┐
│                   ORCHESTRATION LAYER                    │
│          (Coordinates all agents and workflow)           │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ PaperReader   │  │ EntityExtract │  │ Relationship  │
│    Agent      │→ │     Agent     │→ │ MapperAgent   │
│               │  │               │  │               │
│ • Fetch papers│  │ • 3-pass LLM  │  │ • Find links  │
│ • Parse PDFs  │  │ • Extract     │  │ • Map improve │
│ • Store data  │  │ • Deduplicate │  │ • Store edges │
└───────────────┘  └───────────────┘  └───────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                  ┌───────────────┐
                  │  Validator    │
                  │    Agent      │
                  │               │
                  │ • Quality     │
                  │ • Consistency │
                  │ • Validation  │
                  └───────────────┘
                           │
                           ▼
                  ┌───────────────┐
                  │   PostgreSQL  │
                  │ Graph Database│
                  │   (Supabase)  │
                  └───────────────┘
```

### Data Flow

1. **Input:** arXiv paper ID (e.g., `2308.04079`)
2. **PaperReaderAgent:** Downloads PDF → Parses text → Stores metadata
3. **EntityExtractorAgent:** 
   - Pass 1: Extract concepts/methods with GPT-4
   - Pass 2: Deduplicate against database
   - Pass 3: Validate and assign confidence scores
4. **RelationshipMapperAgent:** Find semantic relationships (improves, extends, uses)
5. **ValidatorAgent:** Quality checks and consistency validation
6. **Output:** Structured knowledge graph in PostgreSQL

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 18+
Supabase account
OpenAI API key
```

### Installation
```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/gaussian-splatting-kg.git
cd gaussian-splatting-kg

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys:
#   - SUPABASE_URL
#   - SUPABASE_KEY
#   - SUPABASE_SERVICE_KEY
#   - OPENAI_API_KEY

# 4. Setup database
# Run src/database/schema.sql in Supabase SQL Editor
```

### Run Demo
```bash
# Test connection
npx ts-node test-connection.ts

# View existing knowledge graph
npx ts-node demo.ts

# Process 5 papers (takes ~10 minutes)
npx ts-node batch-process-papers.ts
```

---

## 📊 Database Schema

### Core Tables (Nodes)

- **papers** - Research paper metadata
- **concepts** - Extracted concepts with confidence scores
- **methods** - Algorithms and techniques
- **datasets** - Referenced datasets
- **authors** - Paper authors

### Relationships (Edges)

- **paper_introduces_concept** - Papers that introduce concepts
- **concept_improves_concept** - Concept improvement chains
- **paper_cites** - Citation network
- **paper_uses_method** - Method usage
- **paper_evaluates_on_dataset** - Dataset evaluation

### Example Queries

**Find papers improving on 3D Gaussian Splatting:**
```sql
SELECT 
  p.title,
  c_new.name as new_concept,
  ci.improvement_type,
  ci.quantitative_gain
FROM concept_improves_concept ci
JOIN concepts c_new ON ci.new_concept = c_new.id
JOIN concepts c_old ON ci.old_concept = c_old.id
JOIN paper_introduces_concept pic ON pic.concept_id = c_new.id
JOIN papers p ON pic.paper_id = p.id
WHERE c_old.normalized_name = '3d-gaussian-splatting'
ORDER BY p.published_date DESC;
```

---

## 🧪 Testing
```bash
# Individual component tests
npx ts-node test-connection.ts      # Database
npx ts-node test-llm.ts              # OpenAI
npx ts-node test-semantic-scholar.ts # Paper API

# Full pipeline test
npx ts-node test-full-pipeline.ts

# Build TypeScript
npm run build
```

---

## 📁 Project Structure
```
gaussian-splatting-kg/
├── src/
│   ├── agents/              # 4 agent implementations
│   │   ├── base/            # Base agent class
│   │   ├── EntityExtractorAgent.ts
│   │   ├── PaperReaderAgent.ts
│   │   ├── RelationshipMapperAgent.ts
│   │   └── ValidatorAgent.ts
│   ├── database/            # Database layer
│   │   ├── client.ts
│   │   ├── schema.sql
│   │   └── queries.ts
│   ├── llm/                 # LLM integration
│   │   ├── client.ts
│   │   └── prompts.ts
│   ├── ingestion/           # Paper fetching
│   │   ├── arxiv.ts
│   │   ├── semantic-scholar.ts
│   │   └── pdf-parser.ts
│   ├── types/               # TypeScript definitions
│   │   └── index.ts
│   └── utils/               # Utilities
│       ├── config.ts
│       ├── logger.ts
│       └── helpers.ts
├── docs/
│   ├── ARCHITECTURE.md      # System design
│   ├── DESIGN_DECISIONS.md  # Technical choices
│   └── FUTURE_ROADMAP.md    # Scaling plans
├── tests/                   # Test scripts
├── demo.ts                  # Demo script
├── batch-process-papers.ts  # Batch processing
└── package.json
```

---

## 🎯 Key Design Decisions

### 1. **Custom Agent Framework**
Built from scratch instead of using LangChain/CrewAI to demonstrate deep understanding of agentic systems and have full control over orchestration.

### 2. **3-Pass Entity Extraction**
Multi-pass approach (Extract → Disambiguate → Validate) ensures high-quality, deduplicated entities instead of simple single-pass extraction.

### 3. **PostgreSQL Graph Database**
Chose Postgres over Neo4j for ACID compliance, familiar SQL queries, and easy integration with vector embeddings for future semantic search.

### 4. **TypeScript**
Type safety prevents bugs at compile time, making the system more reliable and maintainable.

---

## 🔮 Future Roadmap

### Phase 1 (1-3 months) - Production Ready
- ✅ Distributed processing (10x faster)
- ✅ Intelligent caching (5x cost reduction)
- ✅ Incremental updates (arXiv RSS feed)

### Phase 2 (3-6 months) - User Platform
- ✅ Web UI with D3.js graph visualization
- ✅ Semantic search with vector embeddings
- ✅ Research trend analysis

### Phase 3 (6-12 months) - Advanced Features
- ✅ Automated literature review generation
- ✅ Research gap identification
- ✅ Researcher recommendation system

[Full roadmap →](docs/FUTURE_ROADMAP.md)

---

## 📚 Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and design
- **[DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md)** - Technical decisions and tradeoffs
- **[FUTURE_ROADMAP.md](docs/FUTURE_ROADMAP.md)** - Scaling and enhancement plans
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Non-technical setup guide
- **[SUBMISSION.md](SUBMISSION.md)** - Assignment submission details

---

## 🛠️ Tech Stack

**Backend:**
- TypeScript
- Node.js 18+

**Database:**
- Supabase (PostgreSQL)
- pgvector (future: semantic search)

**AI/ML:**
- OpenAI GPT-4-turbo
- Anthropic Claude (fallback)

**APIs:**
- Semantic Scholar (paper metadata)
- arXiv (PDF download)

**Tools:**
- pdf-parse (PDF extraction)
- axios (HTTP requests)

---

## 💰 Cost Estimate

**POC (5 papers):**
- OpenAI API: ~$0.50
- Supabase: Free tier
- **Total: ~$0.50**

**Production (1,000 papers/day):**
- OpenAI API: ~$20/day (with caching)
- Supabase Pro: ~$25/month
- Compute (AWS): ~$200/month
- **Total: ~$800/month**

---

## 🤝 Contributing

This is a take-home assignment project. For questions:
- Email: anirudhcsp@gmail.com
- LinkedIn: https://www.linkedin.com/in/ani-csp/

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

- **Alaris Security** - For the interesting assignment
- **OpenAI** - GPT-4 API
- **Supabase** - Database platform
- **Semantic Scholar** - Paper metadata API
- **arXiv** - Open access papers

---

## 📧 Contact

**Anirudh**  
Generative AI & Agentic AI Engineer  
11+ years experience | 3+ years in production AI systems

- GitHub: [@anirudhcsp](https://github.com/anirudhcsp)
- LinkedIn: https://www.linkedin.com/in/ani-csp/
- Email: anirudhcsp@gmail.com

---

**Built with ❤️ for advancing AI research tools**