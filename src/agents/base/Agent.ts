import { v4 as uuidv4 } from 'uuid';
import { AgentType, AgentMessage, AgentTask } from '../../types';
import { log } from '../../utils/logger';
import { DatabaseClient, db } from '../../database/client';

/**
 * Base Agent class that all specialized agents extend
 * 
 * This provides common functionality for:
 * - Logging
 * - Database access
 * - Error handling
 * - Task management
 */
export abstract class Agent {
  protected name: string;
  protected type: AgentType;
  protected db: DatabaseClient;
  
  constructor(name: string, type: AgentType) {
    this.name = name;
    this.type = type;
    this.db = db;
  }
  
  /**
   * Execute the agent's primary task
   * Must be implemented by subclasses
   */
  abstract execute(input: any): Promise<any>;
  
  /**
   * Get agent name
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get agent type
   */
  getType(): AgentType {
    return this.type;
  }
  
  /**
   * Log a message with agent context
   */
  protected log(message: string, level: 'info' | 'error' | 'warn' | 'debug' = 'info'): void {
    log.agent(this.name, message);
  }
  
  /**
   * Log an error with full context
   */
  protected logError(message: string, error: Error | unknown): void {
    log.error(`[${this.name}] ${message}`, error);
  }
  
  /**
   * Create a task record
   */
  protected async createTask(input: any): Promise<AgentTask> {
    const task: AgentTask = {
      id: uuidv4(),
      agentType: this.type,
      input,
      status: 'pending',
      created_at: new Date(),
    };
    
    this.log(`Created task: ${task.id}`);
    return task;
  }
  
  /**
   * Update task status
   */
  protected async updateTask(task: AgentTask, updates: Partial<AgentTask>): Promise<AgentTask> {
    const updatedTask = { ...task, ...updates };
    this.log(`Updated task ${task.id}: ${updates.status || 'in-progress'}`);
    return updatedTask;
  }
  
  /**
   * Execute task with error handling and logging
   */
  async executeTask(input: any): Promise<any> {
    const task = await this.createTask(input);
    
    try {
      this.log(`Starting execution of task: ${task.id}`);
      await this.updateTask(task, { status: 'processing' });
      
      const result = await this.execute(input);
      
      await this.updateTask(task, {
        status: 'completed',
        result,
        completed_at: new Date(),
      });
      
      this.log(`Completed task: ${task.id}`);
      return result;
      
    } catch (error) {
      this.logError(`Task ${task.id} failed`, error);
      
      await this.updateTask(task, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        completed_at: new Date(),
      });
      
      throw error;
    }
  }
  
  /**
   * Send a message to another agent (for future inter-agent communication)
   */
  protected createMessage(to: string, payload: any, type: 'task' | 'result' | 'error' = 'task'): AgentMessage {
    return {
      id: uuidv4(),
      type,
      from: this.name,
      to,
      payload,
      metadata: {
        timestamp: new Date(),
        priority: 1,
        retries: 0,
      },
    };
  }
  
  /**
   * Validate input before processing
   */
  protected validateInput(input: any, required: string[]): void {
    for (const field of required) {
      if (!(field in input) || input[field] === undefined || input[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }
}