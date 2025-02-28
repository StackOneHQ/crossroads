#!/usr/bin/env bun

const QUERY_NAMESPACE = "testspace"

// Define response types for type safety
interface QueryResponse {
  results: Array<{
    id: string;
    score: number;
    attributes: Record<string, string | null>;
  }>;
  next_cursor?: string;
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
  
  const res = await fetch(`http://localhost:8787/v1/namespaces/${QUERY_NAMESPACE}/query`, {
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
  
  // Check if there are more results (pagination)
  if (response.next_cursor) {
    console.log(`\nMore results available. Next cursor: ${response.next_cursor}`)
    await fetchNextPage(queryVector, topK, distanceMetric, response.next_cursor)
  }
}

/**
 * Fetch the next page of results using a cursor
 */
const fetchNextPage = async (
  queryVector: number[],
  topK: number,
  distanceMetric: string,
  cursor: string
): Promise<void> => {
  console.log(`\nFetching next page with cursor: ${cursor}`)
  
  const res = await fetch(`http://localhost:8787/v1/namespaces/${QUERY_NAMESPACE}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      vector: queryVector,
      top_k: topK,
      distance_metric: distanceMetric,
      cursor
    })
  })

  const response = await res.json() as QueryResponse
  console.log("Next page results:")
  console.log(JSON.stringify(response.results, null, 2))
  
  // Continue pagination if there are more results
  if (response.next_cursor) {
    console.log(`\nMore results available. Next cursor: ${response.next_cursor}`)
    // Uncomment to automatically fetch all pages
    // await fetchNextPage(queryVector, topK, distanceMetric, response.next_cursor)
  }
}

queryDocs()
