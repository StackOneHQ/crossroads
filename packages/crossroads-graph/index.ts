import { BaseState, CrossroadsGraphNode } from '@crossroads/infra';
import {
  Observable,
  catchError,
  filter,
  from,
  map,
  mergeMap,
  of,
  take,
  throwError,
  throwIfEmpty,
} from 'rxjs';

type NodeResult<TState extends BaseState> = { success: boolean; data: TState; error?: string };
type Edge<TState extends BaseState> = (result: NodeResult<TState>) => string;
type SimpleNode<TState extends BaseState> = {
  run: (state: TState) => Promise<TState>;
};

type NodeDefinition<TEnv, TState extends BaseState> =
  | SimpleNode<TState>
  | Fetcher<CrossroadsGraphNode<TEnv>>
  | SpecialNode
  | ((state: Observable<NodeResult<TState>>) => Observable<NodeResult<TState>>);

export enum SpecialNode {
  START = 'START',
  END = 'END',
}

export class Graph<TEnv, TState extends BaseState> {
  private nodes = new Map<string, NodeDefinition<TEnv, TState>>();
  private edges = new Map<string, { condition: Edge<TState> }[]>();
  private maxConcurrency = 5;

  addNode = (name: string, node: NodeDefinition<TEnv, TState>) => {
    this.nodes.set(name, node);
    return this;
  };

  addEdge = (from: string, to: string) => {
    this.addConditionalEdge(from, () => to);
    return this;
  };

  addConditionalEdge = (from: string, condition: Edge<TState>) => {
    const edges = this.edges.get(from) || [];
    edges.push({ condition });
    this.edges.set(from, edges);
    return this;
  };

  setMaxConcurrency = (concurrency: number) => {
    this.maxConcurrency = concurrency;
    return this;
  };

  private executeNode = (nodeName: string, state: TState): Observable<NodeResult<TState>> => {
    const node = this.nodes.get(nodeName);
    if (!node) {
      return throwError(() => new Error(`Node ${nodeName} not found`));
    }

    if (node === SpecialNode.START || node === SpecialNode.END) {
      return of({ success: true, data: state });
    }

    if (typeof node === 'function') {
      return node(of({ success: true, data: state }));
    }

    return from(node.run(state)).pipe(
      map((data) => ({ success: true, data })),
      catchError((error) =>
        of({
          success: false,
          data: state,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      )
    );
  };

  private getNextNode = (nodeName: string, result: NodeResult<TState>): string | null => {
    const edges = this.edges.get(nodeName) || [];
    if (edges.length === 0) return null;

    try {
      return edges[0].condition(result);
    } catch (error) {
      console.error(`Error in edge condition for node ${nodeName}:`, error);
      return null;
    }
  };

  private executePath = (nodeName: string, state: TState): Observable<NodeResult<TState>> => {
    return this.executeNode(nodeName, state).pipe(
      mergeMap((result): Observable<NodeResult<TState>> => {
        if (!result.success) {
          return of(result);
        }

        const nextNode = this.getNextNode(nodeName, result);
        if (!nextNode || nextNode === SpecialNode.END) {
          return of(result);
        }

        return this.executePath(nextNode, result.data);
      })
    );
  };

  build = (startNode: string, initialState: TState): Observable<TState> => {
    if (!this.nodes.has(startNode)) {
      return throwError(() => new Error(`Node ${startNode} not found`));
    }

    // Create multiple parallel attempts
    const attempts = Array.from({ length: this.maxConcurrency }, () =>
      this.executePath(startNode, initialState as TState).pipe(filter((result) => result.success))
    );

    // Merge all attempts and take the first successful one
    return from(attempts).pipe(
      mergeMap((attempt) => attempt, this.maxConcurrency),
      take(1),
      map((result) => result.data),
      throwIfEmpty(() => new Error('All tasks failed or no success found.')),
      catchError((error) => {
        if (error.message.includes('Node') && error.message.includes('not found')) {
          return throwError(() => error);
        }
        return throwError(() => new Error('All tasks failed or no success found.'));
      })
    );
  };
}
