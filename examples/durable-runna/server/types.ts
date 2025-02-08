import { z } from "zod";


export const userInfoSchema = z.object({
  mileage: z.string(),
  race: z.string(),
  targetTime: z.string(),
  weeklyTime: z.string(),
  additionalInfo: z.string(),
  aboutYou: z.string(),
});

export type UserInfo = z.infer<typeof userInfoSchema>;

export const roughPlanSchema = z.object({
  thinking: z.string().describe("Think about the user's request and the details they provided. Consider all the factors in their request and the details they provided."),
  roughPlan: z.string().describe("Based on the thinking, generate a rough plan for the user leading up to their race. The plan should be something like '10k per week for a few weeks to get back into it, then 15k per week for a few weeks to build up to a 10k race, then 20k per week for a few weeks to build up to a half marathon, then 25k per week for a few weeks to build up to a marathon. Since the user is a beginner, the plan should be very conservative and easy to follow. If the user is advanced we would include more sprint sessions. We should always give them some time in the week to do stretching and recovery."),
});

export type RoughPlan = z.infer<typeof roughPlanSchema>;

export const fullPlanSchema = z.object({
  thinking: z.string().describe("Think about the user's request and the details they provided. Consider all the factors in their request and the details they provided. Contemplate on this for a moment."),
  trainingSessions: z.array(z.object({
    date: z.string().describe("The date of the session in ISO format.This should have a time component. Try to align to the user's preferences with the time of day of the session."),
    description: z.string().describe("A short description of the session. It should include a full description of what you want the user to do."),
    type: z.string().describe("The type of session. This should be one of 'run', 'strength', 'mobility', 'cross training'"),
    aim: z.string().describe("The aim of the session. What is the user trying to achieve? Include the perceived effort of the session on a scale of 1-10 if applicable, any target pace, distance or other details if applicable. Make it as specific as possible."),
    time: z.number().describe("The approximate length of time scheduled for the session in minutes. This should default to 60 if unsure."),
    notes: z.string().describe("Any additional notes about the session for example interval/set details, specific exercises etc.")
  })).describe(`The date today is ${new Date().toISOString()}. This is the list of training sessions for the user, soonest first. Stop at the user race or 3 months from now, whichever is sooner.`)
});

export type FullPlan = z.infer<typeof fullPlanSchema>;

export const chatMessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
