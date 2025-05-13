import { describe, expect, it } from 'vitest';
import { cosineSimilarity } from '../server/similarity';

describe('Similarity Functions', () => {
  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity between two vectors', () => {
      // Test with identical vectors (should be 1.0)
      const vec1 = new Float32Array([1, 2, 3]);
      const vec2 = new Float32Array([1, 2, 3]);
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1.0);

      // Test with orthogonal vectors (should be 0.0)
      const vec3 = new Float32Array([1, 0, 0]);
      const vec4 = new Float32Array([0, 1, 0]);
      expect(cosineSimilarity(vec3, vec4)).toBeCloseTo(0.0);

      // Test with opposite vectors (should be -1.0)
      const vec5 = new Float32Array([1, 2, 3]);
      const vec6 = new Float32Array([-1, -2, -3]);
      expect(cosineSimilarity(vec5, vec6)).toBeCloseTo(-1.0);

      // Test with real-world example
      const vec7 = new Float32Array([0.2, 0.5, 0.3]);
      const vec8 = new Float32Array([0.1, 0.6, 0.2]);
      // Calculate expected result manually
      // cosine similarity = (0.2*0.1 + 0.5*0.6 + 0.3*0.2) / (sqrt(0.2^2 + 0.5^2 + 0.3^2) * sqrt(0.1^2 + 0.6^2 + 0.2^2))
      // = 0.38 / (sqrt(0.38) * sqrt(0.41)) = 0.38 / 0.3948 = 0.9627
      expect(cosineSimilarity(vec7, vec8)).toBeCloseTo(0.9627, 4);
    });

    it('should handle zero vectors', () => {
      const zeroVec = new Float32Array([0, 0, 0]);
      const vec = new Float32Array([1, 2, 3]);

      // Similarity with zero vector should be 0
      expect(cosineSimilarity(zeroVec, vec)).toBeCloseTo(0);
      expect(cosineSimilarity(vec, zeroVec)).toBeCloseTo(0);
    });

    it('should handle vectors of different dimensions', () => {
      const vec1 = new Float32Array([1, 2, 3]);
      const vec2 = new Float32Array([1, 2]);

      // This should throw an error or handle the case gracefully
      // Depending on the implementation, adjust the test accordingly
      expect(() => cosineSimilarity(vec1, vec2)).toThrow();
    });
  });
});
