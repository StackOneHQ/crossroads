import { z } from 'zod';

export enum DistanceMetric {
  cosine = "cosine",
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
  ids: z.array(z.string().uuid()),
  vectors: z.array(z.array(z.number())),
  attributes: z.record(z.string(), z.array(z.string())),
  distance_metric: z.nativeEnum(DistanceMetric),
  schema: SchemaDefinitionSchema.optional()
});

export const querySchema = z.object({
  vector: z.array(z.number()),
  filters: z.union([
    z.array(z.any()),
    z.record(z.string(), z.array(z.any()))
  ]).optional(),
  top_k: z.number().int().min(1).default(10),
  distance_metric: z.nativeEnum(DistanceMetric).default(DistanceMetric.cosine),
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