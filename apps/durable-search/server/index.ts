import { Agent, AgentNamespace } from "agents-sdk";
import { Hono } from "hono";
import { cosineSimilarity } from "./similarity";
import {
  DistanceMetric,
  Document,
  Filter,
  FilterOperator,
  QueryResult,
  querySchema,
  upsertSchema
} from "./types";

export type Env = {
  DurableSearch: AgentNamespace<DurableSearch>;
};

interface VectorStoreState {
  documents: Array<[string, Document]>;
  // Track when the index was last persisted to storage
  lastPersisted?: number;
  // Track total vector count for stats
  totalVectorCount: number;
}

// Batch size for storage operations
const STORAGE_BATCH_SIZE = 1000;

export class DurableSearch extends Agent<Env, VectorStoreState> {
  // Set initial state
  initialState: VectorStoreState = {
    documents: [],
    totalVectorCount: 0
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
  
  // Persist the entire index to storage in batches
  private async persistIndex(): Promise<void> {
    console.log(`Persisting index with ${this.state.documents.length} documents`);
    
    // Store the entire index as a single compressed blob
    // This is much more efficient than storing individual vectors
    try {
      // Split into batches to avoid storage limits
      const batches: Array<Array<[string, Document]>> = [];
      const documents = this.state.documents;
      
      for (let i = 0; i < documents.length; i += STORAGE_BATCH_SIZE) {
        batches.push(documents.slice(i, i + STORAGE_BATCH_SIZE));
      }
      
      console.log(`Split index into ${batches.length} batches`);
      
      // Store each batch with a batch index
      const storePromises = batches.map((batch, index) => 
        this.ctx.storage.put(`index_batch_${index}`, batch)
      );
      
      // Store batch count for loading
      await this.ctx.storage.put('index_batch_count', batches.length);
      
      // Wait for all batches to be stored
      await Promise.all(storePromises);
      
      // Update state to track when we last persisted
      this.setState({
        ...this.state,
        lastPersisted: Date.now()
      });
      
      console.log(`Successfully persisted index in ${batches.length} batches`);
    } catch (error) {
      console.error("Error persisting index:", error);
      throw new Error(`Failed to persist index: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Load the index from storage
  private async loadIndex(): Promise<Array<[string, Document]>> {
    try {
      // Get the number of batches
      const batchCount = await this.ctx.storage.get('index_batch_count') as number;
      
      if (!batchCount) {
        console.log("No index found in storage");
        return [];
      }
      
      console.log(`Loading index from ${batchCount} batches`);
      
      // Load all batches in parallel
      const batchPromises = Array.from({ length: batchCount }, (_, index) => 
        this.ctx.storage.get(`index_batch_${index}`) as Promise<Array<[string, Document]>>
      );
      
      const batches = await Promise.all(batchPromises);
      
      // Combine all batches
      const documents = batches.flat();
      console.log(`Loaded ${documents.length} documents from storage`);
      
      return documents;
    } catch (error) {
      console.error("Error loading index:", error);
      return [];
    }
  }
  
  // Initialize the agent - load index from storage if available
  async initialize(): Promise<void> {
    console.log("Initializing DurableSearch");
    
    // Load the index from storage if we don't have it in memory
    if (this.state.documents.length === 0) {
      const documents = await this.loadIndex();
      
      if (documents.length > 0) {
        this.setState({
          documents,
          totalVectorCount: documents.length,
          lastPersisted: Date.now()
        });
        console.log(`Initialized with ${documents.length} documents from storage`);
      } else {
        console.log("No documents found in storage, starting with empty index");
      }
    } else {
      console.log(`Already initialized with ${this.state.documents.length} documents in memory`);
    }
  }
  
  // Upsert documents with vectors and attributes
  async upsert(
    ids: string[], 
    vectors: (number[] | null)[], 
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
      const vector = vectors[i];
      
      if (vector === null) {
        // If vector is null, delete the document
        console.log(`Deleting document with ID: ${ids[i]}`);
        documents.delete(ids[i]);
      } else {
        // Convert attribute arrays into a single object for this document
        const documentAttributes: Record<string, string | null> = {};
        for (const [key, values] of Object.entries(attributes)) {
          documentAttributes[key] = values[i];
        }

        // Create a Float32Array for the vector
        const vectorArray = this.ensureFloat32Array(vector);

        documents.set(ids[i], {
          vector: vectorArray,
          attributes: documentAttributes
        });
      }
    }
    
    // Update state with new documents using the built-in setState method
    console.log(`Setting state with ${documents.size} documents`);
    this.setState({
      documents: Array.from(documents.entries()),
      totalVectorCount: documents.size
    });
    console.log("State updated successfully");
    
    // Always persist after upsert to prevent data loss when the object hibernates
    console.log("Persisting index to storage to prevent data loss on hibernation");
    await this.persistIndex();
    
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
    filters?: Filter,
  ): Promise<{
    results: QueryResult[],
  }> {
    console.log(`Query called with vector of length ${queryVector.length}, topK=${topK}`);
    console.log("Filters:", filters ? JSON.stringify(filters).substring(0, 200) + "..." : "none");
    
    // Limit topK to prevent excessive memory usage
    const effectiveTopK = Math.min(topK);
    
    const allResults: QueryResult[] = [];
    const queryVec = this.ensureFloat32Array(queryVector);
    const documents = new Map(this.state.documents || []);
    console.log(`Processing query against ${documents.size} documents`);

    // Convert documents to array for easier pagination
    const documentEntries = Array.from(documents.entries());
    
    for (let i = 0; i < documentEntries.length; i++) {
      const [id, doc] = documentEntries[i];
      
      // Skip documents that don't match filters
      if (filters && !this.matchesFilter(id, doc, filters)) {
        continue;
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
        
        allResults.push({ 
          id, 
          score,
          attributes: doc.attributes 
        });
      } else {
        throw new Error(`Unsupported distance metric: ${distanceMetric}`);
      }
    }

    // Sort by score (descending)
    allResults.sort((a, b) => b.score - a.score);
    
    // Get the top K results for this page
    const pageResults = allResults.slice(0, effectiveTopK);
    
    return {
      results: pageResults,
    };
  }

  // Helper method to check if a document matches a filter
  private matchesFilter(id: string, doc: Document, filter: Filter): boolean {
    // Handle And/Or operators
    if (Array.isArray(filter) && filter.length === 2) {
      const [firstElement, secondElement] = filter;
      
      // Check if it's a logical operator (And/Or)
      if (firstElement === FilterOperator.And && Array.isArray(secondElement)) {
        // All filters must match
        return secondElement.every(subFilter => this.matchesFilter(id, doc, subFilter));
      } else if (firstElement === FilterOperator.Or && Array.isArray(secondElement)) {
        // At least one filter must match
        return secondElement.some(subFilter => this.matchesFilter(id, doc, subFilter));
      }
    }
    
    // Handle field-based filters
    if (Array.isArray(filter) && filter.length === 3 && typeof filter[0] === 'string') {
      const [field, operator, value] = filter as [string, FilterOperator, any];
      
      // Special case for id field
      if (field === 'id') {
        return this.evaluateOperator(operator, id, value);
      }
      
      // Get attribute value
      const attributeValue = doc.attributes[field];
      return this.evaluateOperator(operator, attributeValue, value);
    }
    
    console.error("Invalid filter format:", filter);
    return false;
  }

  // Helper method to evaluate filter operators
  private evaluateOperator(operator: FilterOperator, fieldValue: string | null, filterValue: any): boolean {
    switch (operator) {
      case FilterOperator.Eq:
        // If filterValue is null, matches documents missing the attribute or with null value
        if (filterValue === null) {
          return fieldValue === null || fieldValue === undefined;
        }
        return fieldValue === filterValue;
        
      case FilterOperator.NotEq:
        // If filterValue is null, matches documents with non-null attribute
        if (filterValue === null) {
          return fieldValue !== null && fieldValue !== undefined;
        }
        return fieldValue !== filterValue;
        
      case FilterOperator.In:
        // If both are arrays, check for intersection
        if (Array.isArray(filterValue) && Array.isArray(fieldValue)) {
          return filterValue.some(v => fieldValue.includes(v));
        }
        // Otherwise check if fieldValue is in filterValue array
        return Array.isArray(filterValue) && filterValue.includes(fieldValue);
        
      case FilterOperator.NotIn:
        // If both are arrays, check for no intersection
        if (Array.isArray(filterValue) && Array.isArray(fieldValue)) {
          return !filterValue.some(v => fieldValue.includes(v));
        }
        // Otherwise check if fieldValue is not in filterValue array
        return !Array.isArray(filterValue) || !filterValue.includes(fieldValue);
        
      case FilterOperator.Lt:
        if (fieldValue === null) return false;
        if (typeof filterValue === 'number' && !isNaN(Number(fieldValue))) {
          return Number(fieldValue) < filterValue;
        }
        return fieldValue < String(filterValue);
        
      case FilterOperator.Lte:
        if (fieldValue === null) return false;
        if (typeof filterValue === 'number' && !isNaN(Number(fieldValue))) {
          return Number(fieldValue) <= filterValue;
        }
        return fieldValue <= String(filterValue);
        
      case FilterOperator.Gt:
        if (fieldValue === null) return false;
        if (typeof filterValue === 'number' && !isNaN(Number(fieldValue))) {
          return Number(fieldValue) > filterValue;
        }
        return fieldValue > String(filterValue);
        
      case FilterOperator.Gte:
        if (fieldValue === null) return false;
        if (typeof filterValue === 'number' && !isNaN(Number(fieldValue))) {
          return Number(fieldValue) >= filterValue;
        }
        return fieldValue >= String(filterValue);
        
      case FilterOperator.Glob:
        if (fieldValue === null) return false;
        return this.matchGlob(String(fieldValue), String(filterValue), false);
        
      case FilterOperator.NotGlob:
        if (fieldValue === null) return true;
        return !this.matchGlob(String(fieldValue), String(filterValue), false);
        
      case FilterOperator.IGlob:
        if (fieldValue === null) return false;
        return this.matchGlob(String(fieldValue), String(filterValue), true);
        
      case FilterOperator.NotIGlob:
        if (fieldValue === null) return true;
        return !this.matchGlob(String(fieldValue), String(filterValue), true);
        
      default:
        console.error(`Unsupported operator: ${operator}`);
        return false;
    }
  }

  // Helper method to match glob patterns
  private matchGlob(str: string, pattern: string, caseInsensitive: boolean): boolean {
    if (caseInsensitive) {
      str = str.toLowerCase();
      pattern = pattern.toLowerCase();
    }
    
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[!\]/g, '[^]');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(str);
  }

  // Override onStateUpdate to handle state changes
  onStateUpdate(state: VectorStoreState | undefined, source: any): void {
    console.log(`State updated with ${state?.documents.length || 0} documents, source:`, source);
  }

  // Get the number of documents in the store
  async getStats(): Promise<{ 
    documentCount: number; 
    status: string; 
    vectorFormats?: any;
    lastPersisted?: string;
    storageUsage?: {
      batches: number;
      estimatedSize: string;
    }
  }> {
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
    
    // Get storage usage info
    let storageUsage = undefined;
    try {
      const batchCount = await this.ctx.storage.get('index_batch_count') as number;
      if (batchCount) {
        // Estimate size based on document count and average vector size
        const avgDocSize = 500; // bytes, rough estimate
        const estimatedSize = (this.state.documents.length * avgDocSize) / (1024 * 1024);
        
        storageUsage = {
          batches: batchCount,
          estimatedSize: `~${estimatedSize.toFixed(2)} MB`
        };
      }
    } catch (e) {
      console.error("Error getting storage usage:", e);
    }
    
    return {
      documentCount: this.state.documents.length,
      status: "healthy",
      vectorFormats,
      lastPersisted: this.state.lastPersisted ? new Date(this.state.lastPersisted).toISOString() : undefined,
      storageUsage
    };
  }
  
  // Maintenance task that runs periodically
  async runMaintenance(data: { timestamp: number, forcePersist?: boolean }): Promise<void> {
    console.log("Running maintenance task");
    
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
  console.log("env.DurableSearch methods:", Object.keys(env.DurableSearch));
  
  try {
    const id = env.DurableSearch.idFromName(namespace);
    const stub = env.DurableSearch.get(id);
    
    // Initialize the agent if needed
    await stub.initialize();
    
    switch (route) {
      case VectorStoreRoutes.Upsert:
        try {
          const body = await req.json() as any;
          
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
          const body = await req.json() as any;
          const parsedBody = querySchema.parse(body);
          
          const queryResponse = await stub.query(
            parsedBody.vector,
            parsedBody.top_k,
            parsedBody.distance_metric,
            parsedBody.filters,
          );
          
          return Response.json(queryResponse);
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