import { Agent, AgentNamespace } from "agents-sdk";
import { Hono } from "hono";
import { cosineSimilarity } from "./similarity";
import {
  DistanceMetric,
  Document,
  QueryResult,
  querySchema,
  upsertSchema
} from "./types";

export type Env = {
  DurableSearchAgent: AgentNamespace<DurableSearchAgent>;
};


interface VectorStoreState {
  documents: Array<[string, Document]>;
}

export class DurableSearchAgent extends Agent<Env, VectorStoreState> {
  // Set initial state
  initialState: VectorStoreState = {
    documents: []
  };
  
  // Upsert documents with vectors and attributes
  async upsert(
    ids: string[], 
    vectors: number[][], 
    attributes: Record<string, (string | null)[]>,
  ): Promise<void> {
    console.log(`Upsert called with ${ids.length} documents`);
    
    // Validate all arrays have the same length
    const length = ids.length;
    if (vectors.length !== length) {
      console.error("Validation error: Vectors array length mismatch");
      throw new Error('Vectors array length must match ids length');
    }
    
    // Validate all attribute arrays have correct length
    for (const [key, values] of Object.entries(attributes)) {
      if (values.length !== length) {
        console.error(`Validation error: Attribute "${key}" array length mismatch`);
        throw new Error(`Attribute "${key}" array length must match ids length`);
      }
    }

    // Get current documents from state
    console.log("Current state documents length:", this.state?.documents?.length || 0);
    const documents = new Map(this.state.documents || []);
    
    // Store each document with its vector and attributes
    console.log("Processing documents for upsert");
    for (let i = 0; i < length; i++) {
      // Convert attribute arrays into a single object for this document
      const documentAttributes: Record<string, string | null> = {};
      for (const [key, values] of Object.entries(attributes)) {
        documentAttributes[key] = values[i];
      }

      documents.set(ids[i], {
        vector: new Float32Array(vectors[i]),
        attributes: documentAttributes
      });
    }
    
    // Update state with new documents using the built-in setState method
    console.log(`Setting state with ${documents.size} documents`);
    this.setState({
      documents: Array.from(documents.entries())
    });
    console.log("State updated successfully");
    
    // Schedule a maintenance task to run in the background
    console.log("Scheduling maintenance task");
    await this.schedule(60, "runMaintenance", { timestamp: Date.now() });
    console.log("Maintenance task scheduled");
  }

  // Query for similar vectors
  async query(
    queryVector: number[], 
    topK = 10, 
    distanceMetric: DistanceMetric = DistanceMetric.cosine,
    filters?: Record<string, any[]> | any[]
  ): Promise<QueryResult[]> {
    console.log(`Query called with vector of length ${queryVector.length}, topK=${topK}`);
    console.log("Filters:", filters ? JSON.stringify(filters).substring(0, 200) + "..." : "none");
    
    const results: QueryResult[] = [];
    const queryVec = new Float32Array(queryVector);
    const documents = new Map(this.state.documents || []);
    console.log(`Processing query against ${documents.size} documents`);

    for (const [id, doc] of documents.entries()) {
      // Skip documents that don't match filters
      if (filters) {
        if (Array.isArray(filters)) {
          // Handle array filters (complex filter expressions)
          let matchesFilters = true;
          for (const filter of filters) {
            if (typeof filter === 'object' && 'field' in filter && 'op' in filter && 'value' in filter) {
              const { field, op, value } = filter;
              const attributeValue = doc.attributes[field];
              
              if (!attributeValue) {
                matchesFilters = false;
                break;
              }
              
              switch (op) {
                case 'eq':
                  if (attributeValue !== value) {
                    matchesFilters = false;
                  }
                  break;
                case 'neq':
                  if (attributeValue === value) {
                    matchesFilters = false;
                  }
                  break;
                case 'gt':
                  if (!(attributeValue > value)) {
                    matchesFilters = false;
                  }
                  break;
                case 'gte':
                  if (!(attributeValue >= value)) {
                    matchesFilters = false;
                  }
                  break;
                case 'lt':
                  if (!(attributeValue < value)) {
                    matchesFilters = false;
                  }
                  break;
                case 'lte':
                  if (!(attributeValue <= value)) {
                    matchesFilters = false;
                  }
                  break;
                case 'in':
                  if (Array.isArray(value) && !value.includes(attributeValue)) {
                    matchesFilters = false;
                  }
                  break;
                default:
                  // Unsupported operator
                  matchesFilters = false;
              }
              
              if (!matchesFilters) break;
            } else {
              // Invalid filter format
              matchesFilters = false;
              break;
            }
          }
          if (!matchesFilters) continue;
        } else if (typeof filters === 'object') {
          // Handle object filters (attribute matching)
          let matchesFilters = true;
          for (const [key, values] of Object.entries(filters)) {
            const attributeValue = doc.attributes[key];
            if (!attributeValue || !values.includes(attributeValue)) {
              matchesFilters = false;
              break;
            }
          }
          if (!matchesFilters) continue;
        }
      }

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

    console.log(`Query returning ${results.length} results`);
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // Override onStateUpdate to handle state changes
  onStateUpdate(state: VectorStoreState | undefined, source: any): void {
    console.log(`State updated with ${state?.documents.length || 0} documents, source:`, source);
  }



  // Get the number of documents in the store
  async getStats(): Promise<{ documentCount: number; status: string }> {
    return {
      documentCount: this.state.documents.length,
      status: "healthy"
    };
  }
  
  // Maintenance task that runs periodically
  async runMaintenance(data: { timestamp: number }): Promise<void> {
    console.log(`Running maintenance task at ${new Date().toISOString()}, triggered from ${new Date(data.timestamp).toISOString()}`);
    
    // Example: Use SQL to store some metrics
    this.sql`
      CREATE TABLE IF NOT EXISTS vector_store_metrics (
        timestamp INTEGER PRIMARY KEY,
        document_count INTEGER,
        last_maintenance TEXT
      )
    `;
    
    this.sql`
      INSERT INTO vector_store_metrics (timestamp, document_count, last_maintenance)
      VALUES (${Date.now()}, ${this.state.documents.length}, ${new Date().toISOString()})
    `;
    
    // Schedule the next maintenance run (every hour)
    await this.schedule(3600, "runMaintenance", { timestamp: Date.now() });
  }

  async getState(): Promise<VectorStoreState> {
    return this.state;
  }
}

const app = new Hono<{ Bindings: Env }>();


enum VectorStoreRoutes {
  Get = "get",
  Upsert = "upsert",
  Query = "query",
  Stats = "stats"
}

// Routes
app.post("/v1/namespaces/:namespace", async (c) => {
  const namespace = c.req.param("namespace");

  if (!namespace) {
    return c.json({
      success: false,
      message: "Namespace name is required"
    }, 400);
  }

  return await routeVectorStoreRequest(namespace, VectorStoreRoutes.Upsert, c.req.raw, c.env);
});

app.get("/v1/namespaces/:namespace", async (c) => {
  const namespace = c.req.param("namespace");

  if (!namespace) {
    return c.json({
      success: false,
      message: "Namespace name is required"
    }, 400);
  }

  return await routeVectorStoreRequest(namespace, VectorStoreRoutes.Get, c.req.raw, c.env);
});

app.post("/v1/namespaces/:namespace/query", async (c) => {
  const namespace = c.req.param("namespace");

  if (!namespace) {
    return c.json({
      success: false,
      message: "Namespace name is required"
    }, 400);
  }

  return await routeVectorStoreRequest(namespace, VectorStoreRoutes.Query, c.req.raw, c.env);
});

app.get("/v1/namespaces/:namespace/stats", async (c) => {
  const namespace = c.req.param("namespace");

  if (!namespace) {
    return c.json({
      success: false,
      message: "Namespace name is required"
    }, 400);
  }

  return await routeVectorStoreRequest(namespace, VectorStoreRoutes.Stats, c.req.raw, c.env);
});

// Catch-all route for unmatched paths
app.get("*", async (c) => {
  return c.json({
    success: false,
    message: "Route not found"
  }, 404);
});

export default app;


const routeVectorStoreRequest = async (
  namespace: string,
  route: VectorStoreRoutes,
  req: Request,
  env: Env,
): Promise<Response> => {
  console.log("routeVectorStoreRequest called with namespace:", namespace, "route:", route);
  console.log("env.DurableSearchAgent methods:", Object.keys(env.DurableSearchAgent));
  
  try {
    const id = env.DurableSearchAgent.idFromName(namespace);
    const stub = env.DurableSearchAgent.get(id);
    
    switch (route) {
      case VectorStoreRoutes.Upsert:
        try {
          const body = await req.json();
          
          try {
            const parsedBody = upsertSchema.parse(body);
            
            await stub.upsert(
              parsedBody.ids,
              parsedBody.vectors,
              parsedBody.attributes
            );
            
            return Response.json({
              success: true,
              message: "Upserted",
              documentCount: stub.state.documents.length
            });
          } catch (validationError) {
            return Response.json({
              success: false,
              message: validationError instanceof Error ? validationError.message : "Validation error"
            }, { status: 400 });
          }
        } catch (error) {
          return Response.json({
            success: false,
            message: error instanceof Error ? error.message : "Unknown error"
          }, { status: 400 });
        }
      case VectorStoreRoutes.Get:
        return Response.json(await stub.getState());
      case VectorStoreRoutes.Query:
        try {
          const body = await req.json();
          const parsedBody = querySchema.parse(body);
          
          const results = await stub.query(
            parsedBody.vector,
            parsedBody.top_k,
            parsedBody.distance_metric,
            parsedBody.filters
          );
          
          return Response.json(results);
        } catch (error) {
          return Response.json({
            success: false,
            message: error instanceof Error ? error.message : "Unknown error"
          }, { status: 400 });
        }
      case VectorStoreRoutes.Stats:
        return Response.json(await stub.getStats());
      default:
        console.log("Unknown route:", route);
        return new Response("Not found", { status: 404 });
    }
  } catch (error) {
    console.error("Error in routeVectorStoreRequest:", error);
    return Response.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}