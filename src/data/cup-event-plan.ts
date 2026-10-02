import type { BlogPost } from "./blog";

export const cupEventPlan: BlogPost = {
  slug: "cup-october-event-plan",
  title: "Making Cup day happen",
  titleAccent: "people, kit and a BBQ",
  kicker: "Cup Vol. 02 · Event planning",
  dateLabel: "2 October 2026",
  dateISO: "2026-10-02",
  location: "Tamarin, Mauritius",
  excerpt: "Judges, a BBQ, tables, music, electricity and four coloured rashies. Here is what we need to organise for Friday 16 October, who needs to take it on, and when it needs to be ready.",
  facts: [
    { value: "16 Oct", label: "Cup Vol. 02 · Tamarin Bay" },
    { value: "3 judges", label: "to confirm + a relief plan" },
    { value: "6 areas", label: "people and equipment to organise" },
    { value: "4 colours", label: "red · yellow · blue · green" },
  ],
  cover: {
    src: "/media/logbook/cup-vol-2-cover.webp",
    alt: "The Sunset Duckies crew and their surfboards on Tamarin beach.",
    caption: "A little planning on land makes the afternoon work for everyone.",
  },
  intro: [],
  sections: [],
  eventPlan: {
    summary: "Start with the people and the equipment we can borrow. Confirm the judges and kit by 7 October, brief the crew on the 12th, pack on the 14th and send the final reminder on the 15th. On Cup day, have the judging station ready before the first heat and the BBQ, tables and music ready for families arriving.",
    coordination: "Estelle coordinates the volunteer list and kit check, following the existing branding-board tasks. The individual roles and equipment lenders below still need to be confirmed. Keep names, contact details and completion on the private board; this post is the shared checklist, not a live roster. The task dates below are the proposed working plan.",
    deadlines: [
      { date: "7 Oct", task: "Confirm judges, crew leads, equipment lenders and the power plan." },
      { date: "12 Oct", task: "Brief judges and crew; test scoring, music and the agreed power setup." },
      { date: "14 Oct", task: "Pack scorecards, the four rashie colours and the equipment checklist." },
      { date: "15 Oct", task: "Confirm transport and handovers; send one final family reminder." },
      { date: "16 Oct", task: "Set up, check everything, run the Cup and return the borrowed kit." },
    ],
    areas: [
      {
        id: "judges", title: "Judges", need: "Three judges, with a plan for breaks and a named person coordinating them.",
        decision: "Who are the three judges, who covers a break, and who gives the briefing? Confirm their availability for the whole competition window.",
        kit: ["Judging table and chairs with a clear view", "Charged scoring phones and power banks", "Printed heat list, scorecards, pens and clipboards"],
        tasks: [
          { date: "7 Oct", owner: "Estelle", text: "Confirm three judges and a relief arrangement. Record the names and availability on the private board." },
          { date: "12 Oct", owner: "Estelle + judge coordinator (to confirm)", text: "Brief the judges on the agreed scoring, heat flow and rashie colours. Have the organiser assign judge access and test a sample score on each phone." },
          { date: "14 Oct", owner: "Estelle", text: "Pack printed scorecards and the heat list as a backup, alongside pens, clipboards and charged power banks." },
          { date: "16 Oct", owner: "Judge coordinator (to confirm)", text: "Meet the judges before the first heat, check the view and scoring access, and agree how scores reach the results desk." },
        ],
      },
      {
        id: "bbq", title: "BBQ", need: "A grill, fuel, cooking tools and someone responsible for setup, running it and clearing up.",
        decision: "Who brings the grill and fuel, and who runs each shift? The Cup page currently says we provide the grill and families bring their own food. Confirm that arrangement before the reminder; any paid food offer needs a separate decision.",
        kit: ["Grill and the correct fuel", "Cooking tools, serving tools and trays", "Prep table, cleaning supplies and rubbish bags", "Cool boxes and clearly identified food containers, as needed"],
        tasks: [
          { date: "7 Oct", owner: "Estelle + BBQ lead (to confirm)", text: "Confirm the grill lender, fuel, transport and BBQ lead. Agree whether helpers work in shifts so one person is not tied to the grill all afternoon." },
          { date: "12 Oct", owner: "BBQ lead (to confirm)", text: "Agree the cooking area, table needs and cleanup plan with the setup crew. Confirm the food arrangement and whether any shared supplies need buying." },
          { date: "15 Oct", owner: "Estelle", text: "Include the confirmed BBQ arrangement in the family reminder: what we provide, what families bring and who to speak to on the day." },
          { date: "16 Oct", owner: "BBQ lead + helpers (to confirm)", text: "Set up for the advertised BBQ period, run the agreed shifts, then clean and return the borrowed equipment." },
        ],
      },
      {
        id: "tables", title: "Tables and chairs", need: "A proposed starting point: three tables, for judging/check-in, BBQ preparation and the granola stall.",
        decision: "Confirm the final count and layout. Can judging and check-in share without interruptions, or do they need separate tables? Who lends, transports and collects each one?",
        kit: ["Three tables to start the count; a fourth if judging and check-in need separate space", "Chairs for the judges and desk crew", "Table labels and any shade or securing equipment the setup crew needs"],
        tasks: [
          { date: "7 Oct", owner: "Estelle + setup lead (to confirm)", text: "Confirm the number, size and source of the tables and chairs. Put a lender and return contact against each borrowed item on the private board." },
          { date: "12 Oct", owner: "Setup lead (to confirm)", text: "Sketch the beach layout with the judges, BBQ, granola stall and routes between them. Check the judges can see the water." },
          { date: "15 Oct", owner: "Setup lead + transport helper (to confirm)", text: "Agree collection, vehicle space, arrival time and who takes each item home." },
          { date: "16 Oct", owner: "Setup crew (to confirm)", text: "Set up and label the tables, then use the same kit list to check everything back out after the event." },
        ],
      },
      {
        id: "music", title: "Music and announcements", need: "A speaker, a playback phone and a microphone for heat calls and the awards.",
        decision: "Who brings the sound kit and who controls it? Music must be easy to lower when the MC or judges need to make an announcement.",
        kit: ["Speaker and microphone with compatible leads or wireless connection", "Playback phone with an offline playlist", "Chargers and the power source agreed with the electricity lead"],
        tasks: [
          { date: "7 Oct", owner: "Estelle + sound lead (to confirm)", text: "Confirm the speaker and microphone lender, the person running the music and the equipment’s power requirements." },
          { date: "12 Oct", owner: "Sound lead + MC", text: "Test the microphone, music and handover to announcements using the actual equipment. Save the playlist offline." },
          { date: "15 Oct", owner: "Sound lead (to confirm)", text: "Charge the devices and pack the correct leads. Agree transport and the return handover with the lender." },
          { date: "16 Oct", owner: "Sound lead + MC", text: "Check the sound before families arrive and agree a simple cue to lower the music for heat calls and awards." },
        ],
      },
      {
        id: "electricity", title: "Electricity", need: "A confirmed power source for the sound kit and charging, with a fallback that works on the beach.",
        decision: "What actually needs power, and for how long? Confirm whether charged batteries cover the event or an approved mains supply is available. Do not assume there is a usable socket at the beach.",
        kit: ["A device list with each item’s power and charging needs", "Charged speaker batteries and power banks where suitable", "Any outdoor power equipment specified by the competent person arranging the supply"],
        tasks: [
          { date: "7 Oct", owner: "Estelle + power lead (to confirm)", text: "List the sound and charging needs, confirm a source with the site contact, and assign someone competent to arrange any mains supply." },
          { date: "12 Oct", owner: "Power lead + sound lead (to confirm)", text: "Test the actual kit on the chosen supply. Agree cable placement, weather protection and a battery fallback before settling the layout." },
          { date: "15 Oct", owner: "Power lead (to confirm)", text: "Confirm access to the agreed supply, charge the backup equipment and pack the checked kit." },
          { date: "16 Oct", owner: "Power lead (to confirm)", text: "Check the setup before it is used and take responsibility for switching off and packing the power equipment at the end." },
        ],
      },
      {
        id: "rashies", title: "Four coloured rashies", need: "One red, one yellow, one blue and one green rashie: four distinct colours for the four surfers in a heat.",
        decision: "Who can provide the four colours, and do they fit the registered kids? Four is the minimum set; add suitable spare sizes if needed.",
        kit: ["Red rashie", "Yellow rashie", "Blue rashie", "Green rashie", "Labelled bags or a simple rack for the heat-change handover"],
        tasks: [
          { date: "7 Oct", owner: "Estelle", text: "Find and inspect the four colours. Record the lender and size of each one, then arrange any missing colour or size." },
          { date: "12 Oct", owner: "Estelle + heat marshal (to confirm)", text: "Check sizes against the entries and show judges and marshals the colour set. It should match the scoring system: red, yellow, blue and green." },
          { date: "14 Oct", owner: "Estelle", text: "Pack the full set together with any spares. Assign one person to collect and hand them out between heats." },
          { date: "16 Oct", owner: "Heat marshal (to confirm)", text: "Check each surfer’s colour against the heat list before entry, collect all four after each heat, and return the set to its lenders after cleaning." },
        ],
      },
    ],
  },
  outro: "First job: confirm the people and lenders. A piece of kit is only covered when someone has agreed to bring it, knows when it is needed and knows who will take it home. Use the Cup page for the latest event timings.",
  cta: {
    kicker: "Friday 16 October",
    title: "Everything comes together at",
    titleAccent: "Tamarin Bay",
    body: "The Cup page carries the family-facing programme. The content plan covers the daily videos; this checklist covers the people and equipment behind the day.",
    primary: { label: "See the Cup details", href: "/sunset-duckies-cup-vol-2" },
    secondary: { label: "See the daily content plan", href: "/blog/granola-cup-october-content-plan" },
  },
};
