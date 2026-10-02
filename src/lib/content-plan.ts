export type ContentTask = {
  text: string;
  owner: string;
  /** Existing private board task this action supports; never a public status. */
  boardTaskId?: string;
};

export type ContentDay = {
  id: string;
  date: string;
  title: string;
  format: string;
  series?: string;
  outcome: string;
  tasks: ContentTask[];
  production: {
    cast: string;
    edit: string;
    audio: string;
    subtitles: boolean;
    shots: { seconds: number; visual: string; text: string | null }[];
  };
  prompts?: string[];
  caption?: string;
  notes?: string[];
};

export const videoSeconds = (day: ContentDay) => day.production.shots.reduce((sum, shot) => sum + shot.seconds, 0);

export const shotTiming = (day: ContentDay, index: number) => {
  const start = day.production.shots.slice(0, index).reduce((sum, shot) => sum + shot.seconds, 0);
  return `${start}–${start + day.production.shots[index].seconds} sec`;
};

export type ContentPlan = {
  summary: string;
  beats: {
    dayId: string;
    date: string;
    title: string;
    scene: "start" | "surf" | "bake" | "invite" | "pack" | "beach" | "thanks";
    shots: string;
    purpose: string;
  }[];
  days: ContentDay[];
  guides: { title: string; body: string }[];
};
