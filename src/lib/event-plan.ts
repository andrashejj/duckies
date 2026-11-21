export type EventPlan = {
  summary: string;
  coordination: string;
  deadlines: { date: string; task: string }[];
  areas: {
    id: string;
    title: string;
    need: string;
    decision: string;
    kit: string[];
    tasks: { date: string; text: string; owner: string }[];
  }[];
};
