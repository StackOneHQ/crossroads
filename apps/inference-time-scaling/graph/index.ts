import { Graph, type NodeResult, SpecialNode } from '@crossroads/graph';
import { type BaseState, CrossroadsGraphObject } from '@crossroads/infra';
import { type Observable, firstValueFrom } from 'rxjs';
import type TaskNode from '../task-node';
import type ValidationNode from '../validation-node';

interface Env {
  InferenceTimeScalingGraph: DurableObjectNamespace<InferenceTimeScalingGraph>;
  TaskNode: Fetcher<TaskNode>;
  ValidationNode: Fetcher<ValidationNode>;
}

interface TaskState extends BaseState {
  result?: number;
  isValid?: boolean;
}

export class InferenceTimeScalingGraph extends CrossroadsGraphObject<Env> {
  graph: Observable<TaskState>;

  // Run the graph in parallel with 10 concurrent tasks
  maxConcurrency = 10;

  // limits the number of times total node executions can happen
  maxNodeExecutions = 100;

  // TODO: maxIndividualNodeExecutions

  // limits the number of times edge conditions can be called (this limits iterations inside the graph)
  maxEdgeConditionCalls = 100;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    const workflow = new Graph<Env, TaskState>()
      // nodes
      .addNode('start', SpecialNode.START)
      .addNode('task', env.TaskNode)
      .addNode('validation', env.ValidationNode)
      .addNode('end', SpecialNode.END)

      // edges
      .addEdge('task', 'validation')
      .addConditionalEdge('validation', this.shouldEnd)

      // config
      .setMaxConcurrency(this.maxConcurrency)
      .setMaxNodeExecutions(this.maxNodeExecutions)
      .setMaxEdgeConditionCalls(this.maxEdgeConditionCalls);

    this.graph = workflow.build('task', { result: 0 });
  }

  shouldEnd = (result: NodeResult<TaskState>): string => {
    console.log('shouldEnd', result);
    if (result.data.isValid) {
      return 'end';
    }
    return 'task';
  };

  async run(): Promise<string> {
    try {
      console.log('running graph');
      console.log('graph', this.graph);
      const state = await firstValueFrom(this.graph);
      console.log('graph completed', state);
      return JSON.stringify(state);
    } catch (error) {
      return `Error occurred: ${(error as Error).message}`;
    }
  }
}

export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    const id = env.InferenceTimeScalingGraph.newUniqueId();
    const graph = env.InferenceTimeScalingGraph.get(id);
    const result = await graph.run();
    return new Response(result, { status: 200 });
  },
};
