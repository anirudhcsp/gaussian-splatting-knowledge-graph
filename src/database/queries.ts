import { db } from './client';
import { Paper, Concept, Method, Dataset, Author } from '../types';

/**
 * Database query helpers
 */

// ============================================================================
// PAPER QUERIES
// ============================================================================

/**
 * Insert a new paper
 */
export async function insertPaper(paper: Omit<Paper, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await db.getClient()
    .from('papers')
    .insert(paper)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get paper by arXiv ID
 */
export async function getPaperByArxivId(arxivId: string): Promise<Paper | null> {
  const { data, error } = await db.getClient()
    .from('papers')
    .select('*')
    .eq('arxiv_id', arxivId)
    .single();
  
  if (error) return null;
  return data;
}

/**
 * Get paper by Semantic Scholar ID
 */
export async function getPaperBySemanticScholarId(ssId: string): Promise<Paper | null> {
  const { data, error } = await db.getClient()
    .from('papers')
    .select('*')
    .eq('semantic_scholar_id', ssId)
    .single();
  
  if (error) return null;
  return data;
}

/**
 * Update paper with full text
 */
export async function updatePaperText(paperId: string, pdfText: string) {
  const { data, error } = await db.getClient()
    .from('papers')
    .update({ pdf_text: pdfText })
    .eq('id', paperId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get papers with citation counts
 */
export async function getPapersWithStats(limit: number = 10) {
  const { data, error } = await db.getClient()
    .from('papers_with_stats')
    .select('*')
    .order('citation_count', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

// ============================================================================
// CONCEPT QUERIES
// ============================================================================

/**
 * Insert a new concept
 */
export async function insertConcept(concept: Omit<Concept, 'id' | 'created_at'>) {
  const { data, error } = await db.getClient()
    .from('concepts')
    .insert(concept)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get concept by normalized name
 */
export async function getConceptByName(normalizedName: string): Promise<Concept | null> {
  const { data, error } = await db.getClient()
    .from('concepts')
    .select('*')
    .eq('normalized_name', normalizedName)
    .single();
  
  if (error) return null;
  return data;
}

/**
 * Find similar concepts by name
 */
export async function findSimilarConcepts(name: string, limit: number = 5) {
  const { data, error } = await db.getClient()
    .from('concepts')
    .select('*')
    .ilike('name', `%${name}%`)
    .limit(limit);
  
  if (error) throw error;
  return data;
}

/**
 * Get concepts with usage statistics
 */
export async function getConceptsWithStats(limit: number = 20) {
  const { data, error } = await db.getClient()
    .from('concepts_with_stats')
    .select('*')
    .order('paper_count', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

// ============================================================================
// METHOD QUERIES
// ============================================================================

/**
 * Insert a new method
 */
export async function insertMethod(method: Omit<Method, 'id' | 'created_at'>) {
  const { data, error } = await db.getClient()
    .from('methods')
    .insert(method)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get method by normalized name
 */
export async function getMethodByName(normalizedName: string): Promise<Method | null> {
  const { data, error } = await db.getClient()
    .from('methods')
    .select('*')
    .eq('normalized_name', normalizedName)
    .single();
  
  if (error) return null;
  return data;
}

// ============================================================================
// DATASET QUERIES
// ============================================================================

/**
 * Insert a new dataset
 */
export async function insertDataset(dataset: Omit<Dataset, 'id' | 'created_at'>) {
  const { data, error } = await db.getClient()
    .from('datasets')
    .insert(dataset)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get dataset by name
 */
export async function getDatasetByName(name: string): Promise<Dataset | null> {
  const { data, error } = await db.getClient()
    .from('datasets')
    .select('*')
    .eq('name', name)
    .single();
  
  if (error) return null;
  return data;
}

// ============================================================================
// AUTHOR QUERIES
// ============================================================================

/**
 * Insert a new author
 */
export async function insertAuthor(author: Omit<Author, 'id' | 'created_at'>) {
  const { data, error } = await db.getClient()
    .from('authors')
    .insert(author)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get author by normalized name
 */
export async function getAuthorByName(normalizedName: string): Promise<Author | null> {
  const { data, error } = await db.getClient()
    .from('authors')
    .select('*')
    .eq('normalized_name', normalizedName)
    .single();
  
  if (error) return null;
  return data;
}

// ============================================================================
// RELATIONSHIP QUERIES
// ============================================================================

/**
 * Create paper citation
 */
export async function createCitation(sourcePaperId: string, targetPaperId: string, context?: string) {
  const { data, error } = await db.getClient()
    .from('paper_cites')
    .insert({
      source_paper: sourcePaperId,
      target_paper: targetPaperId,
      citation_context: context,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Link paper to concept
 */
export async function linkPaperToConcept(paperId: string, conceptId: string, confidence: number = 0.8) {
  const { data, error } = await db.getClient()
    .from('paper_introduces_concept')
    .insert({
      paper_id: paperId,
      concept_id: conceptId,
      confidence,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Create concept improvement relationship
 */
export async function createConceptImprovement(
  newConceptId: string,
  oldConceptId: string,
  improvementType: 'speed' | 'quality' | 'generalization' | 'simplicity',
  quantitativeGain?: Record<string, any>,
  confidence: number = 0.7
) {
  const { data, error } = await db.getClient()
    .from('concept_improves_concept')
    .insert({
      new_concept: newConceptId,
      old_concept: oldConceptId,
      improvement_type: improvementType,
      quantitative_gain: quantitativeGain,
      confidence,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Link paper to method
 */
export async function linkPaperToMethod(paperId: string, methodId: string) {
  const { data, error } = await db.getClient()
    .from('paper_uses_method')
    .insert({
      paper_id: paperId,
      method_id: methodId,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Link paper to dataset
 */
export async function linkPaperToDataset(paperId: string, datasetId: string, metrics?: Record<string, any>) {
  const { data, error } = await db.getClient()
    .from('paper_evaluates_on_dataset')
    .insert({
      paper_id: paperId,
      dataset_id: datasetId,
      metrics,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Link paper to author
 */
export async function linkPaperToAuthor(paperId: string, authorId: string, position?: number) {
  const { data, error } = await db.getClient()
    .from('paper_authored_by')
    .insert({
      paper_id: paperId,
      author_id: authorId,
      author_position: position,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================================
// COMPLEX QUERIES
// ============================================================================

/**
 * Get concepts introduced by a paper
 */
export async function getConceptsByPaper(paperId: string) {
  const { data, error } = await db.getClient()
    .from('paper_introduces_concept')
    .select(`
      concept_id,
      confidence,
      concepts (*)
    `)
    .eq('paper_id', paperId);
  
  if (error) throw error;
  return data;
}

/**
 * Get papers that cite a given paper
 */
export async function getCitingPapers(paperId: string) {
  const { data, error } = await db.getClient()
    .from('paper_cites')
    .select(`
      source_paper,
      citation_context,
      papers!paper_cites_source_paper_fkey (*)
    `)
    .eq('target_paper', paperId);
  
  if (error) throw error;
  return data;
}

/**
 * Get improvement chain for a concept
 */
export async function getConceptImprovements(conceptId: string) {
  const { data, error } = await db.getClient()
    .from('concept_improves_concept')
    .select(`
      *,
      new:concepts!concept_improves_concept_new_concept_fkey (*),
      old:concepts!concept_improves_concept_old_concept_fkey (*)
    `)
    .or(`new_concept.eq.${conceptId},old_concept.eq.${conceptId}`);
  
  if (error) throw error;
  return data;
}

/**
 * Search papers by text (title + abstract)
 */
export async function searchPapers(query: string, limit: number = 10) {
  const { data, error } = await db.getClient()
    .from('papers')
    .select('*')
    .textSearch('title', query)
    .limit(limit);
  
  if (error) throw error;
  return data;
}