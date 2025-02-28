# CrossRoads 🚦

> a smol package to orchestrate agents in cloudflare workers + durable objects

- experimenting with durable patterns and human <> ai interface
- using workers to execute tool calls for mega scale
- rxjs for easy graphs execution

## examples (apps)

- [inference-time-scaling with workers](./apps/inference-time-scaling)
- [durable-runner](./apps/durable-runner)
- [durable-search](./apps/durable-search)

this is work in progress and will probably be broken for a while.

## fun findings

- often it is easier to call the same worker to get a clean execution env for tools
- some models really cant handle long tool calls
