import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { type UserInfo, roughPlanSchema } from './types';

export const buildPlan = async (details: UserInfo, env: Record<string, string>) => {
  const google = createGoogleGenerativeAI({
    apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  const { object } = await generateObject({
    model: google('gemini-2.0-flash-001', {
      useSearchGrounding: true,
    }),
    schema: roughPlanSchema,
    prompt: `The date is ${new Date().toISOString()}. Generate a running plan for the user with the following details: ${JSON.stringify(details)}`,
  });

  return object;
};
