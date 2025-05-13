import { describe, expect, it } from 'bun:test';
import type { BaseState } from '@crossroads/infra';
import { firstValueFrom } from 'rxjs';
import { Graph, SpecialNode } from './index';

interface TestState extends BaseState {
  value: number;
  path?: string[];
}

interface TestNode {
  run: (state: TestState) => Promise<TestState>;
}

describe('Graph', () => {
  const createTestNode = (name: string, valueModifier: (n: number) => number): TestNode => ({
    run: async (state: TestState): Promise<TestState> => ({
      ...state,
      value: valueModifier(state.value),
      path: [...(state.path || []), name],
    }),
  });

  // Helper to create a test node that fails
  const createFailingNode = (name: string) => ({
    run: async (_state: TestState): Promise<TestState> => {
      throw new Error(`${name} failed`);
    },
  });

  // Helper to create a delayed node
  const createDelayedNode = (
    name: string,
    delay: number,
    valueModifier: (n: number) => number
  ) => ({
    run: async (state: TestState): Promise<TestState> => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return {
        ...state,
        value: valueModifier(state.value),
        path: [...(state.path || []), name],
      };
    },
  });

  it('should execute a simple linear path', async () => {
    const graph = new Graph<{}, TestState>()
      .addNode(
        'A',
        createTestNode('A', (n) => n + 1)
      )
      .addNode(
        'B',
        createTestNode('B', (n) => n * 2)
      )
      .addNode(
        'C',
        createTestNode('C', (n) => n - 1)
      )
      .addEdge('A', 'B')
      .addEdge('B', 'C');

    const result = await firstValueFrom(graph.build('A', { value: 1, path: [] }));
    expect(result.value).toBe(3); // ((1 + 1) * 2) - 1
    expect(result.path).toEqual(['A', 'B', 'C']);
  });

  it('should handle conditional paths', async () => {
    const graph = new Graph<{}, TestState>()
      .addNode(
        'start',
        createTestNode('start', (n) => n)
      )
      .addNode(
        'even',
        createTestNode('even', (n) => n / 2)
      )
      .addNode(
        'odd',
        createTestNode('odd', (n) => n * 3 + 1)
      )
      .addConditionalEdge('start', (result) => (result.data.value % 2 === 0 ? 'even' : 'odd'));

    const evenResult = await firstValueFrom(graph.build('start', { value: 4, path: [] }));
    expect(evenResult.value).toBe(2);
    expect(evenResult.path).toEqual(['start', 'even']);

    const oddResult = await firstValueFrom(graph.build('start', { value: 3, path: [] }));
    expect(oddResult.value).toBe(10);
    expect(oddResult.path).toEqual(['start', 'odd']);
  });

  it('should handle parallel paths with different delays', async () => {
    const graph = new Graph<{}, TestState>()
      .addNode(
        'A',
        createDelayedNode('A', 100, (n) => n + 1)
      )
      .addNode(
        'B',
        createDelayedNode('B', 50, (n) => n + 2)
      )
      .addNode(
        'C',
        createDelayedNode('C', 150, (n) => n + 3)
      )
      .setMaxConcurrency(3);

    const result = await firstValueFrom(graph.build('A', { value: 0, path: [] }));
    expect(result.path?.length).toBeGreaterThan(0);
  });

  it('should handle node failures and retry paths', async () => {
    const graph = new Graph<{}, TestState>()
      .addNode('A', createFailingNode('A'))
      .addNode(
        'B',
        createTestNode('B', (n) => n + 1)
      )
      .addNode(
        'C',
        createTestNode('C', (n) => n + 1)
      )
      .addEdge('A', 'B')
      .addEdge('B', 'C')
      .setMaxConcurrency(3);

    await expect(firstValueFrom(graph.build('A', { value: 0, path: [] }))).rejects.toThrow(
      'A failed'
    );
  });

  it('should handle cycles in the graph', async () => {
    const graph = new Graph<{}, TestState>()
      .addNode(
        'A',
        createTestNode('A', (n) => n + 1)
      )
      .addNode(
        'B',
        createTestNode('B', (n) => n * 2)
      )
      .addConditionalEdge('A', (result) => (result.data.value < 10 ? 'B' : 'end'))
      .addConditionalEdge('B', () => 'A')
      .addNode('end', SpecialNode.END);

    const result = await firstValueFrom(graph.build('A', { value: 1, path: [] }));
    expect(result.value).toBeGreaterThanOrEqual(10);
    expect(result.path?.length).toBeGreaterThan(2);
  });

  it('should handle multiple concurrent successful paths', async () => {
    const graph = new Graph<{}, TestState>()
      .addNode(
        'start',
        createTestNode('start', (n) => n)
      )
      .addNode(
        'A1',
        createDelayedNode('A1', 100, (n) => n + 1)
      )
      .addNode(
        'A2',
        createDelayedNode('A2', 50, (n) => n + 2)
      )
      .addNode(
        'A3',
        createDelayedNode('A3', 150, (n) => n + 3)
      )
      .addEdge('start', 'A1')
      .addEdge('start', 'A2')
      .addEdge('start', 'A3')
      .setMaxConcurrency(3);

    const result = await firstValueFrom(graph.build('start', { value: 0, path: [] }));
    expect(result.path?.length).toBeGreaterThan(1);
  });

  it('should throw error when node is not found', async () => {
    const graph = new Graph<{}, TestState>().addNode(
      'A',
      createTestNode('A', (n) => n + 1)
    );

    await expect(
      firstValueFrom(graph.build('nonexistent', { value: 0, path: [] }))
    ).rejects.toThrow('Node nonexistent not found');
  });

  it('should stop after reaching maxNodeExecutions', async () => {
    const graph = new Graph<{}, TestState>()
      .addNode(
        'A',
        createTestNode('A', (n) => n + 1)
      )
      .addNode(
        'B',
        createTestNode('B', (n) => n * 2)
      )
      .addEdge('A', 'B')
      .addEdge('B', 'A')
      .setMaxNodeExecutions(3);

    await expect(firstValueFrom(graph.build('A', { value: 1, path: [] }))).rejects.toThrow(
      'Max node executions reached'
    );
  });

  it('should handle multiple concurrent paths and take first success', async () => {
    const graph = new Graph<{}, TestState>()
      .addNode(
        'start',
        createTestNode('start', (n) => n)
      )
      .addNode(
        'fast',
        createDelayedNode('fast', 50, (n) => n + 1)
      )
      .addNode(
        'slow',
        createDelayedNode('slow', 150, (n) => n + 2)
      )
      .addNode('end', SpecialNode.END)
      .addEdge('start', 'fast')
      .addEdge('start', 'slow')
      .addEdge('fast', 'end')
      .addEdge('slow', 'end')
      .setMaxConcurrency(2);

    const result = await firstValueFrom(graph.build('start', { value: 0, path: [] }));
    expect(result.path).toContain('fast');
    expect(result.path).not.toContain('slow');
  });

  it('should cancel other paths when one succeeds', async () => {
    let slowNodeExecuted = false;
    const graph = new Graph<{}, TestState>()
      .addNode(
        'start',
        createTestNode('start', (n) => n)
      )
      .addNode(
        'fast',
        createDelayedNode('fast', 50, (n) => n + 1)
      )
      .addNode('slow', {
        run: async (state: TestState) => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          slowNodeExecuted = true;
          return { ...state, value: state.value + 2, path: [...(state.path || []), 'slow'] };
        },
      })
      .addNode('end', SpecialNode.END)
      .addEdge('start', 'fast')
      .addEdge('start', 'slow')
      .addEdge('fast', 'end')
      .addEdge('slow', 'end')
      .setMaxConcurrency(2);

    const result = await firstValueFrom(graph.build('start', { value: 0, path: [] }));
    expect(result.path).toContain('fast');
    expect(slowNodeExecuted).toBe(false);
  });

  it('should stop after reaching maxEdgeConditionCalls', async () => {
    let edgeCallCount = 0;
    const graph = new Graph<{}, TestState>()
      .addNode(
        'A',
        createTestNode('A', (n) => n + 1)
      )
      .addNode(
        'B',
        createTestNode('B', (n) => n * 2)
      )
      .addNode('end', SpecialNode.END)
      .addConditionalEdge('A', (result) => {
        edgeCallCount++;
        return result.data.value < 10 ? 'B' : 'end';
      })
      .addConditionalEdge('B', () => 'A')
      .setMaxEdgeConditionCalls(5)
      .setMaxConcurrency(1);

    const result = await firstValueFrom(graph.build('A', { value: 1, path: [] }));
    expect(edgeCallCount).toBeLessThanOrEqual(5);
    expect(result.path?.slice(-1)[0]).toBe('end');
  });

  it('should track execution counts in result', async () => {
    const graph = new Graph<{}, TestState>()
      .addNode(
        'A',
        createTestNode('A', (n) => n + 1)
      )
      .addNode(
        'B',
        createTestNode('B', (n) => n * 2)
      )
      .addNode('end', SpecialNode.END)
      .addConditionalEdge('A', (result) => (result.data.value < 5 ? 'B' : 'end'))
      .addConditionalEdge('B', () => 'A')
      .setMaxNodeExecutions(10)
      .setMaxEdgeConditionCalls(5)
      .setMaxConcurrency(1);

    const result = await firstValueFrom(graph.build('A', { value: 1, path: [] }));
    expect(result.path?.length).toBeGreaterThan(1);
  });
});
