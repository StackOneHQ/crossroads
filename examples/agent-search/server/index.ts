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
  AgentSearch: AgentNamespace<AgentSearch>;
};


interface VectorStoreState {
  documents: Array<[string, Document]>;
}

export class AgentSearch extends Agent<Env, VectorStoreState> {
  // Set initial state
  initialState: VectorStoreState = {
    documents: []
  };
  
  // Helper method to ensure vector is a Float32Array
  private ensureFloat32Array(vector: any): Float32Array {
    if (vector instanceof Float32Array) {
      return vector;
    } 
    
    if (Array.isArray(vector)) {
      console.log("Converting array to Float32Array:", vector.length);
      return new Float32Array(vector);
    }
    
    if (typeof vector === 'object' && vector !== null) {
      // Handle case where vector is stored as an object with numeric keys
      const vectorLength = Object.keys(vector).length;
      console.log("Converting object to Float32Array:", vectorLength);
      const result = new Float32Array(vectorLength);
      
      for (let i = 0; i < vectorLength; i++) {
        result[i] = vector[i] as number;
      }
      
      return result;
    }
    
    console.error("Cannot convert to Float32Array, unexpected type:", typeof vector);
    throw new Error(`Cannot convert to Float32Array: ${typeof vector}`);
  }
  
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

      // Create a Float32Array for the vector
      // Note: When this is serialized to JSON, it will become an object with numeric keys
      // We handle this in the query method
      const vectorArray = this.ensureFloat32Array(vectors[i]);

      documents.set(ids[i], {
        vector: vectorArray,
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
    const queryVec = this.ensureFloat32Array(queryVector);
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
        // Convert vector to Float32Array if it's an object with numeric keys
        let docVector: Float32Array;
        
        try {
          docVector = this.ensureFloat32Array(doc.vector);
        } catch (error) {
          console.error(`Invalid vector format for document ${id}:`, error);
          continue; // Skip this document
        }
        
        const score = cosineSimilarity(queryVec, docVector);
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
  async getStats(): Promise<{ documentCount: number; status: string; vectorFormats?: any }> {
    // Sample a few documents to check vector formats
    const vectorFormats = this.state.documents.slice(0, 3).map(([id, doc]) => {
      let vectorSample: any = null;
      
      if (doc.vector instanceof Float32Array) {
        vectorSample = Array.from(doc.vector).slice(0, 5);
      } else if (typeof doc.vector === 'object' && doc.vector !== null) {
        // Handle object with numeric keys
        vectorSample = Object.keys(doc.vector)
          .slice(0, 5)
          .map(k => [k, (doc.vector as any)[k]]);
      }
      
      return {
        id,
        vectorType: doc.vector instanceof Float32Array ? 'Float32Array' : typeof doc.vector,
        vectorSample
      };
    });
    
    return {
      documentCount: this.state.documents.length,
      status: "healthy",
      vectorFormats
    };
  }
  
  // Maintenance task that runs periodically
  async runMaintenance(data: { timestamp: number }): Promise<void> {
    
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
  console.log("env.AgentSearch methods:", Object.keys(env.AgentSearch));
  
  try {
    const id = env.AgentSearch.idFromName(namespace);
    const stub = env.AgentSearch.get(id);
    
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