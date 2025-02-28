#!/usr/bin/env bun

const QUERY_NAMESPACE = "testspace"

const queryDocs = async () => {
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
    verbose: true,
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

  const results = await res.json()
  console.log("Query results:")
  console.log(JSON.stringify(results, null, 2))
}

queryDocs()
