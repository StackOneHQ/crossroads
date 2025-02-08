# CrossRoads 🚦

> a smol package to orchestrate agents in cloudflare workers + durable objects

- experimenting with durable patterns and human <> ai interface
- using workers to execute tool calls for mega scale
- rxjs for easy graphs execution

## examples

- [inference-time-scaling with workers](./examples/inference-time-scaling)
- [durable-runna](./examples/durable-runna)

this is work in progress and will probably be broken for a while.

## fun findings

- often it is easier to call the same worker to get a clean execution env for tools
- some models really cant handle long tool calls

