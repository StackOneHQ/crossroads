import { z } from 'zod';

export enum DistanceMetric {
  cosine = "cosine",
  euclidean = "euclidean",
  dot = "dot"
}

export const AttributeConfigSchema = z.object({
  type: z.union([
    z.literal('string'),
    z.literal('[]uuid')
  ]),
  full_text_search: z.boolean().optional()
});

export type AttributeConfig = z.infer<typeof AttributeConfigSchema>;

const SchemaDefinitionSchema = z.record(z.string(), AttributeConfigSchema);
export type SchemaDefinition = z.infer<typeof SchemaDefinitionSchema>;

export const upsertSchema = z.object({
  ids: z.array(z.string()),
  vectors: z.array(z.union([z.array(z.number()), z.null()])),
  attributes: z.record(z.string(), z.array(z.string().nullable())),
});

export const querySchema = z.object({
  vector: z.array(z.number()),
  top_k: z.number().int().positive().optional().default(10),
  distance_metric: z.nativeEnum(DistanceMetric).optional().default(DistanceMetric.cosine),
  filters: z.union([
    z.record(z.string(), z.array(z.any())),
    z.array(z.object({
      field: z.string(),
      op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in']),
      value: z.any()
    }))
  ]).optional()
});

type AttributeValue = string | null;

export type QueryResult = {
  id: string;
  score: number;
  attributes: Record<string, AttributeValue>;
};

export type Document = {
  vector: Float32Array;
  attributes: Record<string, AttributeValue>;
};