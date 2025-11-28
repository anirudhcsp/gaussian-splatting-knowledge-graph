# Design Decisions

This document outlines key design decisions made during the development of the Gaussian Splatting Knowledge Graph system, along with the rationale, trade-offs, and alternatives considered.

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [Agent Architecture](#agent-architecture)
3. [Database Design](#database-design)
4. [LLM Integration](#llm-integration)
5. [Data Ingestion Strategy](#data-ingestion-strategy)
6. [Entity Extraction Approach](#entity-extraction-approach)
7. [Relationship Mapping](#relationship-mapping)
8. [Error Handling & Reliability](#error-handling--reliability)

---

## Technology Stack

### Decision 1: TypeScript over Python

**Choice:** TypeScript for the entire system

**Rationale:**
- **Type Safety**: Catch errors at compile time, especially important for complex agent interactions
- **Modern Async**: Native Promise/async-await support with excellent type inference
- **Assignment Requirement**: Take-home explicitly requested TypeScript for agent layer
- **Performance**: V8 engine provides good performance for I/O-bound tasks
- **Ecosystem**: Rich npm ecosystem for all required libraries

**Alternatives Considered:**
- **Python**: Better data science libraries (pandas, numpy), but weaker type system
- **Hybrid Approach**: Python for ML/data processing, TypeScript for orchestration
  - **Why Not**: Added complexity, deployment challenges, communication overhead

**Trade-offs:**
- ✅ Better type safety and IDE support
- ✅ Single language across entire stack
- ❌ Less mature ML/NLP libraries compared to Python
- ❌ Smaller community for academic paper processing

---

### Decision 2: Supabase (PostgreSQL) over Graph Databases

**Choice:** Supabase (managed PostgreSQL) for data storage

**Rationale:**
- **Assignment Recommendation**: "Optional but recommended"
- **SQL Power**: Complex graph queries possible with recursive CTEs
- **ACID Guarantees**: Essential for maintaining data consistency
- **Managed Service**: No infrastructure management needed
- **Full-Text Search**: Built-in GIN indexes for text search
- **Flexibility**: Can store both relational and graph data

**Alternatives Considered:**

1. **Neo4j (Graph Database)**
   - ✅ Native graph traversal
   - ✅ Cypher query language optimized for graphs
   - ❌ Additional service to manage
   - ❌ Learning curve for new query language
   - ❌ More expensive for production deployment

2. **MongoDB (Document Database)**
   - ✅ Flexible schema
   - ✅ JSON-native storage
   - ❌ Weak relationship support
   - ❌ No ACID across documents
   - ❌ Poor for graph traversal queries

3. **DynamoDB (NoSQL)**
   - ✅ Serverless, auto-scaling
   - ❌ Limited query capabilities
   - ❌ Expensive for complex queries
   - ❌ Not suitable for graph operations

**Trade-offs:**
- ✅ Familiar SQL syntax
- ✅ ACID transactions
- ✅ Free tier available
- ❌ Graph queries more verbose than Neo4j Cypher
- ❌ Performance may degrade with very large graphs

**Decision:** PostgreSQL with proper indexing provides sufficient graph capabilities for this use case (50-100 papers), with the flexibility to migrate to Neo4j later if needed.

---

### Decision 3: Multi-LLM Support (OpenAI + Anthropic)

**Choice:** Abstract LLM client supporting multiple providers

**Rationale:**
- **Flexibility**: Switch providers based on cost/performance
- **Reliability**: Fallback if one provider has downtime
- **Cost Optimization**: Use different models for different tasks
- **Future-Proofing**: Easy to add new providers

**Implementation:**
```typescript
interface LLMClient {
  complete(prompt: string, options?: LLMConfig): Promise<string>
  extractStructuredData<T>(prompt: string): Promise<T>
}
```

**Trade-offs:**
- ✅ Provider flexibility
- ✅ Cost optimization potential
- ❌ More complex configuration
- ❌ Different prompt formats may need tuning

---

## Agent Architecture

### Decision 4: Custom Agent Framework vs. LangChain/LangGraph

**Choice:** Custom agent implementation from scratch

**Rationale:**
- **Demonstrate Understanding**: Shows deep understanding of agentic systems
- **Control**: Full control over orchestration logic
- **Simplicity**: No unnecessary abstractions
- **Learning**: Assignment is about building, not just using libraries
- **Performance**: No framework overhead

**Alternatives Considered:**

1. **LangChain**
   - ✅ Mature ecosystem
   - ✅ Many pre-built components
   - ❌ Heavy abstraction layer
   - ❌ Less impressive for take-home assignment
   - ❌ Harder to debug

2. **LangGraph**
   - ✅ Graph-based agent orchestration
   - ✅ State management
   - ❌ Overkill for linear pipeline
   - ❌ Learning curve

3. **CrewAI**
   - ✅ Multi-agent collaboration
   - ❌ Python-only
   - ❌ Less control over behavior

**Trade-offs:**
- ✅ Complete control and transparency
- ✅ Demonstrates design skills
- ✅ Easier to debug and modify
- ❌ More code to write and maintain
- ❌ Missing some advanced features (tool calling, memory)

---

### Decision 5: Sequential vs. Parallel Agent Execution

**Choice:** Sequential pipeline with parallel batch processing

**Pipeline:**
```
Paper → Reader → Extractor → Mapper → Validator → Done
      ↓           ↓           ↓         ↓
     (Sequential for single paper)

But multiple papers processed in parallel via p-queue
```

**Rationale:**
- **Simplicity**: Easier to reason about and debug
- **Dependencies**: Each agent needs output from previous agent
- **Reliability**: Failures easier to trace
- **Batch Parallelism**: p-queue provides concurrency where it matters most

**Alternatives Considered:**

1. **Fully Parallel**
   - ✅ Maximum throughput
   - ❌ Complex coordination
   - ❌ Race conditions
   - ❌ Harder to debug

2. **Async Message Queue (RabbitMQ/Kafka)**
   - ✅ Scalable
   - ✅ Fault tolerant
   - ❌ Infrastructure complexity
   - ❌ Overkill for 50-100 papers

**Trade-offs:**
- ✅ Clear execution flow
- ✅ Easy debugging
- ✅ Good enough performance for current scale
- ❌ Not maximum throughput
- ❌ Single point of failure per paper

---

## Database Design

### Decision 6: Graph Schema Design

**Choice:** Hybrid node-edge table design with normalized entities

**Schema Pattern:**
```sql
-- Node tables (entities)
papers, concepts, methods, datasets, authors

-- Edge tables (relationships)
paper_cites, concept_improves_concept, paper_introduces_concept
```

**Rationale:**
- **Normalization**: Avoid data duplication
- **Referential Integrity**: Foreign keys ensure consistency
- **Query Flexibility**: Can query nodes or edges independently
- **Standard SQL**: No custom graph extensions needed

**Alternatives Considered:**

1. **Single Graph Table**
```sql
   CREATE TABLE graph (
     id UUID,
     type VARCHAR,  -- 'node' or 'edge'
     properties JSONB
   )
```
   - ✅ Flexible schema
   - ❌ No type safety
   - ❌ Poor query performance
   - ❌ No foreign key constraints

2. **EAV (Entity-Attribute-Value)**
   - ✅ Ultra-flexible
   - ❌ Complex queries
   - ❌ Poor performance

**Trade-offs:**
- ✅ Type-safe and normalized
- ✅ Good query performance with indexes
- ✅ Easy to understand
- ❌ Schema changes require migrations
- ❌ More tables to manage

---

### Decision 7: Normalized Names for Deduplication

**Choice:** Store both original name and `normalized_name` for entities

**Implementation:**
```typescript
normalizeEntityName("3D Gaussian Splatting")
// → "3d-gaussian-splatting"
```

**Rationale:**
- **Deduplication**: Catch variations like "3D-GS" vs "3DGS" vs "3D Gaussian Splatting"
- **Search**: Easier to find similar entities
- **Canonical Reference**: One true representation per concept
- **Uniqueness Constraint**: Database enforces `UNIQUE(normalized_name)`

**Trade-offs:**
- ✅ Effective deduplication
- ✅ Fast lookups
- ❌ May over-merge similar but distinct concepts
- ❌ Normalization rules need careful tuning

---

## LLM Integration

### Decision 8: Structured Extraction with JSON Mode

**Choice:** Use JSON mode for all LLM extractions

**Implementation:**
```typescript
await llmClient.extractStructuredData<ExtractedEntities>(prompt, {
  response_format: { type: 'json_object' }
})
```

**Rationale:**
- **Reliability**: Guaranteed valid JSON
- **Type Safety**: Direct parsing to TypeScript types
- **No Parsing Errors**: No need for regex or string manipulation
- **Consistency**: Same format every time

**Alternatives Considered:**

1. **Free-form Text Parsing**
   - ❌ Unreliable
   - ❌ Requires complex regex
   - ❌ Fails on edge cases

2. **Function Calling (OpenAI)**
   - ✅ Type-safe
   - ❌ OpenAI-specific
   - ❌ Not supported by Anthropic

**Trade-offs:**
- ✅ 100% reliable JSON
- ✅ Type-safe
- ❌ Slightly more verbose prompts
- ❌ May constrain LLM creativity

---

### Decision 9: Low Temperature for Consistency

**Choice:** Use temperature = 0.2 for all extractions

**Rationale:**
- **Consistency**: Same paper should extract same entities
- **Determinism**: Critical for data quality
- **No Creativity Needed**: Extraction is about accuracy, not creativity
- **Reproducibility**: Results should be reproducible

**When Higher Temperature?**
- Creative tasks (none in this system)
- Brainstorming (not applicable here)
- Content generation (not our use case)

**Trade-offs:**
- ✅ Consistent results
- ✅ Predictable behavior
- ❌ May miss creative entity names
- ❌ Less diverse outputs

---

## Data Ingestion Strategy

### Decision 10: BFS Traversal for Citation Network

**Choice:** Breadth-first search starting from seed paper

**Algorithm:**
```
1. Start with seed paper (3D Gaussian Splatting)
2. Fetch its references and citations
3. Sort by citation count (prioritize influential papers)
4. Add top N to queue
5. Continue until limit reached
```

**Rationale:**
- **Relevance**: BFS ensures related papers discovered first
- **Quality**: Citation count as quality signal
- **Coverage**: Explores network systematically
- **Bounded**: Easy to limit total papers processed

**Alternatives Considered:**

1. **DFS (Depth-First Search)**
   - ❌ May go too deep into niche subtopics
   - ❌ Less balanced coverage

2. **Random Sampling**
   - ❌ No guarantee of relevance
   - ❌ May miss important papers

3. **Citation-Weighted Random Walk**
   - ✅ Sophisticated
   - ❌ Complex to implement
   - ❌ Not necessary for 50-100 papers

**Trade-offs:**
- ✅ Simple and effective
- ✅ Prioritizes important papers
- ✅ Systematic coverage
- ❌ May miss papers not well-cited yet
- ❌ Biased toward older papers

---

### Decision 11: Caching PDFs Locally

**Choice:** Download PDFs once and cache in `/tmp`

**Rationale:**
- **Efficiency**: Don't re-download same PDF
- **Rate Limiting**: Respect arXiv bandwidth
- **Development**: Faster iteration during testing
- **Reliability**: Network failures don't lose progress

**Trade-offs:**
- ✅ Faster processing
- ✅ Bandwidth-friendly
- ❌ Disk space usage
- ❌ Need cleanup strategy

---

## Entity Extraction Approach

### Decision 12: Multi-Pass Extraction Strategy

**Choice:** Three-pass extraction process

**Passes:**
1. **Extract**: LLM extracts entities from paper
2. **Disambiguate**: Check database for existing entities
3. **Validate**: Filter low-quality extractions

**Rationale:**
- **Quality**: Multiple checks improve accuracy
- **Deduplication**: Merge with existing entities
- **Confidence**: Adjust scores based on quality checks
- **Incremental**: Each pass improves results

**Alternatives Considered:**

1. **Single Pass**
   - ❌ Lower quality
   - ❌ More duplicates
   - ✅ Faster

2. **Iterative Refinement (Multiple LLM Calls)**
   - ✅ Highest quality
   - ❌ Expensive (more tokens)
   - ❌ Slower

**Trade-offs:**
- ✅ Good quality/cost balance
- ✅ Deduplication built-in
- ❌ More complex code
- ❌ Slightly slower

---

### Decision 13: Confidence Scoring

**Choice:** Store confidence scores (0.0 to 1.0) for all extractions

**Usage:**
- Filter low-confidence entities (< 0.5)
- Prioritize high-confidence relationships
- Allow users to adjust threshold

**Rationale:**
- **Quality Control**: Not all extractions are equal
- **Transparency**: Users know certainty level
- **Filtering**: Can raise/lower bar as needed
- **Research**: Common in academic graph systems

**Trade-offs:**
- ✅ Transparent quality
- ✅ Flexible filtering
- ❌ Hard to calibrate scores
- ❌ LLM confidence may be miscalibrated

---

## Relationship Mapping

### Decision 14: LLM-Based Relationship Classification

**Choice:** Use LLM to classify concept relationships

**Approach:**
```typescript
// Compare two concepts
prompt = `Does concept A improve concept B?`
result = await llm.classify(prompt)
// Returns: { has_relationship, type, confidence }
```

**Rationale:**
- **Semantic Understanding**: Captures nuanced relationships
- **Flexibility**: Can classify many relationship types
- **Natural Language**: Works with text descriptions
- **No Training Data Needed**: Zero-shot classification

**Alternatives Considered:**

1. **Rule-Based (Keyword Matching)**
   - ✅ Fast and deterministic
   - ❌ Brittle, misses nuance
   - ❌ Hard to maintain rules

2. **Fine-Tuned Classifier**
   - ✅ Potentially more accurate
   - ❌ Requires labeled training data
   - ❌ Domain-specific training needed

3. **Embedding Similarity**
   - ✅ Fast
   - ❌ Correlation not causation
   - ❌ Can't distinguish improvement types

**Trade-offs:**
- ✅ Flexible and powerful
- ✅ Good accuracy
- ❌ Slower (LLM call per pair)
- ❌ More expensive (tokens)

---

## Error Handling & Reliability

### Decision 15: Graceful Degradation

**Choice:** Continue processing on partial failures

**Strategy:**
```typescript
// Process batch, continue on individual failures
results = await Promise.allSettled(papers.map(processPaper))

// Log failures but don't crash
successful = results.filter(r => r.status === 'fulfilled')
```

**Rationale:**
- **Resilience**: One bad paper doesn't kill entire run
- **Progress**: Partial results still valuable
- **Debugging**: Can review failures separately
- **Production-Ready**: Expected behavior in real systems

**Alternatives Considered:**

1. **Fail Fast**
   - ❌ All progress lost on single error
   - ✅ Easier debugging (immediate feedback)

2. **Transaction All-or-Nothing**
   - ❌ No partial results
   - ✅ Perfect consistency

**Trade-offs:**
- ✅ Resilient to failures
- ✅ Incremental progress
- ❌ Partial data may be confusing
- ❌ Need to track failures

---

### Decision 16: Retry with Exponential Backoff

**Choice:** Retry failed API calls with exponential backoff

**Implementation:**
```typescript
async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
  for (attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      delay = baseDelay * Math.pow(2, attempt - 1)
      await sleep(delay)
    }
  }
}
```

**Rationale:**
- **Transient Failures**: Network issues, rate limits
- **Politeness**: Don't hammer failing services
- **Standard Practice**: Industry best practice
- **Success Rate**: Significantly improves reliability

**Trade-offs:**
- ✅ Handles transient failures
- ✅ Respects rate limits
- ❌ Slower on failures
- ❌ May hide persistent issues

---

## Summary

These design decisions prioritize:

1. **Clarity**: Simple, understandable architecture
2. **Reliability**: Graceful error handling
3. **Flexibility**: Multi-provider LLM support
4. **Type Safety**: TypeScript throughout
5. **Scalability**: Foundation for future growth
6. **Demonstrability**: Shows deep technical understanding

The choices favor **proven patterns** over bleeding-edge technologies, **simplicity** over premature optimization, and **transparency** over abstraction—all appropriate for a production take-home assignment.

---

**Next Steps**: See FUTURE_ROADMAP.md for planned enhancements and scaling strategies.