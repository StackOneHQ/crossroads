import { BaseState, CrossroadsGraphNode } from "@crossroads/infra";
import {
  Observable,
  Subject,
  catchError,
  from,
  map,
  mergeMap,
  of,
  take,
  tap,
  throwError
} from "rxjs";

export type NodeResult<TState extends BaseState> = {
	success: boolean;
	data: TState;
	error?: string;
	nodeExecutions?: number;
	edgeCallCount?: number;
};
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
	START = "START",
	END = "END",
}

export class Graph<TEnv, TState extends BaseState> {
	private nodes = new Map<string, NodeDefinition<TEnv, TState>>();
	private edges = new Map<string, { condition: Edge<TState> }[]>();
	private maxConcurrency = 5;
	private maxNodeExecutions = 100;
	private maxEdgeConditionCalls = 10;

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

	setMaxNodeExecutions = (executions: number) => {
		this.maxNodeExecutions = executions;
		return this;
	};

	setMaxEdgeConditionCalls = (calls: number) => {
		this.maxEdgeConditionCalls = calls;
		return this;
	};

	private executeNode = (
		nodeName: string,
		state: TState,
	): Observable<NodeResult<TState>> => {
		const node = this.nodes.get(nodeName);
		if (!node) {
			return throwError(() => new Error(`Node ${nodeName} not found`));
		}

		if (node === SpecialNode.START || node === SpecialNode.END) {
			return of({ success: true, data: state });
		}

		if (typeof node === "function") {
			return node(of({ success: true, data: state }));
		}

		return from(
			Promise.resolve(node.run(state)).then(
				(data) => {
					return { success: true, data };
				},
				(error) => {
					throw error;
				},
			),
		).pipe(
			catchError((error) => {
				return of({
					success: false,
					data: state,
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}),
		);
	};

	private getNextNode = (
		nodeName: string,
		result: NodeResult<TState>,
		edgeCallCount: number
	): string | null => {
		const edges = this.edges.get(nodeName) || [];
		if (edges.length === 0) return null;

		if (edgeCallCount >= this.maxEdgeConditionCalls) {
			return SpecialNode.END;
		}

		try {
			return edges[0].condition(result);
		} catch (error) {
			console.error(`Error in edge condition for node ${nodeName}:`, error);
			return null;
		}
	};

	private executePath = (
		nodeName: string,
		state: TState,
		nodeExecutions = 0,
		edgeCallCount = 0
	): Observable<NodeResult<TState>> => {
		if (nodeExecutions >= this.maxNodeExecutions) {
			return of({
				success: false,
				data: state,
				error: 'Max node executions reached',
				nodeExecutions,
				edgeCallCount
			});
		}

		// Check edge call limit before executing node
		if (edgeCallCount >= this.maxEdgeConditionCalls) {
			return of({
				success: true,
				data: { ...state, path: [...(Array.isArray(state.path) ? state.path : []), 'end'] },
				nodeExecutions,
				edgeCallCount
			});
		}

		return this.executeNode(nodeName, state).pipe(
			mergeMap((result): Observable<NodeResult<TState>> => {
				if (!result.success) return of({ ...result, nodeExecutions, edgeCallCount });

				const nextNode = this.getNextNode(nodeName, result, edgeCallCount);
				
				if (!nextNode) return of({ ...result, nodeExecutions, edgeCallCount });
				if (nextNode === SpecialNode.END) {
					return of({ 
						success: true, 
						data: { ...result.data, path: [...(Array.isArray(result.data.path) ? result.data.path : []), 'end'] },
						nodeExecutions, 
						edgeCallCount 
					});
				}

				return this.executePath(
					nextNode,
					result.data,
					nodeExecutions + 1,
					edgeCallCount + 1
				);
			})
		);
	};

	build = (startNode: string, initialState: TState): Observable<TState> => {
		const complete$ = new Subject<void>();

		return from(Array(this.maxConcurrency)).pipe(
			mergeMap(() => this.executePath(startNode, initialState), this.maxConcurrency),
			take(1),
			map((result: NodeResult<TState>) => {
				if (!result.success) {
					throw new Error(result.error || 'All tasks failed in graph.');
				}
				return result.data;
			}),
			tap(() => {
				complete$.next();
				complete$.complete();
			}),
			catchError((error) => {
				complete$.next();
				complete$.complete();
				throw error instanceof Error ? error : new Error(String(error));
			})
		);
	};
}
