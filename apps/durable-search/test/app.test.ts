import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../server';

// Mock the Durable Object namespace
const mockGet = vi.fn();
const mockIdFromName = vi.fn();

// Mock the agent methods
const mockQuery = vi.fn();
const mockUpsert = vi.fn();

// Mock the environment
const mockEnv = {
  DurableSearch: {
    get: mockGet,
    idFromName: mockIdFromName
  }
};

// Mock the Durable Object ID
const mockId = {
  toString: () => 'test-id'
};

describe('Hono App', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Set up default mock implementations
    mockIdFromName.mockReturnValue(mockId);
    mockGet.mockReturnValue({
      query: mockQuery,
      upsert: mockUpsert,
      initialize: vi.fn()
    });
  });
  
  describe('Agent routing', () => {
    it('should route requests to the correct agent', async () => {
      // Mock the agent's query method to return results
      const mockResults = [
        { id: 'doc1', score: 0.95, attributes: { category: 'test' } }
      ];
      mockQuery.mockResolvedValue(mockResults);
      
      // Create a test request
      const request = new Request('https://example.com/v1/namespaces/test-namespace/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vector: [1, 2, 3],
          top_k: 5
        })
      });
      
      // Call the app with the request
      const response = await app.fetch(request, mockEnv as any);
      
      // Verify the response
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(mockResults);
      
      // Verify the agent was created with the correct ID
      expect(mockIdFromName).toHaveBeenCalledWith('test-namespace');
      expect(mockGet).toHaveBeenCalledWith(mockId);
      
      // Verify the agent's query method was called with the correct parameters
      expect(mockQuery).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith(
        [1, 2, 3], // vector
        5, // top_k
        "cosine", // distance_metric
        undefined, // filters (default)
      );
    });
    
    it('should handle errors when routing to agents', async () => {
      // Mock an error when getting the agent
      mockIdFromName.mockImplementation(() => {
        throw new Error('Agent not found');
      });
      
      // Create a test request
      const request = new Request('https://example.com/v1/namespaces/test-namespace/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vector: [1, 2, 3],
          top_k: 5
        })
      });
      
      // Call the app with the request
      const response = await app.fetch(request, mockEnv as any);
      
      // Verify the response is an error
      expect(response.status).toBe(500);
      const responseBody = await response.json() as { success: boolean; message: string };
      expect(responseBody.success).toBe(false);
      expect(responseBody.message).toBe('Agent not found');
    });
  });
  
  describe('Catch-all route', () => {
    it('should return 404 for unmatched routes', async () => {
      // Create a test request for an unmatched route
      const request = new Request('https://example.com/unknown-route', {
        method: 'GET'
      });
      
      // Call the app with the request
      const response = await app.fetch(request, mockEnv as any);
      
      // Verify the response is a 404
      expect(response.status).toBe(404);
      const responseBody = await response.json() as { success: boolean; message: string };
      expect(responseBody.success).toBe(false);
      expect(responseBody.message).toBe('Route not found');
    });
  });
}); 