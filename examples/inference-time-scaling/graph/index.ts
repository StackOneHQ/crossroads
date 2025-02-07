import { Graph, SpecialNode } from '@crossroads/graph';
import { BaseState, CrossroadsGraphObject } from '@crossroads/infra';
import { Observable, firstValueFrom } from 'rxjs';
import TaskNode from '../task-node';
import ValidationNode from '../validation-node';

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
  maxConcurrency = 10;

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
      .setMaxConcurrency(this.maxConcurrency);

    this.graph = workflow.build('task', { result: 0 });
  }

  shouldEnd = (state: TaskState): string => {
    console.log('shouldEnd', state);
    if (state.isValid) {
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
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.InferenceTimeScalingGraph.newUniqueId();
    const graph = env.InferenceTimeScalingGraph.get(id);
    const result = await graph.run();
    return new Response(result, { status: 200 });
  },
};
