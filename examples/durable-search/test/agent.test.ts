import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DurableSearchAgent } from '../server';
import { DistanceMetric } from '../server/types';

// Mock the Agent class methods
vi.mock('agents-sdk', async () => {
  const actual = await vi.importActual('agents-sdk');
  return {
    ...actual,
    Agent: class MockAgent {
      state = { documents: [] };
      initialState = { documents: [] };
      setState = vi.fn((newState) => {
        this.state = newState;
      });
      schedule = vi.fn();
      sql = vi.fn();
      onStateUpdate = vi.fn();
      fetch = vi.fn();
    }
  };
});

describe('DurableSearchAgent', () => {
  let agent: DurableSearchAgent;
  
  beforeEach(() => {
    // Create a new agent instance before each test
    agent = new DurableSearchAgent({} as any, {} as any);
    
    // Reset mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('upsert', () => {
    it('should add documents to the state', async () => {
      // Test data
      const ids = ['id1', 'id2'];
      const vectors = [[1, 2, 3], [4, 5, 6]];
      const attributes = {
        title: ['Document 1', 'Document 2'],
        category: ['A', 'B']
      };
      
      // Call the upsert method
      await agent.upsert(ids, vectors, attributes);
      
      // Verify state was updated
      expect(agent.setState).toHaveBeenCalled();
      
      // Verify the documents were added correctly
      const setStateCall = agent.setState as any;
      const newState = setStateCall.mock.calls[0][0];
      expect(newState.documents.length).toBe(2);
      
      // Verify the schedule method was called
      expect(agent.schedule).toHaveBeenCalledWith(60, 'runMaintenance', expect.any(Object));
    });
    
    it('should throw an error if vectors length does not match ids length', async () => {
      // Test data with mismatched lengths
      const ids = ['id1', 'id2'];
      const vectors = [[1, 2, 3]]; // Only one vector
      const attributes = {
        title: ['Document 1', 'Document 2'],
        category: ['A', 'B']
      };
      
      // Expect the upsert to throw an error
      await expect(agent.upsert(ids, vectors, attributes)).rejects.toThrow('Vectors array length must match ids length');
    });
    
    it('should throw an error if attribute array length does not match ids length', async () => {
      // Test data with mismatched attribute length
      const ids = ['id1', 'id2'];
      const vectors = [[1, 2, 3], [4, 5, 6]];
      const attributes = {
        title: ['Document 1'], // Only one title
        category: ['A', 'B']
      };
      
      // Expect the upsert to throw an error
      await expect(agent.upsert(ids, vectors, attributes)).rejects.toThrow('Attribute "title" array length must match ids length');
    });
  });
  
  describe('query', () => {
    it('should return results sorted by similarity score', async () => {
      // Set up test data in the agent's state
      const documents = new Map();
      documents.set('id1', {
        vector: new Float32Array([1, 0, 0]),
        attributes: { title: 'Document 1', category: 'A' }
      });
      documents.set('id2', {
        vector: new Float32Array([0, 1, 0]),
        attributes: { title: 'Document 2', category: 'B' }
      });
      documents.set('id3', {
        vector: new Float32Array([0, 0, 1]),
        attributes: { title: 'Document 3', category: 'C' }
      });
      
      // Set the agent's state
      agent.setState({
        documents: Array.from(documents.entries())
      });
      
      // Query vector that is most similar to id1
      const queryVector = [0.9, 0.1, 0.1];
      const results = await agent.query(queryVector, 2, DistanceMetric.cosine);
      
      // Verify the results
      expect(results.length).toBe(2);
      expect(results[0].id).toBe('id1'); // Most similar should be id1
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });
    
    it('should limit results to topK', async () => {
      // Set up test data in the agent's state
      const documents = new Map();
      documents.set('id1', {
        vector: new Float32Array([1, 0, 0]),
        attributes: { title: 'Document 1', category: 'A' }
      });
      documents.set('id2', {
        vector: new Float32Array([0, 1, 0]),
        attributes: { title: 'Document 2', category: 'B' }
      });
      documents.set('id3', {
        vector: new Float32Array([0, 0, 1]),
        attributes: { title: 'Document 3', category: 'C' }
      });
      
      // Set the agent's state
      agent.setState({
        documents: Array.from(documents.entries())
      });
      
      // Query with topK = 1
      const queryVector = [0.9, 0.1, 0.1];
      const results = await agent.query(queryVector, 1, DistanceMetric.cosine);
      
      // Verify only one result is returned
      expect(results.length).toBe(1);
    });
    
    it('should throw an error for unsupported distance metrics', async () => {
      // Set up test data in the agent's state
      const documents = new Map();
      documents.set('id1', {
        vector: new Float32Array([1, 0, 0]),
        attributes: { title: 'Document 1', category: 'A' }
      });
      
      // Set the agent's state
      agent.setState({
        documents: Array.from(documents.entries())
      });
      
      // Query with an unsupported distance metric
      const queryVector = [0.9, 0.1, 0.1];
      
      // Use a non-existent metric to trigger the error
      const unsupportedMetric = 'euclidean' as any;
      
      // Expect the query to throw an error
      await expect(agent.query(queryVector, 1, unsupportedMetric)).rejects.toThrow('Unsupported distance metric');
    });
    
    it('should filter results based on attribute values', async () => {
      // Set up test data in the agent's state
      const documents = new Map();
      documents.set('id1', {
        vector: new Float32Array([1, 0, 0]),
        attributes: { title: 'Document 1', category: 'A' }
      });
      documents.set('id2', {
        vector: new Float32Array([0, 1, 0]),
        attributes: { title: 'Document 2', category: 'B' }
      });
      documents.set('id3', {
        vector: new Float32Array([0, 0, 1]),
        attributes: { title: 'Document 3', category: 'A' }
      });
      
      // Set the agent's state
      agent.setState({
        documents: Array.from(documents.entries())
      });
      
      // Query with a filter for category 'A'
      const queryVector = [0.5, 0.5, 0.5];
      const filters = { category: ['A'] };
      const results = await agent.query(queryVector, 10, DistanceMetric.cosine, filters);
      
      // Verify only documents with category 'A' are returned
      expect(results.length).toBe(2);
      expect(results.every(result => result.attributes.category === 'A')).toBe(true);
      expect(results.map(result => result.id).sort()).toEqual(['id1', 'id3'].sort());
    });
    
    it('should handle complex array filters', async () => {
      // Set up test data in the agent's state
      const documents = new Map();
      documents.set('id1', {
        vector: new Float32Array([1, 0, 0]),
        attributes: { title: 'Document 1', category: 'A' }
      });
      documents.set('id2', {
        vector: new Float32Array([0, 1, 0]),
        attributes: { title: 'Document 2', category: 'B' }
      });
      
      // Set the agent's state
      agent.setState({
        documents: Array.from(documents.entries())
      });
      
      // Query with a complex array filter
      const queryVector = [0.5, 0.5, 0.5];
      const filters = [{ field: 'category', op: 'eq', value: 'A' }];
      
      // This should now filter and only return documents with category 'A'
      const results = await agent.query(queryVector, 10, DistanceMetric.cosine, filters);
      
      // Verify only documents with category 'A' are returned
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('id1');
      expect(results[0].attributes.category).toBe('A');
    });
  });
  
  describe('runMaintenance', () => {
    it('should create metrics table and insert data', async () => {
      // Set up test data in the agent's state
      agent.setState({
        documents: [
          ['id1', { vector: new Float32Array([1, 0, 0]), attributes: { title: 'Document 1' } }],
          ['id2', { vector: new Float32Array([0, 1, 0]), attributes: { title: 'Document 2' } }]
        ]
      });
      
      // Call the runMaintenance method
      await agent.runMaintenance({ timestamp: Date.now() });
      
      // Verify SQL was called to create the table
      expect(agent.sql).toHaveBeenCalledTimes(2);
      
      // Verify schedule was called to set up the next maintenance run
      expect(agent.schedule).toHaveBeenCalledWith(3600, 'runMaintenance', expect.any(Object));
    });
  });
}); 