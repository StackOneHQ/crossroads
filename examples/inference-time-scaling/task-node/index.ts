import { BaseState, CrossroadsGraphNode } from '@crossroads/infra';

// biome-ignore lint/complexity/noBannedTypes: <explanation>
type Env = {};

interface TaskState extends BaseState {
  result?: number;
  attempt?: number;
}

export default class TaskNode extends CrossroadsGraphNode<Env> {
  async run(state: TaskState): Promise<TaskState> {
    console.log('running task node', state);
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000)); // Random delay 0-1000ms
    return {
      ...state,
      attempt: (state.attempt ?? 0) + 1,
      result: Math.floor(Math.random() * 10) + 1,
    };
  }
}
