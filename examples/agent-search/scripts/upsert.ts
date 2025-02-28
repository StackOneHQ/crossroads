#!/usr/bin/env bun

const NAMESPACE = "testspace"

const loadDocs = async () => {

  const res = await fetch(`http://localhost:8787/v1/namespaces/${NAMESPACE}`, {
    method: "POST",
    body: JSON.stringify({
      ids: ["4", "5", "6"],
      vectors: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
      attributes: { title: ["Doc 1", "Doc 2", "Doc 3"] }
    })
  })

  console.log(await res.json())
}

loadDocs()