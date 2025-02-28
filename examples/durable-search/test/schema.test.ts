import { describe, expect, it } from 'vitest';
import { DistanceMetric, querySchema, upsertSchema } from '../server/types';

describe('Schema Validation', () => {
  describe('upsertSchema', () => {
    it('should validate valid upsert data', () => {
      const validData = {
        ids: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
        vectors: [[1, 2, 3], [4, 5, 6]],
        attributes: {
          title: ['Document 1', 'Document 2'],
          category: ['A', 'B']
        },
        distance_metric: DistanceMetric.cosine,
        schema: {
          title: { type: 'string', full_text_search: true },
          category: { type: 'string' }
        }
      };
      
      // Should not throw
      expect(() => upsertSchema.parse(validData)).not.toThrow();
      
      // Should return the parsed data
      const parsed = upsertSchema.parse(validData);
      expect(parsed).toEqual(validData);
    });
    
    it('should reject invalid upsert data', () => {
      // Missing required fields
      const missingFields = {
        ids: ['123e4567-e89b-12d3-a456-426614174000'],
        // Missing vectors
        attributes: {
          title: ['Document 1']
        }
      };
      
      expect(() => upsertSchema.parse(missingFields)).toThrow();
      
      // Invalid UUID
      const invalidUuid = {
        ids: ['not-a-uuid'],
        vectors: [[1, 2, 3]],
        attributes: {
          title: ['Document 1']
        },
        distance_metric: DistanceMetric.cosine,
        schema: {
          title: { type: 'string' }
        }
      };
      
      expect(() => upsertSchema.parse(invalidUuid)).toThrow();
      
      // Invalid schema type
      const invalidSchemaType = {
        ids: ['123e4567-e89b-12d3-a456-426614174000'],
        vectors: [[1, 2, 3]],
        attributes: {
          title: ['Document 1']
        },
        distance_metric: DistanceMetric.cosine,
        schema: {
          title: { type: 'invalid-type' } // Invalid type
        }
      };
      
      expect(() => upsertSchema.parse(invalidSchemaType)).toThrow();
    });
  });
  
  describe('querySchema', () => {
    it('should validate valid query data', () => {
      const validData = {
        vector: [1, 2, 3],
        top_k: 10,
        distance_metric: DistanceMetric.cosine
      };
      
      // Should not throw
      expect(() => querySchema.parse(validData)).not.toThrow();
      
      // Should return the parsed data
      const parsed = querySchema.parse(validData);
      expect(parsed).toEqual(validData);
    });
    
    it('should apply default values', () => {
      // Only provide the required vector
      const minimalData = {
        vector: [1, 2, 3]
      };
      
      const parsed = querySchema.parse(minimalData);
      
      // Should have default values
      expect(parsed.top_k).toBe(10);
      expect(parsed.distance_metric).toBe(DistanceMetric.cosine);
    });
    
    it('should reject invalid query data', () => {
      // Missing required vector
      const missingVector = {
        top_k: 10
      };
      
      expect(() => querySchema.parse(missingVector)).toThrow();
      
      // Invalid top_k (must be positive integer)
      const invalidTopK = {
        vector: [1, 2, 3],
        top_k: -5
      };
      
      expect(() => querySchema.parse(invalidTopK)).toThrow();
      
      // Invalid distance_metric
      const invalidMetric = {
        vector: [1, 2, 3],
        distance_metric: 'invalid-metric'
      };
      
      expect(() => querySchema.parse(invalidMetric)).toThrow();
    });
  });
}); 