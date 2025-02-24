import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import { cosineSimilarity } from "./search/similarity";
import {
  DistanceMetric,
  Document,
  QueryResult,
  querySchema,
  upsertSchema,
} from "./types";

export type Env = {
	DurableSearch: DurableObjectNamespace<DurableSearch>;
};

export class DurableSearch extends DurableObject<Env> {
  private documents: Map<string, Document> = new Map();


	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
	}

  async upsert(
    ids: string[], 
    vectors: number[][], 
    attributes: Record<string, string[]>
  ): Promise<void> {
    // Validate all arrays have the same length
    const length = ids.length;
    if (vectors.length !== length) {
      throw new Error('Vectors array length must match ids length');
    }
    
    // Validate all attribute arrays have correct length
    for (const [key, values] of Object.entries(attributes)) {
      if (values.length !== length) {
        throw new Error(`Attribute "${key}" array length must match ids length`);
      }
    }

    // Store each document with its vector and attributes
    for (let i = 0; i < length; i++) {
      // Convert attribute arrays into a single object for this document
      const documentAttributes: Record<string, string | null> = {};
      for (const [key, values] of Object.entries(attributes)) {
        documentAttributes[key] = values[i];
      }

      this.documents.set(ids[i], {
        vector: new Float32Array(vectors[i]),
        attributes: documentAttributes
      });
    }
    
    await this.ctx.storage.put('documents', Array.from(this.documents.entries()));
  }

	async query(queryVector: number[], topK = 10, distanceMetric: DistanceMetric): Promise<QueryResult[]> {
		const results: QueryResult[] = [];
		const queryVec = new Float32Array(queryVector);

		for (const [id, doc] of this.documents.entries()) {
      if (distanceMetric === DistanceMetric.cosine) {
        const score = cosineSimilarity(queryVec, doc.vector);
        results.push({ 
          id, 
				score,
				attributes: doc.attributes 
			});
      } else {
        throw new Error(`Unsupported distance metric: ${distanceMetric}`);
      }
		}

		return results
			.sort((a, b) => b.score - a.score)
			.slice(0, topK);
	}
}

const app = new Hono<{ Bindings: Env }>();

// https://turbopuffer.com/docs/upsert
app.post("/v1/namespaces/:namespace", async (c) => {
	const namespace = c.req.param("namespace");
	const id = c.env.DurableSearch.idFromName(namespace);
	const durableSearch = c.env.DurableSearch.get(id);

	const body = await c.req.json();
	const parsedBody = upsertSchema.parse(body);

	await durableSearch.upsert(
		parsedBody.ids,
		parsedBody.vectors,
		parsedBody.attributes,
	);

	return c.json({
		success: true,
		message: "Upserted",
	});
});

// https://turbopuffer.com/docs/query
app.post("/v1/namespaces/:namespace/query", async (c) => {
	const namespace = c.req.param("namespace");
	const id = c.env.DurableSearch.idFromName(namespace);
	const durableSearch = c.env.DurableSearch.get(id);

	const body = await c.req.json();
	const parsedBody = querySchema.parse(body);

	const results = await durableSearch.query(
    parsedBody.vector,
    parsedBody.top_k,
    parsedBody.distance_metric,
  );

	return c.json(results);
});

// Catch-all route for unmatched paths
app.get("*", async (c) => {
	return c.json({
		success: false,
		message: "Route not found",
	});
});

export default app;
