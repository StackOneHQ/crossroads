import { createOpenAI } from '@ai-sdk/openai';
import { CoreMessage, generateText, tool } from 'ai';
import { Hono } from 'hono';
import {
  Connection,
  Server,
  WSMessage,
} from "partyserver";
import { z } from 'zod';
import { buildCalender } from './calender';
import { buildPlan } from './plan';
import { ChatMessage, FullPlan, RoughPlan, UserInfo, fullPlanSchema, roughPlanSchema, userInfoSchema } from './types';

export type Env = {
  DurableRunna: DurableObjectNamespace<DurableRunna>;
  ASSETS: Fetcher;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  OPENAI_API_KEY: string;
  BASE_URL: string;
};


export class DurableRunna extends Server<Env> {
  private details: UserInfo | null = null;
  private roughPlan: RoughPlan | null = null;
  private fullPlan: FullPlan | null = null;
  private messages: ChatMessage[] = [];
  private calender: string | null = null;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async init() {
    this.details = await this.ctx.storage.get("details") || null;
    this.roughPlan = await this.ctx.storage.get("roughPlan") || null;
    this.fullPlan = await this.ctx.storage.get("fullPlan") || null;
    this.messages = await this.ctx.storage.get("messages") || [];
  }

  async registerDetails(details: UserInfo): Promise<void> {
    this.ctx.storage.put("details", details);
    this.details = details;

    this.ctx.storage.setAlarm(Date.now() + 100);
  }

  async getRoughPlan(): Promise<RoughPlan | null> {
    if (this.details) {
      const roughPlan = await buildPlan(this.details, this.env as unknown as Record<string, string>);
      this.roughPlan = roughPlan;
      this.ctx.storage.put("roughPlan", roughPlan);
      return roughPlan;
    } else {
      console.log("No details found");
      return null;
    }
  }

  async onAlarm(): Promise<void> {
    if (this.details) {
      const roughPlan = await buildPlan(this.details, this.env as unknown as Record<string, string>);
      this.roughPlan = roughPlan;
      this.ctx.storage.put("roughPlan", roughPlan);
      console.log("roughPlan", roughPlan);

      const text = 'I have generated a new rough plan. Please review it and let me know if you would like to make any changes. \n\n' +
        JSON.stringify(roughPlan);

      const connections = this.getConnections();
      for (const connection of connections) {
        connection.send(
          JSON.stringify({
            type: "message",
            role: "assistant",
            content: text
          })
        );
      }

      this.messages.push({role: "assistant", content: text});
      this.ctx.storage.put("messages", this.messages);
    } else {
      console.log("No details found");
    }
  }


  async onConnect(connection: Connection<unknown>) {
    await this.init();
    let text = "";
    if (!this.roughPlan && !this.fullPlan && !this.calender) {
      text = `Welcome! I've received your running plan request and will get back to you shortly with a personalized plan.`;
    }

    if (this.roughPlan && !this.fullPlan && !this.calender) {
      text = `I've generated a rough plan for you. Please review it and let me know if you would like to make any changes. \n\n` +
        JSON.stringify(this.roughPlan.roughPlan);
    }

    if (this.roughPlan && this.fullPlan && !this.calender) {
      text = `I've generated a full plan for you. Please review it and let me know if you would like to make any changes. \n\n` +
        JSON.stringify(this.fullPlan.trainingSessions);
    }

    if (this.roughPlan && this.fullPlan && this.calender) {
      text = `I've generated a full plan for you. Please review it and let me know if you would like to make any changes. \n\n` +
        JSON.stringify(this.fullPlan.trainingSessions) +
        `\n\nSubscribe to the calendar at /api/${this.ctx.id.toString()}/calender`;
    }

    connection.send(
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: text
      })
    );

    this.messages.push({role: "assistant", content: text});
    this.ctx.storage.put("messages", this.messages);
  }

  buildSystemPrompt() {
    return 'You are an agent building a training plan for a user.' +
      'You will be given a rough plan and you need to converse with the user to build a full plan.' +
      'You can modify the rough plan at any time the user asks you to. You should always show the user the rough plan before and after you modify it.' +
      'Use the modify_rough_training_plan tool to modify the rough plan.' +
      'Once the user is happy you should call the build_full_training_plan tool to build the full plan.' +
      'Once you have done that you can show the user the full plan and ask them if they would like to make any changes.' +
      'If they want to make changed you can just re-run the build_full_training_plan tool.' +
      'These are the details of the user:\n' +
      JSON.stringify(this.details) +

      '\n\nThis is a rough plan we generated earlier:\n' +
      JSON.stringify(this.roughPlan);
  }

  async callAgent(messages: ChatMessage[], env: Record<string, string>) {
    const tools = {
      modify_rough_training_plan: tool({
        description: "Modify the rough training plan. This will be called if the user wants to change the plan in any way.",
        parameters: z.object({
          newRoughPlan: roughPlanSchema
        }),
        execute: async ({ newRoughPlan }) => {
          this.roughPlan = newRoughPlan
          return this.roughPlan;
        }
      }),
      build_full_training_plan: tool({
        description: "Once the user has verified the rough plan and is happy with the format, sessions, and timings, call this tool to finalise the plan. You will need to make sure you can provide all the details of every session in the plan.",
        parameters: z.object({
          fullPlan: fullPlanSchema
        }),
        execute: async ({ fullPlan }) => {
          this.fullPlan = fullPlan;
          const calender = buildCalender(fullPlan, this.ctx.id.toString());
          this.calender = calender;
          this.ctx.storage.put("calender", calender);
          this.ctx.storage.put("fullPlan", fullPlan);
          return `Here is a calender link. You should show this to the user: ${this.env.BASE_URL}/api/${this.ctx.id.toString()}/calender`;
        }
      }),
      get_calender_link: tool({
        description: "Get the calender link for the user.",
        parameters: z.object({
          null: z.null()
        }),
        execute: async () => {
          if (this.calender) {
            return `Here is a calender link. You should show this to the user: ${this.env.BASE_URL}/api/${this.ctx.id.toString()}/calender`;
          } else {
            return "No calender found please build_full_training_plan first";
          }
        }
      })
    }

    const openai = createOpenAI({
      apiKey: this.env.OPENAI_API_KEY
    });

    const result = await generateText({
      model: openai("gpt-4o"),
      messages: messages as CoreMessage[],
      system: this.buildSystemPrompt(),
      maxSteps: 3,
      tools,
      onStepFinish: async ({ toolCalls, toolResults}) => {
        console.log("toolCalls", toolCalls);
        console.log("toolResults", toolResults);
      }
    });
  
    return result;
  }


  async onMessage(connection: Connection<unknown>, message: WSMessage) {
    console.log("message", message);
    const parsedMessage = JSON.parse(message as string) as { type: string; role: string; content: string };

    if (parsedMessage.role === "user") {
      this.messages.push({role: parsedMessage.role, content: parsedMessage.content});
    }


    if (!this.roughPlan) {
      const text = "I'm still thinking about your request. Please check back later.";
      connection.send(
        JSON.stringify({
          type: "message",
          role: "assistant",
          content: text
        })
      );
      this.messages.push({role: "assistant", content: text});

      if (!this.alarm) {
        this.ctx.storage.setAlarm(Date.now() + 100);
      }
    } else {
      const result = await this.callAgent(this.messages, this.env as unknown as Record<string, string>);
      this.messages.push({role: "assistant", content: result.text});

      connection.send(
        JSON.stringify({
          type: "message",
          role: "assistant",
          content: result.text
        })
      );

      if (this.fullPlan) {
        // build the calender
        console.log("building calender");
        const calender = buildCalender(this.fullPlan, this.ctx.id.toString());
        this.calender = calender;
        this.ctx.storage.put("calender", calender);
        this.ctx.storage.put("fullPlan", this.fullPlan);

        const text = `Subscribe to the calendar at /api/${this.ctx.id.toString()}/calender`;
        this.messages.push({role: "assistant", content: text});

        connection.send(
          JSON.stringify({
            type: "message",
            role: "assistant",
            content: text
          })
        );
      }
    }

    // Save the messages to the storage
    this.ctx.storage.put("messages", this.messages);
  }

  async getCalendar(): Promise<string | null> {
    return this.calender;
  }

  async reset() {
    await this.ctx.storage.deleteAll();
    this.details = null;
    this.roughPlan = null;
    this.fullPlan = null;
    this.calender = null;
    this.messages = [];
  }

  async getMessages(): Promise<ChatMessage[]> {
    return await this.ctx.storage.get("messages") || [];
  }

  async getState(): Promise<Record<string, unknown>> {
    return {
      details: this.details || await this.ctx.storage.get("details"),
      roughPlan: this.roughPlan || await this.ctx.storage.get("roughPlan"),
      fullPlan: this.fullPlan || await this.ctx.storage.get("fullPlan"),
      calender: this.calender || await this.ctx.storage.get("calender"),
      messages: this.messages || await this.ctx.storage.get("messages")
    };
  }
}

const app = new Hono<{ Bindings: Env }>();

app.post('/api/info', async (c) => {
  const body = await c.req.json();
  try {
    const parsedBody = userInfoSchema.parse(body);
    const newId = c.env.DurableRunna.newUniqueId();
    const durable = c.env.DurableRunna.get(newId);
    
  const result = await durable.registerDetails(parsedBody);
  console.log("result", result);

  return c.json({
      success: true,
      message: 'Plan info received',
      id: newId.toString()
    });
  } catch (error) {
    console.error("Error parsing body", error);
    return c.json({
      success: false,
      message: 'Invalid body'
    }, 400);
  }
});

app.get('/api/:id/reset', async (c) => {
  const id = c.req.param('id');
  const durable = c.env.DurableRunna.idFromString(id);
  const stub = c.env.DurableRunna.get(durable);
  await stub.reset();
  return c.json({success: true, message: 'Reset'});
});

app.get('/api/:id/messages', async (c) => {
  const id = c.req.param('id');
  const durable = c.env.DurableRunna.idFromString(id);
  const stub = c.env.DurableRunna.get(durable);
  const messages = await stub.getMessages();
  return c.json({success: true, messages});
});

app.get('/api/:id/state', async (c) => {
  const id = c.req.param('id');
  const durable = c.env.DurableRunna.idFromString(id);
  const stub = c.env.DurableRunna.get(durable);
  const state = await stub.getState()
  return c.json({success: true, state: JSON.stringify(state)});
});

app.get('/api/:id/calender', async (c) => {
  const id = c.req.param('id');
  const durable = c.env.DurableRunna.idFromString(id);
  const stub = c.env.DurableRunna.get(durable);
  const calendar = await stub.getCalendar();

  if (!calendar) {
    return c.json({
      success: false,
      message: 'Calendar not found'
    }, 404);
  }

  return new Response(calendar, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="calendar.ics"'
    }
  })
});

app.get('/api/*', async (c) => {
  return c.json({
    success: false,
    message: 'API route not found'
  });
});

app.all('/parties/*', async (c) => {
  const response = await routePartykitRequest(c.req.raw, c.env);
  if (response) return response;
  return c.json({
    success: false,
    message: 'Not found'
  });
});

app.get('*', async (c) => {
  const indexRequest = new Request(`${new URL(c.req.url).origin}/index.html`);
  return await c.env.ASSETS.fetch(indexRequest);
});

export default app;


export async function routePartykitRequest(
  req: Request,
  env: Env,
): Promise<Response | null> {
  const prefix = "parties";
  const url = new URL(req.url);

  const parts = url.pathname.split("/");
  if (parts[1] === prefix && parts.length < 4) {
    return null;
  }
  const name = parts[3];
  const namespace = parts[2];
  if (parts[1] === prefix && name && namespace) {

    const id = env.DurableRunna.idFromString(name);
    const stub = env.DurableRunna.get(id);

    req = new Request(req);
    req.headers.set("x-partykit-room", name);
    req.headers.set("x-partykit-namespace", namespace);

    return stub.fetch(req);
  } else {
    return null;
  }
}