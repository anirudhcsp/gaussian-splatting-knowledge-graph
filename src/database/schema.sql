-- ============================================================================
-- Gaussian Splatting Knowledge Graph - Database Schema
-- ============================================================================
-- This schema defines the complete knowledge graph structure with nodes and edges
-- Run this in your Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- NODE TABLES (Entities)
-- ============================================================================

-- Papers: Research papers with metadata
CREATE TABLE IF NOT EXISTS papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    arxiv_id VARCHAR(50) UNIQUE,
    semantic_scholar_id VARCHAR(100) UNIQUE,
    abstract TEXT,
    published_date DATE,
    pdf_url TEXT,
    pdf_text TEXT,
    authors_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Concepts: Technical concepts, methods, architectures
CREATE TABLE IF NOT EXISTS concepts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('technique', 'architecture', 'loss_function', 'representation', 'other')),
    first_introduced_by UUID REFERENCES papers(id) ON DELETE SET NULL,
    confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(normalized_name)
);

-- Methods: Computational methods and algorithms
CREATE TABLE IF NOT EXISTS methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    description TEXT,
    computational_complexity TEXT,
    introduced_in UUID REFERENCES papers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(normalized_name)
);

-- Datasets: Evaluation datasets
CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    url TEXT,
    introduced_in UUID REFERENCES papers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Authors: Paper authors
CREATE TABLE IF NOT EXISTS authors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    affiliation TEXT,
    h_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(normalized_name)
);

-- ============================================================================
-- EDGE TABLES (Relationships)
-- ============================================================================

-- Paper Citations: Citation network
CREATE TABLE IF NOT EXISTS paper_cites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_paper UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    target_paper UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    citation_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_paper, target_paper)
);

-- Paper introduces Concept
CREATE TABLE IF NOT EXISTS paper_introduces_concept (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    section TEXT,
    confidence FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(paper_id, concept_id)
);

-- Concept improves Concept (improvement relationships)
CREATE TABLE IF NOT EXISTS concept_improves_concept (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    new_concept UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    old_concept UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
    improvement_type VARCHAR(50) CHECK (improvement_type IN ('speed', 'quality', 'generalization', 'simplicity')),
    quantitative_gain JSONB,
    confidence FLOAT DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(new_concept, old_concept)
);

-- Paper uses Method
CREATE TABLE IF NOT EXISTS paper_uses_method (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    method_id UUID NOT NULL REFERENCES methods(id) ON DELETE CASCADE,
    section TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(paper_id, method_id)
);

-- Paper evaluates on Dataset
CREATE TABLE IF NOT EXISTS paper_evaluates_on_dataset (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(paper_id, dataset_id)
);

-- Paper authored by Author
CREATE TABLE IF NOT EXISTS paper_authored_by (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    author_position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(paper_id, author_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Papers indexes
CREATE INDEX IF NOT EXISTS idx_papers_arxiv ON papers(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_papers_semantic ON papers(semantic_scholar_id);
CREATE INDEX IF NOT EXISTS idx_papers_date ON papers(published_date);
CREATE INDEX IF NOT EXISTS idx_papers_title_search ON papers USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_papers_abstract_search ON papers USING gin(to_tsvector('english', abstract));

-- Concepts indexes
CREATE INDEX IF NOT EXISTS idx_concepts_name ON concepts(normalized_name);
CREATE INDEX IF NOT EXISTS idx_concepts_category ON concepts(category);
CREATE INDEX IF NOT EXISTS idx_concepts_confidence ON concepts(confidence);
CREATE INDEX IF NOT EXISTS idx_concepts_search ON concepts USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Methods indexes
CREATE INDEX IF NOT EXISTS idx_methods_name ON methods(normalized_name);

-- Citations indexes
CREATE INDEX IF NOT EXISTS idx_citations_source ON paper_cites(source_paper);
CREATE INDEX IF NOT EXISTS idx_citations_target ON paper_cites(target_paper);

-- Concept improvements indexes
CREATE INDEX IF NOT EXISTS idx_improvements_new ON concept_improves_concept(new_concept);
CREATE INDEX IF NOT EXISTS idx_improvements_old ON concept_improves_concept(old_concept);
CREATE INDEX IF NOT EXISTS idx_improvements_type ON concept_improves_concept(improvement_type);

-- Paper-Concept relationship indexes
CREATE INDEX IF NOT EXISTS idx_paper_concepts_paper ON paper_introduces_concept(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_concepts_concept ON paper_introduces_concept(concept_id);

-- Paper-Method relationship indexes
CREATE INDEX IF NOT EXISTS idx_paper_methods_paper ON paper_uses_method(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_methods_method ON paper_uses_method(method_id);

-- Paper-Dataset relationship indexes
CREATE INDEX IF NOT EXISTS idx_paper_datasets_paper ON paper_evaluates_on_dataset(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_datasets_dataset ON paper_evaluates_on_dataset(dataset_id);

-- Author relationships indexes
CREATE INDEX IF NOT EXISTS idx_authorship_paper ON paper_authored_by(paper_id);
CREATE INDEX IF NOT EXISTS idx_authorship_author ON paper_authored_by(author_id);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_papers_updated_at
    BEFORE UPDATE ON papers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- UTILITY VIEWS
-- ============================================================================

-- View: Papers with citation counts
CREATE OR REPLACE VIEW papers_with_stats AS
SELECT 
    p.*,
    COUNT(DISTINCT pc_in.source_paper) as citation_count,
    COUNT(DISTINCT pc_out.target_paper) as reference_count,
    COUNT(DISTINCT pic.concept_id) as concept_count
FROM papers p
LEFT JOIN paper_cites pc_in ON p.id = pc_in.target_paper
LEFT JOIN paper_cites pc_out ON p.id = pc_out.source_paper
LEFT JOIN paper_introduces_concept pic ON p.id = pic.paper_id
GROUP BY p.id;

-- View: Concepts with usage counts
CREATE OR REPLACE VIEW concepts_with_stats AS
SELECT 
    c.*,
    COUNT(DISTINCT pic.paper_id) as paper_count,
    COUNT(DISTINCT cic_new.old_concept) as improves_count,
    COUNT(DISTINCT cic_old.new_concept) as improved_by_count
FROM concepts c
LEFT JOIN paper_introduces_concept pic ON c.id = pic.concept_id
LEFT JOIN concept_improves_concept cic_new ON c.id = cic_new.new_concept
LEFT JOIN concept_improves_concept cic_old ON c.id = cic_old.old_concept
GROUP BY c.id;

-- ============================================================================
-- EXAMPLE QUERIES (Commented - for reference)
-- ============================================================================

/*
-- Query 1: Find papers that improve on 3D Gaussian Splatting
SELECT 
    p.title,
    p.published_date,
    c_new.name as new_concept,
    c_old.name as old_concept,
    ci.improvement_type,
    ci.quantitative_gain
FROM concept_improves_concept ci
JOIN concepts c_new ON ci.new_concept = c_new.id
JOIN concepts c_old ON ci.old_concept = c_old.id
JOIN paper_introduces_concept pic ON pic.concept_id = c_new.id
JOIN papers p ON pic.paper_id = p.id
WHERE c_old.normalized_name = '3d-gaussian-splatting'
ORDER BY p.published_date DESC;

-- Query 2: Most influential papers by citation count
SELECT 
    p.title,
    p.published_date,
    COUNT(pc.source_paper) as citation_count
FROM papers p
LEFT JOIN paper_cites pc ON p.id = pc.target_paper
GROUP BY p.id, p.title, p.published_date
ORDER BY citation_count DESC
LIMIT 10;

-- Query 3: Research trends over time
SELECT 
    EXTRACT(YEAR FROM p.published_date) as year,
    c.category,
    COUNT(DISTINCT c.id) as concept_count
FROM concepts c
JOIN paper_introduces_concept pic ON c.id = pic.concept_id
JOIN papers p ON pic.paper_id = p.id
WHERE p.published_date IS NOT NULL
GROUP BY year, c.category
ORDER BY year DESC, concept_count DESC;

-- Query 4: Find papers and their concepts
SELECT 
    p.title,
    array_agg(c.name) as concepts
FROM papers p
JOIN paper_introduces_concept pic ON p.id = pic.paper_id
JOIN concepts c ON pic.concept_id = c.id
GROUP BY p.id, p.title;

-- Query 5: Citation chain (papers citing papers)
WITH RECURSIVE citation_chain AS (
    -- Base case: start with seed paper
    SELECT 
        id,
        title,
        1 as depth
    FROM papers
    WHERE arxiv_id = '2308.04079'
    
    UNION ALL
    
    -- Recursive case: find papers that cite the current papers
    SELECT 
        p.id,
        p.title,
        cc.depth + 1
    FROM papers p
    JOIN paper_cites pc ON p.id = pc.source_paper
    JOIN citation_chain cc ON pc.target_paper = cc.id
    WHERE cc.depth < 3
)
SELECT * FROM citation_chain;
*/

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Schema created successfully! ✅';
    RAISE NOTICE 'Tables created: papers, concepts, methods, datasets, authors';
    RAISE NOTICE 'Relationships created: citations, improvements, usage';
    RAISE NOTICE 'Indexes created for optimized queries';
    RAISE NOTICE 'Views created: papers_with_stats, concepts_with_stats';
END $$;