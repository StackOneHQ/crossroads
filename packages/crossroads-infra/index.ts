import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import { Observable } from 'rxjs';

export type BaseState = Record<string, unknown>;

export abstract class CrossroadsGraphObject<Env> extends DurableObject<Env> {
  static options = {
    hibernate: true,
  };

  abstract graph: Observable<unknown>;

  abstract run(): Promise<unknown>;
}

export abstract class CrossroadsGraphNode<Env> extends WorkerEntrypoint<Env> {
  abstract run(state: BaseState): Promise<BaseState>;
}
