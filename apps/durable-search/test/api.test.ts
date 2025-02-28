import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../server/index';
import { DistanceMetric, QueryResult } from '../server/types';

// Define response types
interface UpsertResponse {
  success: boolean;
  message: string;
  documentCount?: number;
}

interface ErrorResponse {
  success: boolean;
  message: string;
}

describe('API Integration Tests', () => {
  const namespace = 'test-namespace';
  
  // Helper function to clear the namespace before each test
  beforeEach(async () => {
    // No clear endpoint available, we'll just proceed with tests
  });
  
  describe('Upsert Endpoint', () => {
    it('should successfully upsert documents', async () => {
      const response = await app.request(`/v1/namespaces/${namespace}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: ['doc1', 'doc2'],
          vectors: [
            [1, 0, 0],
            [0, 1, 0],
          ],
          attributes: {
            title: ['First Document', 'Second Document'],
            category: ['A', 'B'],
          }
        }),
      }, env);
      
      expect(response.status).toBe(200);
      const data = await response.json() as UpsertResponse;
      expect(data.success).toBe(true);
      expect(data.message).toBe('Upserted');
    });
    
    it('should reject invalid upsert requests', async () => {
      // Missing vectors
      const response = await app.request(`/v1/namespaces/${namespace}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: ['doc1'],
          // vectors missing
          attributes: {
            title: ['First Document'],
          }
        }),
      }, env);
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('Query Endpoint', () => {
    // Insert test data before querying
    beforeEach(async () => {
      await app.request(`/v1/namespaces/${namespace}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: ['doc1', 'doc2', 'doc3'],
          vectors: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
          attributes: {
            title: ['First Document', 'Second Document', 'Third Document'],
            category: ['A', 'B', 'C'],
          }
        }),
      }, env);
    });
    
    it('should return query results sorted by similarity', async () => {
      const response = await app.request(`/v1/namespaces/${namespace}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector: [1, 0.1, 0],
          top_k: 2,
          distance_metric: DistanceMetric.cosine,
        }),
      }, env);
      
      expect(response.status).toBe(200);
      const responseData = await response.json() as { results: QueryResult[] };
      const results = responseData.results;
      
      // Verify results
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      
      // First result should be doc1 (most similar to query vector)
      expect(results[0].id).toBe('doc1');
      expect(results[0].score).toBeGreaterThan(0.9); // High similarity
      expect(results[0].attributes.title).toBe('First Document');
      expect(results[0].attributes.category).toBe('A');
      
      // Second result should have lower similarity
      expect(results[1].score).toBeLessThan(results[0].score);
    });
    
    it('should respect the top_k parameter', async () => {
      const response = await app.request(`/v1/namespaces/${namespace}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector: [0.33, 0.33, 0.33], // Equally similar to all vectors
          top_k: 1, // Only return the top result
          distance_metric: DistanceMetric.cosine,
        }),
      }, env);
      
      expect(response.status).toBe(200);
      const responseData = await response.json() as { results: QueryResult[] };
      
      // Verify results
      expect(Array.isArray(responseData.results)).toBe(true);
      expect(responseData.results.length).toBe(1); // Only one result due to top_k=1
    });
    
    it('should reject invalid query requests', async () => {
      // Missing vector
      const response = await app.request(`/v1/namespaces/${namespace}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // vector missing
          top_k: 10,
          distance_metric: DistanceMetric.cosine,
        }),
      }, env);
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('Direct Agent Access', () => {
    it('should allow direct access to the agent', async () => {
      // First, insert some data
      const res = await app.request(`/v1/namespaces/${namespace}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: ['direct1', 'direct2'],
          vectors: [
            [1, 1, 0],
            [0, 1, 1],
          ],
          attributes: {
            title: ['Direct Access 1', 'Direct Access 2'],
          }
        }),
      }, env);

      console.log(res);
      
      // Now access the agent directly via stats endpoint
      const response = await app.request(`/v1/namespaces/${namespace}/stats`, {
        method: 'GET',
      }, env);
      
      expect(response.status).toBe(200);
      const results = await response.json() as { documentCount: number; status: string };
      
      // Verify results
      expect(results).toHaveProperty('status');
      expect(results).toHaveProperty('documentCount');
      expect(results.documentCount).toBeGreaterThan(0);
    });
  });
  
  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await app.request('/unknown-route', {
        method: 'GET',
      }, env);
      
      expect(response.status).toBe(404);
      const data = await response.json() as ErrorResponse;
      expect(data.success).toBe(false);
      expect(data.message).toBe('Route not found');
    });
  });
}); 