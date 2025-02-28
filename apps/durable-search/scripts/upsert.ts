#!/usr/bin/env bun

const UPSERT_NAMESPACE = "testspace"

const loadDocs = async () => {

  const res = await fetch(`http://localhost:8787/v1/namespaces/${UPSERT_NAMESPACE}`, {
    method: "POST",
    body: JSON.stringify({
      ids: ["1", "2", "3"],
      vectors: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
      attributes: { title: ["Doc Title 1", "Doc Title 2", "Doc Title 3"], content: ["Doc Content 1", "Doc Content 2", "Doc Content 3"] }
    })
  })

  console.log(await res.json())
}

loadDocs()