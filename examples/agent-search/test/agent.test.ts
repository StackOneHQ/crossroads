import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentSearch } from '../server';
import { DistanceMetric, FilterOperator } from '../server/types';

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
      ctx = {
        storage: {
          put: vi.fn(),
          get: vi.fn(),
          delete: vi.fn()
        }
      };
    }
  };
});

describe('AgentSearch', () => {
  let agent: AgentSearch;
  
  beforeEach(() => {
    // Create a new agent instance before each test
    agent = new AgentSearch({} as any, {} as any);
    
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
        documents: Array.from(documents.entries()),
        totalVectorCount: 3
      });
      
      // Query vector that is most similar to id1
      const queryVector = [0.9, 0.1, 0.1];
      const response = await agent.query(queryVector, 2, DistanceMetric.cosine);
      
      // Verify the results
      expect(response.results.length).toBe(2);
      expect(response.results[0].id).toBe('id1'); // Most similar should be id1
      expect(response.results[0].score).toBeGreaterThan(response.results[1].score);
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
        documents: Array.from(documents.entries()),
        totalVectorCount: 3
      });
      
      // Query with topK = 1
      const queryVector = [0.9, 0.1, 0.1];
      const response = await agent.query(queryVector, 1, DistanceMetric.cosine);
      
      // Verify only one result is returned
      expect(response.results.length).toBe(1);
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
        documents: Array.from(documents.entries()),
        totalVectorCount: 1
      });
      
      // Query with an unsupported distance metric
      const queryVector = [0.9, 0.1, 0.1];
      
      // Expect the query to throw an error
      await expect(agent.query(queryVector, 10, 'invalid_metric' as any)).rejects.toThrow();
    });
    
    it('should filter results based on attribute values using Eq operator', async () => {
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
        documents: Array.from(documents.entries()),
        totalVectorCount: 3
      });
      
      // Query with filter for category = 'A'
      const queryVector = [0.9, 0.1, 0.1];
      const response = await agent.query(
        queryVector, 
        10, 
        DistanceMetric.cosine, 
        ['category', FilterOperator.Eq, 'A']
      );
      
      // Verify only documents with category 'A' are returned
      expect(response.results.length).toBe(2);
      expect(response.results.every(result => result.attributes.category === 'A')).toBe(true);
      expect(response.results.map(result => result.id).sort()).toEqual(['id1', 'id3'].sort());
    });
    
    it('should handle complex array filters with In operator', async () => {
      // Set up test data in the agent's state
      const documents = new Map();
      documents.set('id1', {
        vector: new Float32Array([1, 0, 0]),
        attributes: { title: 'Document 1', category: 'A', tags: 'tag1,tag2' }
      });
      documents.set('id2', {
        vector: new Float32Array([0, 1, 0]),
        attributes: { title: 'Document 2', category: 'B', tags: 'tag2,tag3' }
      });
      
      // Set the agent's state
      agent.setState({
        documents: Array.from(documents.entries()),
        totalVectorCount: 2
      });
      
      // Query with In operator for tags containing tag1
      const queryVector = [0.9, 0.1, 0.1];
      const response = await agent.query(
        queryVector, 
        10, 
        DistanceMetric.cosine, 
        ['tags', FilterOperator.Glob, '*tag1*']
      );
      
      // Verify only documents with tag1 are returned
      expect(response.results.length).toBe(1);
      expect(response.results[0].id).toBe('id1');
    });

    it('should handle And filters', async () => {
      // Set up test data in the agent's state
      const documents = new Map();
      documents.set('id1', {
        vector: new Float32Array([1, 0, 0]),
        attributes: { title: 'Document 1', category: 'A', year: '2022' }
      });
      documents.set('id2', {
        vector: new Float32Array([0, 1, 0]),
        attributes: { title: 'Document 2', category: 'A', year: '2023' }
      });
      documents.set('id3', {
        vector: new Float32Array([0, 0, 1]),
        attributes: { title: 'Document 3', category: 'B', year: '2022' }
      });
      
      // Set the agent's state
      agent.setState({
        documents: Array.from(documents.entries()),
        totalVectorCount: 3
      });
      
      // Query with And filter for category = 'A' AND year = '2022'
      const queryVector = [0.9, 0.1, 0.1];
      const response = await agent.query(
        queryVector, 
        10, 
        DistanceMetric.cosine, 
        [FilterOperator.And, [
          ['category', FilterOperator.Eq, 'A'],
          ['year', FilterOperator.Eq, '2022']
        ]]
      );
      
      // Verify only documents with category 'A' and year '2022' are returned
      expect(response.results.length).toBe(1);
      expect(response.results[0].id).toBe('id1');
    });

    it('should handle Or filters', async () => {
      // Set up test data in the agent's state
      const documents = new Map();
      documents.set('id1', {
        vector: new Float32Array([1, 0, 0]),
        attributes: { title: 'Document 1', category: 'A', year: '2022' }
      });
      documents.set('id2', {
        vector: new Float32Array([0, 1, 0]),
        attributes: { title: 'Document 2', category: 'B', year: '2023' }
      });
      documents.set('id3', {
        vector: new Float32Array([0, 0, 1]),
        attributes: { title: 'Document 3', category: 'C', year: '2022' }
      });
      
      // Set the agent's state
      agent.setState({
        documents: Array.from(documents.entries()),
        totalVectorCount: 3
      });
      
      // Query with Or filter for category = 'A' OR category = 'B'
      const queryVector = [0.9, 0.1, 0.1];
      const response = await agent.query(
        queryVector, 
        10, 
        DistanceMetric.cosine, 
        [FilterOperator.Or, [
          ['category', FilterOperator.Eq, 'A'],
          ['category', FilterOperator.Eq, 'B']
        ]]
      );
      
      // Verify only documents with category 'A' or 'B' are returned
      expect(response.results.length).toBe(2);
      expect(response.results.map(result => result.id).sort()).toEqual(['id1', 'id2'].sort());
    });

    it('should handle complex nested filters', async () => {
      // Set up test data in the agent's state
      const documents = new Map();
      documents.set('id1', {
        vector: new Float32Array([1, 0, 0]),
        attributes: { title: 'Document 1', category: 'A', year: '2022', format: 'pdf' }
      });
      documents.set('id2', {
        vector: new Float32Array([0, 1, 0]),
        attributes: { title: 'Document 2', category: 'B', year: '2023', format: 'doc' }
      });
      documents.set('id3', {
        vector: new Float32Array([0, 0, 1]),
        attributes: { title: 'Document 3', category: 'A', year: '2023', format: 'pdf' }
      });
      documents.set('id4', {
        vector: new Float32Array([1, 1, 0]),
        attributes: { title: 'Document 4', category: 'C', year: '2022', format: 'txt' }
      });
      
      // Set the agent's state
      agent.setState({
        documents: Array.from(documents.entries()),
        totalVectorCount: 4
      });
      
      // Query with complex nested filter:
      // (category = 'A' AND year = '2023') OR (category = 'C' AND format = 'txt')
      const queryVector = [0.9, 0.1, 0.1];
      const response = await agent.query(
        queryVector, 
        10, 
        DistanceMetric.cosine, 
        [FilterOperator.Or, [
          [FilterOperator.And, [
            ['category', FilterOperator.Eq, 'A'],
            ['year', FilterOperator.Eq, '2023']
          ]],
          [FilterOperator.And, [
            ['category', FilterOperator.Eq, 'C'],
            ['format', FilterOperator.Eq, 'txt']
          ]]
        ]]
      );
      
      // Verify only documents matching the complex filter are returned
      expect(response.results.length).toBe(2);
      expect(response.results.map(result => result.id).sort()).toEqual(['id3', 'id4'].sort());
    });

    it('should handle filters on document IDs', async () => {
      // Set up test data in the agent's state
      const documents = new Map();
      documents.set('id1', {
        vector: new Float32Array([1, 0, 0]),
        attributes: { title: 'Document 1' }
      });
      documents.set('id2', {
        vector: new Float32Array([0, 1, 0]),
        attributes: { title: 'Document 2' }
      });
      documents.set('id3', {
        vector: new Float32Array([0, 0, 1]),
        attributes: { title: 'Document 3' }
      });
      
      // Set the agent's state
      agent.setState({
        documents: Array.from(documents.entries()),
        totalVectorCount: 3
      });
      
      // Query with filter for specific IDs
      const queryVector = [0.9, 0.1, 0.1];
      const response = await agent.query(
        queryVector, 
        10, 
        DistanceMetric.cosine, 
        ['id', FilterOperator.In, ['id1', 'id3']]
      );
      
      // Verify only documents with the specified IDs are returned
      expect(response.results.length).toBe(2);
      expect(response.results.map(result => result.id).sort()).toEqual(['id1', 'id3'].sort());
    });

    it('should handle null values in filters', async () => {
      // Set up test data in the agent's state
      const documents = new Map();
      documents.set('id1', {
        vector: new Float32Array([1, 0, 0]),
        attributes: { title: 'Document 1', category: 'A' }
      });
      documents.set('id2', {
        vector: new Float32Array([0, 1, 0]),
        attributes: { title: 'Document 2', category: null }
      });
      documents.set('id3', {
        vector: new Float32Array([0, 0, 1]),
        attributes: { title: 'Document 3' }
      });
      
      // Set the agent's state
      agent.setState({
        documents: Array.from(documents.entries()),
        totalVectorCount: 3
      });
      
      // Query with filter for null category
      const queryVector = [0.9, 0.1, 0.1];
      const response = await agent.query(
        queryVector, 
        10, 
        DistanceMetric.cosine, 
        ['category', FilterOperator.Eq, null]
      );
      
      // Verify only documents with null category are returned
      expect(response.results.length).toBe(2);
      expect(response.results.map(result => result.id).sort()).toEqual(['id2', 'id3'].sort());
    });
  });
  
  describe('runMaintenance', () => {
    it('should create metrics table and insert data', async () => {
      // Set up test data in the agent's state
      agent.setState({
        documents: [
          ['id1', { vector: new Float32Array([1, 0, 0]), attributes: { title: 'Document 1' } }],
          ['id2', { vector: new Float32Array([0, 1, 0]), attributes: { title: 'Document 2' } }]
        ],
        totalVectorCount: 2
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