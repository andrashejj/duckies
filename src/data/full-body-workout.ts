// Exercise names and timers checked against the on-screen video, Cc9Eelzd6wQ.
// Cool-down movements have no on-screen names; their titles describe the demonstrated move.
// Starts use the actual work interval, not YouTube's broader chapter boundary.
export const workoutVideo = {
  id: "Cc9Eelzd6wQ",
  title: "40 Min FULL BODY Workout (No Equipment)",
  creator: "Dan the HIIT Man",
  url: "https://www.youtube.com/watch?v=Cc9Eelzd6wQ",
};

export const workoutSections = [
  { id: "warm-up", title: "Warm-up", timing: "6 moves · 30s each · no rest between moves" },
  { id: "main", title: "Main workout", timing: "35 moves · 35s work / 15s rest · 30s after squat jumps" },
  { id: "finisher", title: "Tabata finisher", timing: "4 moves · 20s work / 10s rest · repeat all 4 for 2 rounds" },
  { id: "cool-down", title: "Cool-down", timing: "6 moves · 30s each" },
] as const;

export type WorkoutSection = typeof workoutSections[number]["id"];
export type ExerciseCard = {
  id: string;
  section: WorkoutSection;
  title: string;
  start: number;
  work: number;
  rest: number;
  rounds: number;
  note: string;
  frame: number;
};

export const exerciseCards: ExerciseCard[] = [
  {
    "id": "warm-up-01",
    "section": "warm-up",
    "title": "Ghost rope",
    "start": 21,
    "work": 30,
    "rest": 0,
    "rounds": 1,
    "note": "",
    "frame": 31
  },
  {
    "id": "warm-up-02",
    "section": "warm-up",
    "title": "Lateral squat walk",
    "start": 51,
    "work": 30,
    "rest": 0,
    "rounds": 1,
    "note": "",
    "frame": 61
  },
  {
    "id": "warm-up-03",
    "section": "warm-up",
    "title": "Squat + cross crunch",
    "start": 81,
    "work": 30,
    "rest": 0,
    "rounds": 1,
    "note": "",
    "frame": 91
  },
  {
    "id": "warm-up-04",
    "section": "warm-up",
    "title": "Butt kick pullbacks",
    "start": 111,
    "work": 30,
    "rest": 0,
    "rounds": 1,
    "note": "",
    "frame": 121
  },
  {
    "id": "warm-up-05",
    "section": "warm-up",
    "title": "Lateral squats",
    "start": 141,
    "work": 30,
    "rest": 0,
    "rounds": 1,
    "note": "",
    "frame": 151
  },
  {
    "id": "warm-up-06",
    "section": "warm-up",
    "title": "Dive bomber push-ups",
    "start": 171,
    "work": 30,
    "rest": 20,
    "rounds": 1,
    "note": "Then start the main workout.",
    "frame": 181
  },
  {
    "id": "main-01",
    "section": "main",
    "title": "Squat twist",
    "start": 221,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 231
  },
  {
    "id": "main-02",
    "section": "main",
    "title": "Reverse lunge + knee drive — right",
    "start": 271,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 281
  },
  {
    "id": "main-03",
    "section": "main",
    "title": "Reverse lunge + knee drive — left",
    "start": 321,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 331
  },
  {
    "id": "main-04",
    "section": "main",
    "title": "High knees",
    "start": 371,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 381
  },
  {
    "id": "main-05",
    "section": "main",
    "title": "Plank row",
    "start": 421,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 431
  },
  {
    "id": "main-06",
    "section": "main",
    "title": "Shoulder taps",
    "start": 471,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 481
  },
  {
    "id": "main-07",
    "section": "main",
    "title": "Push-up to toe touch",
    "start": 521,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 531
  },
  {
    "id": "main-08",
    "section": "main",
    "title": "Cross crunch to toe touch — right",
    "start": 571,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 581
  },
  {
    "id": "main-09",
    "section": "main",
    "title": "Cross crunch to toe touch — left",
    "start": 621,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 631
  },
  {
    "id": "main-10",
    "section": "main",
    "title": "Half burpees",
    "start": 671,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 681
  },
  {
    "id": "main-11",
    "section": "main",
    "title": "Prisoner squat knee to elbow",
    "start": 721,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 731
  },
  {
    "id": "main-12",
    "section": "main",
    "title": "1½ lateral squat — right",
    "start": 771,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 781
  },
  {
    "id": "main-13",
    "section": "main",
    "title": "1½ lateral squat — left",
    "start": 821,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 831
  },
  {
    "id": "main-14",
    "section": "main",
    "title": "Cross punches",
    "start": 871,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 881
  },
  {
    "id": "main-15",
    "section": "main",
    "title": "Heismans",
    "start": 921,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 931
  },
  {
    "id": "main-16",
    "section": "main",
    "title": "Mountain climbers",
    "start": 971,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 981
  },
  {
    "id": "main-17",
    "section": "main",
    "title": "Plank saw",
    "start": 1021,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1031
  },
  {
    "id": "main-18",
    "section": "main",
    "title": "Side plank dips — right",
    "start": 1071,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1081
  },
  {
    "id": "main-19",
    "section": "main",
    "title": "Side plank dips — left",
    "start": 1121,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1131
  },
  {
    "id": "main-20",
    "section": "main",
    "title": "Squat jumps",
    "start": 1171,
    "work": 35,
    "rest": 30,
    "rounds": 1,
    "note": "Longer break before power jacks.",
    "frame": 1181
  },
  {
    "id": "main-21",
    "section": "main",
    "title": "Power jacks",
    "start": 1236,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1246
  },
  {
    "id": "main-22",
    "section": "main",
    "title": "In & out squats",
    "start": 1286,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1296
  },
  {
    "id": "main-23",
    "section": "main",
    "title": "Squat walk",
    "start": 1336,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1346
  },
  {
    "id": "main-24",
    "section": "main",
    "title": "Plyo lunge drops",
    "start": 1386,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1396
  },
  {
    "id": "main-25",
    "section": "main",
    "title": "Butt kicks",
    "start": 1436,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1446
  },
  {
    "id": "main-26",
    "section": "main",
    "title": "Skater hops",
    "start": 1486,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1496
  },
  {
    "id": "main-27",
    "section": "main",
    "title": "Push-up + reach",
    "start": 1536,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1546
  },
  {
    "id": "main-28",
    "section": "main",
    "title": "Flutter kicks",
    "start": 1586,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1596
  },
  {
    "id": "main-29",
    "section": "main",
    "title": "Reverse crunch + hip lift",
    "start": 1636,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1646
  },
  {
    "id": "main-30",
    "section": "main",
    "title": "Single-leg ghost rope",
    "start": 1686,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "Alternate legs.",
    "frame": 1696
  },
  {
    "id": "main-31",
    "section": "main",
    "title": "Pop squats",
    "start": 1736,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1746
  },
  {
    "id": "main-32",
    "section": "main",
    "title": "Sprawl + 6 high knees",
    "start": 1786,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1796
  },
  {
    "id": "main-33",
    "section": "main",
    "title": "Commandos",
    "start": 1836,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1846
  },
  {
    "id": "main-34",
    "section": "main",
    "title": "Spider climbers",
    "start": 1886,
    "work": 35,
    "rest": 15,
    "rounds": 1,
    "note": "",
    "frame": 1896
  },
  {
    "id": "main-35",
    "section": "main",
    "title": "Burpees",
    "start": 1936,
    "work": 35,
    "rest": 30,
    "rounds": 1,
    "note": "Then start the finisher.",
    "frame": 1946
  },
  {
    "id": "finisher-01",
    "section": "finisher",
    "title": "Air squats",
    "start": 2001,
    "work": 20,
    "rest": 10,
    "rounds": 2,
    "note": "Do all 4 cards, then repeat once.",
    "frame": 2011
  },
  {
    "id": "finisher-02",
    "section": "finisher",
    "title": "High knee sprint",
    "start": 2031,
    "work": 20,
    "rest": 10,
    "rounds": 2,
    "note": "Do all 4 cards, then repeat once.",
    "frame": 2041
  },
  {
    "id": "finisher-03",
    "section": "finisher",
    "title": "Push-ups",
    "start": 2061,
    "work": 20,
    "rest": 10,
    "rounds": 2,
    "note": "Do all 4 cards, then repeat once.",
    "frame": 2071
  },
  {
    "id": "finisher-04",
    "section": "finisher",
    "title": "Mountain climbers sprint",
    "start": 2091,
    "work": 20,
    "rest": 10,
    "rounds": 2,
    "note": "Repeat all 4. After round 2, recover for 20s.",
    "frame": 2101
  },
  {
    "id": "cool-down-01",
    "section": "cool-down",
    "title": "Cobra stretch",
    "start": 2251,
    "work": 30,
    "rest": 0,
    "rounds": 1,
    "note": "",
    "frame": 2261
  },
  {
    "id": "cool-down-02",
    "section": "cool-down",
    "title": "Child’s pose",
    "start": 2281,
    "work": 30,
    "rest": 0,
    "rounds": 1,
    "note": "",
    "frame": 2291
  },
  {
    "id": "cool-down-03",
    "section": "cool-down",
    "title": "Kneeling quad stretch — side 1",
    "start": 2311,
    "work": 30,
    "rest": 0,
    "rounds": 1,
    "note": "",
    "frame": 2321
  },
  {
    "id": "cool-down-04",
    "section": "cool-down",
    "title": "Kneeling quad stretch — side 2",
    "start": 2341,
    "work": 30,
    "rest": 0,
    "rounds": 1,
    "note": "",
    "frame": 2351
  },
  {
    "id": "cool-down-05",
    "section": "cool-down",
    "title": "Shoulder rolls",
    "start": 2371,
    "work": 30,
    "rest": 0,
    "rounds": 1,
    "note": "",
    "frame": 2381
  },
  {
    "id": "cool-down-06",
    "section": "cool-down",
    "title": "Neck rolls",
    "start": 2401,
    "work": 30,
    "rest": 0,
    "rounds": 1,
    "note": "",
    "frame": 2411
  }
];

export const videoTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
