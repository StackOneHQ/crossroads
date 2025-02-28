#!/usr/bin/env bun

const QUERY_NAMESPACE = "testspace"

// Define response types for type safety
interface QueryResponse {
  results: Array<{
    id: string;
    score: number;
    attributes: Record<string, string | null>;
  }>;
}

/**
 * Example of querying vectors with pagination
 */
const queryDocs = async (): Promise<void> => {
  // Example query vector - this should match the dimensionality of your vectors
  const queryVector = [1, 2, 3]
  
  // Optional parameters
  const topK = 2
  const distanceMetric = "cosine" // "cosine", "euclidean", or "dot"
  
  // Optional filters - uncomment to use
  // const filters = [
  //   { field: "title", op: "eq", value: "Doc 2" }
  // ]
  
  const res = await fetch(`https://durable-search.stackonehq.workers.dev/v1/namespaces/${QUERY_NAMESPACE}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      vector: queryVector,
      top_k: topK,
      distance_metric: distanceMetric,
      // filters: filters // Uncomment to use filters
    })
  })

  const response = await res.json() as QueryResponse
  console.log("Query results:")
  console.log(JSON.stringify(response.results, null, 2))
}

queryDocs()
