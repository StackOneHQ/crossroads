import ical from 'ical-generator';
import { FullPlan } from "./types";

export const buildCalender = (fullPlan: FullPlan, id: string): string => {
  const events = fullPlan.trainingSessions.map((session) => {
    const start = new Date(session.date);
    let end;
    try {
      end = new Date(start.getTime() + session.time * 60 * 1000)
    } catch (error) {
      console.error("Error building end date", error);
      end = new Date(new Date(session.date).getTime() + 1000 * 60 * 60);
    }
    return {
      start: start,
      end: end,
      summary: `${session.type} - ${session.time} mins`,
      description: `Aim: ${session.aim}\n Description: ${session.description}\n Notes: ${session.notes}`,
    }
  })
  const cal = ical({
      name: `Running Plan - ${id}`,
      events: events
  });

  return cal.toString();
}