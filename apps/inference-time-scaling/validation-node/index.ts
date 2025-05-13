import { type BaseState, CrossroadsGraphNode } from '@crossroads/infra';

// biome-ignore lint/complexity/noBannedTypes: <explanation>
type Env = {};

interface ValidationState extends BaseState {
  isValid?: boolean;
}

export default class ValidationNode extends CrossroadsGraphNode<Env> {
  async run(state: ValidationState): Promise<ValidationState> {
    return { ...state, isValid: state.result === 7 };
  }
}
