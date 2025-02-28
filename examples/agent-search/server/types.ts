import { z } from 'zod';

export enum DistanceMetric {
  cosine = "cosine",
  euclidean = "euclidean",
  dot = "dot"
}

export enum FilterOperator {
  Eq = "Eq",
  NotEq = "NotEq",
  In = "In",
  NotIn = "NotIn",
  Lt = "Lt",
  Lte = "Lte",
  Gt = "Gt",
  Gte = "Gte",
  Glob = "Glob",
  NotGlob = "NotGlob",
  IGlob = "IGlob",
  NotIGlob = "NotIGlob",
  And = "And",
  Or = "Or"
}

export type FilterValue = string | number | boolean | null | string[] | number[] | boolean[] | Filter[];

export type Filter = [string, FilterOperator, FilterValue] | [FilterOperator, Filter[]];

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

// Define recursive filter schema
const filterValueSchema: z.ZodType<FilterValue> = z.lazy(() => 
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.string()),
    z.array(z.number()),
    z.array(z.boolean()),
    z.array(filterSchema)
  ])
);

const filterSchema: z.ZodType<Filter> = z.lazy(() => 
  z.union([
    z.tuple([z.string(), z.nativeEnum(FilterOperator), filterValueSchema]),
    z.tuple([z.nativeEnum(FilterOperator), z.array(filterSchema)])
  ])
);

export const querySchema = z.object({
  vector: z.array(z.number()),
  top_k: z.number().int().positive().optional().default(10),
  distance_metric: z.nativeEnum(DistanceMetric).optional().default(DistanceMetric.cosine),
  filters: filterSchema.optional(),
  cursor: z.string().optional()
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