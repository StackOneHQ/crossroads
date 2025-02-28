#!/usr/bin/env bun

const DELETE_NAMESPACE = "testspace"

/**
 * Example of deleting documents by upserting with null vectors
 */
const deleteDocuments = async (): Promise<void> => {
  // IDs of documents to delete
  const documentIds = ["1"]
  
  console.log(`Deleting ${documentIds.length} documents from namespace: ${DELETE_NAMESPACE}`)
  
  // Create arrays of null values for vectors and attributes
  const nullVectors = documentIds.map(() => null)
  
  // For each attribute field in your schema, you need to provide null values
  // This example assumes you have a "title" attribute
  const nullAttributes = documentIds.map(() => null)
  
  try {
    const res = await fetch(`http://localhost:8787/v1/namespaces/${DELETE_NAMESPACE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ids: documentIds,
        vectors: nullVectors,
        attributes: {
          title: nullAttributes,
          // Add other attributes as needed with null values
        }
      })
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Failed to delete documents: ${errorText}`)
    }
    
    const response = await res.json()
    console.log("Delete response:", response)
    console.log(`Successfully deleted ${documentIds.length} documents`)
    
    // Optionally verify deletion by checking stats
    await checkStats()
  } catch (error) {
    console.error("Error deleting documents:", error)
  }
}

/**
 * Check namespace stats to verify document count
 */
const checkStats = async (): Promise<void> => {
  try {
    const res = await fetch(`http://localhost:8787/v1/namespaces/${DELETE_NAMESPACE}/stats`, {
      method: "GET"
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Failed to get stats: ${errorText}`)
    }
    
    const stats = await res.json() as {
      documentCount: number;
      lastPersisted: string | null;
    };
    console.log("\nNamespace stats after deletion:")
    console.log(`Document count: ${stats.documentCount}`)
    console.log(`Last persisted: ${stats.lastPersisted || 'never'}`)
  } catch (error) {
    console.error("Error checking stats:", error)
  }
}

// Run the delete example
deleteDocuments() 