import type { ContentPlan } from "../lib/content-plan";

// Production task references were checked on 2 October 2026.
// Daily video tasks are the revised campaign plan, not live board statuses.
export const cupContentSchedule: ContentPlan = {
  "summary": "One video a day, no longer than 30 seconds, from 2 to 18 October. Follow the surfer and maker preparing for the Cup, alongside Estelle’s internship in Mauritius. Four short episodes introduce her, bring her into conversation with Abiguelle, and follow two host-led visits to local communities. The thread is people getting to know each other and doing the work together, leading up to 16 October.",
  "beats": [
    {
      "dayId": "oct-02",
      "date": "2–4 Oct",
      "title": "Start at the beach and the kitchen",
      "scene": "start",
      "shots": "2: first tray → 3: an honest taste → 4: meet Estelle, our visiting intern",
      "purpose": "Introduce the crew, Estelle and the date"
    },
    {
      "dayId": "oct-05",
      "date": "5–6 Oct",
      "title": "Listen to the people around us",
      "scene": "surf",
      "shots": "5: a surfer’s goal → 6: Estelle talks with Abiguelle",
      "purpose": "Let familiar faces and local voices lead"
    },
    {
      "dayId": "oct-07",
      "date": "7–9 Oct",
      "title": "Work, visit and learn together",
      "scene": "bake",
      "shots": "7: the second bake → 8: a host-led community visit → 9: meet the maker",
      "purpose": "See everyday work through the people doing it"
    },
    {
      "dayId": "oct-10",
      "date": "10–12 Oct",
      "title": "One more visit, then the invitation",
      "scene": "invite",
      "shots": "10: what to bring → 11: another visit and Estelle’s reflection → 12: the confirmed invitation",
      "purpose": "Bring what we learn back to the shared Cup story"
    },
    {
      "dayId": "oct-13",
      "date": "13–15 Oct",
      "title": "Get everything ready",
      "scene": "pack",
      "shots": "13: how to get a bag → 14: set up the stall → 15: pack the batch",
      "purpose": "Turn preparation into a clear invitation"
    },
    {
      "dayId": "oct-16",
      "date": "16 Oct",
      "title": "Bring both stories to the beach",
      "scene": "beach",
      "shots": "The surfer in the water → the maker at the stall → the Cup together",
      "purpose": "One 30-second glimpse of the day"
    },
    {
      "dayId": "oct-17",
      "date": "17–18 Oct",
      "title": "Thank people and share what we learned",
      "scene": "thanks",
      "shots": "17: the crew and the crowns → 18: one lesson and the next step",
      "purpose": "Finish the story and invite feedback"
    }
  ],
  "days": [
    {
      "id": "oct-02",
      "date": "2026-10-02",
      "title": "First taste and the opening post",
      "format": "Instagram Reel · vertical short video · 27 sec",
      "outcome": "The daily series opens with the beach, a real tray and the Cup date.",
      "tasks": [
        {
          "text": "Capture the test-bake tray for the opening teaser; keep the name and finished pack out of this first video.",
          "owner": "Estelle",
          "boardTaskId": "buzz-4"
        },
        {
          "text": "Let the founding families taste the batch at training and write down what they would change.",
          "owner": "Estelle",
          "boardTaskId": "recipe-3"
        },
        {
          "text": "Keep a real tray photo for the existing draft or video cover; reconcile overlapping scheduled posts with the new daily video plan.",
          "owner": "Estelle",
          "boardTaskId": "t-d0b36f0cb762"
        },
        {
          "text": "Record a beach hello, the tray and a short adult tasting answer. Capture Estelle’s internship introduction too, and save footage for 3 and 4 October.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "caption": "Two weeks to go. We are getting ready in the water and the kitchen. Follow along until the Cup on 16 October.",
      "notes": [
        "Use the current draft as the starting point for today’s Reel. Review the scheduled queue for the whole series and replace overlapping posts with the daily videos; keep useful event reminders.",
        "Keep the final name and pack out of this opening teaser, as the board requests. The packaging orders still take priority over a longer shoot."
      ],
      "prompts": [
        "The kids are practising, and we are baking. We have two weeks until the Cup."
      ],
      "production": {
        "cast": "Estelle or one organiser speaking; the maker’s hands; the same surfer we will follow to the Cup.",
        "edit": "Beach + kitchen montage",
        "audio": "One adult voiceover across the middle two clips; keep a little beach and kitchen sound.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "Close-up of the test-bake tray.",
            "text": "Two weeks to go"
          },
          {
            "seconds": 8,
            "visual": "The surfer practising at the beach; begin the adult introduction.",
            "text": null
          },
          {
            "seconds": 10,
            "visual": "The maker mixing in the kitchen; continue the same introduction.",
            "text": null
          },
          {
            "seconds": 6,
            "visual": "Hold a wide beach shot; put the date over this footage.",
            "text": "Friday 16 October · Tamarin Bay"
          }
        ]
      }
    },
    {
      "id": "oct-03",
      "date": "2026-10-03",
      "title": "Capture the first reaction",
      "format": "Instagram Reel · vertical short video · 26 sec",
      "outcome": "One genuine adult tasting reaction, using Friday’s footage.",
      "tasks": [
        {
          "text": "Select one adult reaction from yesterday’s tasting. Use a real answer without writing a testimonial for them.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "prompts": [
        "What is the first thing you notice when you taste it?"
      ],
      "caption": "First taste of the test batch. We are listening before the next bake. What would you change?",
      "notes": [
        "Use footage already recorded on Friday; no weekend shoot is needed. If no tasting answer was captured, the maker can give a short voiceover about what they are checking, without pretending it is customer feedback."
      ],
      "production": {
        "cast": "One adult taster; the maker’s hands in the food close-ups.",
        "edit": "One answer + food cutaway",
        "audio": "Keep the taster’s real answer running across the middle two clips.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "A spoonful of granola.",
            "text": "First taste"
          },
          {
            "seconds": 11,
            "visual": "The adult gives one short, honest tasting reaction.",
            "text": null
          },
          {
            "seconds": 7,
            "visual": "Close-up of the granola while the same answer finishes.",
            "text": null
          },
          {
            "seconds": 5,
            "visual": "Return to the adult with the bowl; hold the question over the image.",
            "text": "What would you change?"
          }
        ]
      }
    },
    {
      "id": "oct-04",
      "date": "2026-10-04",
      "title": "Meet Estelle: here for an internship",
      "format": "Instagram Reel · vertical short video · 27 sec",
      "outcome": "Estelle introduces her internship in Mauritius and one thing she hopes to learn alongside the people here.",
      "tasks": [
        {
          "text": "Record Estelle’s short introduction during Friday’s filming: why she is here and one thing she wants to learn. Use a real working moment as the cutaway.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Choose two possible community visits with Abiguelle. Ask local hosts what they would like to show and agree a convenient time before planning the filming.",
          "owner": "Estelle + Abiguelle"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "prompts": [
        "What brought you here for your internship, and what do you hope to learn from the people you meet?"
      ],
      "caption": "Meet Estelle, visiting Mauritius for her internship. Over the next two weeks, follow the work, conversations and people she gets to know as we prepare for the Cup on 16 October.",
      "notes": [
        "This is episode 1 of four, on 4, 6, 8 and 11 October. They replace those days’ earlier video ideas, so there is still only one Reel per day.",
        "Keep it personal and specific. The visits are proposed, not booked; Abiguelle and the hosts help choose the places."
      ],
      "production": {
        "cast": "Estelle on camera; club helpers in a working cutaway.",
        "edit": "Introduction + everyday work",
        "audio": "Estelle gives one short introduction in her own words.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "Estelle arrives at a real club or kitchen work session.",
            "text": "Meet Estelle · Internship 1/4"
          },
          {
            "seconds": 12,
            "visual": "Estelle explains why she is visiting and one thing she hopes to learn.",
            "text": null
          },
          {
            "seconds": 7,
            "visual": "Estelle helping with the actual work while her answer finishes.",
            "text": null
          },
          {
            "seconds": 5,
            "visual": "Return to Estelle.",
            "text": "Next: a conversation with Abiguelle"
          }
        ]
      },
      "series": "Estelle’s internship · 1/4"
    },
    {
      "id": "oct-05",
      "date": "2026-10-05",
      "title": "Follow one surfer at training",
      "format": "Instagram Reel · vertical short video · 27 sec",
      "outcome": "We meet the surfer we will follow through to Cup day.",
      "tasks": [
        {
          "text": "With family permission and the child’s willingness, record one practice attempt and one short answer.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "caption": "One thing to work on before 16 October. Meet the Duckie we will be following to the Cup.",
      "notes": [
        "Keep an ordinary attempt if it explains the goal. Ask the child in whichever language feels natural and check subtitles. Capture equipment close-ups for 10 October too."
      ],
      "prompts": [
        "What are you practising before the Cup?"
      ],
      "production": {
        "cast": "One willing Duckie, with family permission; one teammate cheering.",
        "edit": "Mini interview + action",
        "audio": "The child’s own answer; natural water and cheering sounds.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "The Duckie picks up their board.",
            "text": "One goal before the Cup"
          },
          {
            "seconds": 9,
            "visual": "One practice attempt in the water.",
            "text": null
          },
          {
            "seconds": 10,
            "visual": "The same child gives one short answer on the sand.",
            "text": null
          },
          {
            "seconds": 5,
            "visual": "A teammate cheers.",
            "text": "See you on 16 October"
          }
        ]
      }
    },
    {
      "id": "oct-06",
      "date": "2026-10-06",
      "title": "Estelle in conversation with Abiguelle",
      "format": "Instagram Reel · vertical short video · 25 sec",
      "outcome": "Abiguelle shares one part of local daily life she would like Estelle to understand.",
      "tasks": [
        {
          "text": "Introduce Estelle to the shops you know.",
          "owner": "Abiguelle",
          "boardTaskId": "partners-2"
        },
        {
          "text": "Make the planned shop visits and record questions about the product, price, label and delivery.",
          "owner": "Estelle",
          "boardTaskId": "partners-3"
        },
        {
          "text": "Alongside the planned introductions, film a brief conversation with Abiguelle in a quiet, familiar place. Ask one question and keep one answer.",
          "owner": "Estelle + Abiguelle + camera helper"
        },
        {
          "text": "Confirm the two visit ideas with their hosts. Agree what activity can be shared and which adults want to take part; do not assume shop visits are community visits.",
          "owner": "Estelle + Abiguelle"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "notes": [
        "Use Abiguelle’s own answer; this is a conversation, not a scripted endorsement or a claim to represent the whole island.",
        "The stockist introductions and product questions remain separate board tasks. Keep commercial terms private and do not imply anyone has agreed to stock granola."
      ],
      "prompts": [
        "Estelle to Abiguelle: “What would you like me to understand about everyday life here?”"
      ],
      "caption": "Estelle’s internship, 2/4. A conversation with Abiguelle about the people and everyday routines she wants Estelle to get to know. One question, one answer, and somewhere to start.",
      "production": {
        "cast": "Estelle and Abiguelle together; both have speaking parts.",
        "edit": "Two-person conversation",
        "audio": "Estelle asks one question in about 5 seconds; Abiguelle answers in about 12 seconds.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "Both together in a familiar place.",
            "text": "With Abiguelle · Internship 2/4"
          },
          {
            "seconds": 5,
            "visual": "Estelle asks her question.",
            "text": null
          },
          {
            "seconds": 12,
            "visual": "Abiguelle gives one concrete answer.",
            "text": null
          },
          {
            "seconds": 5,
            "visual": "Both together listening or continuing the conversation.",
            "text": "Learning from the people here"
          }
        ]
      },
      "series": "Estelle’s internship · 2/4"
    },
    {
      "id": "oct-07",
      "date": "2026-10-07",
      "title": "Film the second bake",
      "format": "Instagram Reel · vertical short video · 28 sec",
      "outcome": "The second bake becomes a short process video, with a recipe observation today and extra footage saved for Friday’s maker introduction.",
      "tasks": [
        {
          "text": "Make the second bake with tuned quantities and save the final recipe version.",
          "owner": "Estelle",
          "boardTaskId": "recipe-4"
        },
        {
          "text": "Capture the real kitchen photo requested on the board as well as the maker clips.",
          "owner": "Estelle",
          "boardTaskId": "t-d0b36f0cb762"
        },
        {
          "text": "Confirm volunteers, including someone who can capture Cup-day moments.",
          "owner": "Estelle",
          "boardTaskId": "event-4"
        },
        {
          "text": "Finish the event kit check before spending time editing.",
          "owner": "Estelle",
          "boardTaskId": "event-5"
        },
        {
          "text": "Film mixing, the tray and the cooled batch. Include one actual recipe adjustment in today’s answer and record the maker introduction for 9 October in the same session.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "notes": [
        "Film around the actual bake. Save a kitchen portrait for the board’s photo task as well as the video clips."
      ],
      "prompts": [
        "What did you change or check after the first tasting?"
      ],
      "caption": "Bake number two. Here is what is happening in the kitchen as we get ready for the Cup.",
      "production": {
        "cast": "The maker’s hands; the maker speaks off camera.",
        "edit": "Five-shot process montage",
        "audio": "One short maker voiceover over the mixing and tray clips; retain kitchen sounds.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "Weigh ingredients.",
            "text": "Bake number two"
          },
          {
            "seconds": 6,
            "visual": "Pour the weighed ingredients into the bowl.",
            "text": "Weigh"
          },
          {
            "seconds": 7,
            "visual": "Mix while the maker explains one thing they are checking.",
            "text": "Mix"
          },
          {
            "seconds": 7,
            "visual": "Spread the mix on the baking tray; finish the sentence.",
            "text": "Bake"
          },
          {
            "seconds": 5,
            "visual": "Show the cooled granola.",
            "text": "Next from the kitchen: meet the maker"
          }
        ]
      }
    },
    {
      "id": "oct-08",
      "date": "2026-10-08",
      "title": "First community visit: let the host lead",
      "format": "Instagram Reel · vertical short video · 27 sec",
      "outcome": "A local host introduces one everyday activity and Estelle listens or takes part where invited.",
      "tasks": [
        {
          "text": "Visit the first host with Abiguelle at the agreed time. Let the host choose one ordinary activity to explain: for example a community kitchen, neighbourhood group or local workshop, if they welcome a visit.",
          "owner": "Estelle + Abiguelle"
        },
        {
          "text": "Record one willing adult host’s short explanation and two clips of the activity. Check the wording and subtitles with them before posting.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "prompts": [
        "Estelle to the host: “What happens here on an ordinary day, and what would you like me to understand about it?”"
      ],
      "caption": "Estelle’s internship, 3/4. Today our host showed us one part of their everyday work. [Add their preferred name and one specific thing they shared, after checking the wording with them.] Thank you for welcoming us.",
      "notes": [
        "The setting is a proposal until the host confirms. Share the activity in its own right; a product pitch is not needed.",
        "Agree filming with the people involved. Keep unconsenting bystanders and children out of the frame; let the host choose how their name and place appear.",
        "If the visit moves, swap this episode with another daily video. An Estelle reflection can stand in, clearly saying the visit is still ahead."
      ],
      "production": {
        "cast": "Estelle, one willing adult local host and Abiguelle if available.",
        "edit": "Host interview + activity cutaway",
        "audio": "One host answer in their preferred language; Estelle listens. Check translated subtitles with the host.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "A detail of the activity the host chose to show.",
            "text": "Meeting our host · Internship 3/4"
          },
          {
            "seconds": 12,
            "visual": "The host explains one part of their daily work to Estelle.",
            "text": null
          },
          {
            "seconds": 7,
            "visual": "The activity continues; Estelle joins only if invited. Keep the host’s answer over the clip.",
            "text": null
          },
          {
            "seconds": 5,
            "visual": "The host and Estelle finish together.",
            "text": "Thank you for showing us"
          }
        ]
      },
      "series": "Estelle’s internship · 3/4"
    },
    {
      "id": "oct-09",
      "date": "2026-10-09",
      "title": "Introduce the maker and confirm the offer",
      "format": "Instagram Reel · vertical short video · 27 sec",
      "outcome": "The person behind the trays introduces themselves and how they like to eat the granola.",
      "tasks": [
        {
          "text": "Finish the maker story as a video of no more than 30 seconds, using Wednesday’s footage.",
          "owner": "Estelle",
          "boardTaskId": "buzz-5"
        },
        {
          "text": "Collect and check the paper bags and stickers before showing the finished packaging.",
          "owner": "Estelle",
          "boardTaskId": "packaging-4"
        },
        {
          "text": "Complete the cost sheet with receipts or quotes and a proposed price and batch quantity.",
          "owner": "Estelle",
          "boardTaskId": "recipe-5"
        },
        {
          "text": "Agree the selling price, the number of bags and the tasting allocation.",
          "owner": "Dori",
          "boardTaskId": "produce-3"
        },
        {
          "text": "Close registration and prepare the draw as planned; update any sign-up wording in scheduled posts.",
          "owner": "Estelle",
          "boardTaskId": "event-6"
        },
        {
          "text": "Use Wednesday’s maker interview; keep the spoken answer to one sentence.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "caption": "Meet the person behind the trays. Breakfast bowl or straight from the bag: how would you eat yours?",
      "notes": [
        "Make this the maker Reel in place of the photo-only draft. Only publish product details agreed through today’s packaging, recipe and price checks."
      ],
      "prompts": [
        "How do you like to eat the granola?"
      ],
      "production": {
        "cast": "The same maker on camera and their working hands.",
        "edit": "Mini interview + kitchen cutaway",
        "audio": "The maker introduces themself and answers one question; one short sentence each.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "The maker lifts a spoon of granola.",
            "text": "Meet the maker"
          },
          {
            "seconds": 12,
            "visual": "Maker looks to camera, introduces themself and begins the answer.",
            "text": null
          },
          {
            "seconds": 7,
            "visual": "Their hands working while the answer finishes.",
            "text": null
          },
          {
            "seconds": 5,
            "visual": "Return to the maker holding the bowl.",
            "text": "Breakfast bowl or straight from the bag?"
          }
        ]
      }
    },
    {
      "id": "oct-10",
      "date": "2026-10-10",
      "title": "Show what to bring",
      "format": "Instagram Reel · vertical short video · 24 sec",
      "outcome": "Families see the equipment they should bring in one saveable video.",
      "tasks": [
        {
          "text": "Use Monday’s equipment close-ups with a short adult voiceover; check the list against the current Cup page.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "prompts": [
        "Here is what to bring to Tamarin Bay on Friday."
      ],
      "caption": "Getting your things ready for Friday? Save this short packing list and check the Cup page for the latest details.",
      "notes": [
        "Reuse training footage. Do not advertise new entries after the planned registration close unless the organisers have confirmed otherwise."
      ],
      "production": {
        "cast": "One helper’s hands laying out the kit; no one needs to speak.",
        "edit": "Six-shot packing checklist",
        "audio": "Natural sounds only: board, fabric, bottle and bag. No interview needed.",
        "subtitles": false,
        "shots": [
          {
            "seconds": 3,
            "visual": "Board and an empty bag.",
            "text": "Packing for the Cup"
          },
          {
            "seconds": 4,
            "visual": "Show the board.",
            "text": "Board"
          },
          {
            "seconds": 4,
            "visual": "Lay down a rashie.",
            "text": "Rashie"
          },
          {
            "seconds": 4,
            "visual": "Add sunscreen and water.",
            "text": "Sunscreen + water"
          },
          {
            "seconds": 4,
            "visual": "Add a towel.",
            "text": "Towel"
          },
          {
            "seconds": 5,
            "visual": "Hold on the complete kit.",
            "text": "Save this · Details on the Cup page"
          }
        ]
      }
    },
    {
      "id": "oct-11",
      "date": "2026-10-11",
      "title": "Another local visit: one thing Estelle learned",
      "format": "Instagram Reel · vertical short video · 26 sec",
      "outcome": "A second host shares a different everyday experience, followed by one specific reflection from Estelle.",
      "tasks": [
        {
          "text": "Finish the planned outside-club conversations and record buying interest and price objections.",
          "owner": "Estelle",
          "boardTaskId": "buzz-6"
        },
        {
          "text": "Review the 12 and 15 October scheduled captions. Replace vague timing once the heat start is confirmed.",
          "owner": "Estelle",
          "boardTaskId": "t-e6612a5bf83a"
        },
        {
          "text": "Make the second visit agreed with Abiguelle and a local host. Choose a different activity or community from the first visit, based on who welcomes the conversation.",
          "owner": "Estelle + Abiguelle"
        },
        {
          "text": "Record a short host explanation, an activity clip and Estelle’s one-sentence reflection. Let the host check the caption, their name and any translated subtitles.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "notes": [
        "Arrange the visit earlier in the week if Sunday does not suit the host. Publishing on Sunday does not require filming on Sunday.",
        "Keep the reflection about what Estelle learned, with the host’s own perspective heard first. Avoid sweeping claims about Mauritius or staged helping scenes.",
        "If a second host is unavailable, record Estelle reflecting with Abiguelle on the first visit and label it a reflection. Do not imply a second visit happened.",
        "Finish the existing board conversations and caption checks too. Hold unconfirmed Cup timings until Monday’s sign-off."
      ],
      "prompts": [
        "To the host: “What would you like a visitor to understand about what you do here?”",
        "To Estelle afterwards: “What is one thing you learned today that you did not know before?”"
      ],
      "caption": "Estelle’s internship, 4/4. Another conversation, another part of everyday life here. [Add one actual observation in Estelle’s words and thank the host by their preferred name.] Tomorrow: the practical details for Friday’s Cup.",
      "production": {
        "cast": "One willing adult from a second local community or activity; Estelle; Abiguelle if available.",
        "edit": "Host perspective + intern reflection",
        "audio": "A short host explanation, then one sentence from Estelle about what she learned.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "An everyday activity chosen by the second host.",
            "text": "Learning here · Internship 4/4"
          },
          {
            "seconds": 10,
            "visual": "The host explains one thing to Estelle.",
            "text": null
          },
          {
            "seconds": 5,
            "visual": "Show that same activity with its natural sound.",
            "text": null
          },
          {
            "seconds": 8,
            "visual": "Estelle gives her specific reflection to camera.",
            "text": "One thing I learned"
          }
        ]
      },
      "series": "Estelle’s internship · 4/4"
    },
    {
      "id": "oct-12",
      "date": "2026-10-12",
      "title": "Publish the practical invitation",
      "format": "Instagram Reel · vertical short video · 27 sec",
      "outcome": "One short invitation points families to the confirmed programme.",
      "tasks": [
        {
          "text": "Sign off the heat draw and safety plan.",
          "owner": "Dori",
          "boardTaskId": "event-7"
        },
        {
          "text": "Update the Cup page with the confirmed start time and run of show.",
          "owner": "Andras",
          "boardTaskId": "t-1d6d46461a7b"
        },
        {
          "text": "Complete the production go/no-go before promising granola sales.",
          "owner": "Dori",
          "boardTaskId": "produce-4"
        },
        {
          "text": "Buy the first-batch ingredients and record the receipts.",
          "owner": "Estelle",
          "boardTaskId": "produce-5"
        },
        {
          "text": "Use the agreed programme in the countdown content and link to the Cup page.",
          "owner": "Estelle",
          "boardTaskId": "buzz-7"
        },
        {
          "text": "Record the invitation after the programme is signed off and the Cup page is updated.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "caption": "This Friday at Tamarin Bay. Send this to the family you are coming with. The Cup page has the confirmed programme.",
      "notes": [
        "Replace the overlapping countdown post with this Reel. Link to the Cup page from the profile and the Story reshare. Use only the signed-off times."
      ],
      "prompts": [
        "Join us at Tamarin Bay on Friday. Here is when to arrive."
      ],
      "production": {
        "cast": "Estelle or one organiser on camera; helpers preparing in the cutaway.",
        "edit": "Invitation + preparation cutaway",
        "audio": "One adult states the confirmed meeting time and place; record after sign-off.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "A wide shot of the beach.",
            "text": "This Friday · 16 October"
          },
          {
            "seconds": 12,
            "visual": "An organiser gives the confirmed time and meeting place.",
            "text": null
          },
          {
            "seconds": 7,
            "visual": "Preparation footage while the invitation finishes.",
            "text": null
          },
          {
            "seconds": 5,
            "visual": "Hold on the beach.",
            "text": "Save the date · Check the Cup page"
          }
        ]
      }
    },
    {
      "id": "oct-13",
      "date": "2026-10-13",
      "title": "Confirm what happens after the Cup",
      "format": "Instagram Reel · vertical short video · 27 sec",
      "outcome": "An adult clearly explains how to get a bag at the Cup and what is known about future batches.",
      "tasks": [
        {
          "text": "Follow up with potential shops and confirm which trials are agreed and on what terms.",
          "owner": "Estelle",
          "boardTaskId": "partners-4"
        },
        {
          "text": "Record the maker or Estelle giving the current buying details; show only agreed product information.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "notes": [
        "If the launch is delayed, explain that update instead. Keep shop terms private and call unconfirmed future demand an interest list."
      ],
      "prompts": [
        "Where can people try it, and how can they get another bag?"
      ],
      "caption": "Coming to the Cup? Here is how to find the granola. We will share future-batch details when they are confirmed.",
      "production": {
        "cast": "Estelle or the maker speaking; hands showing the real product.",
        "edit": "Product explanation + detail",
        "audio": "One checked sentence about where to find the table and what will be available.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "The actual bag, or a bowl if the bags are not ready.",
            "text": "How to try it"
          },
          {
            "seconds": 12,
            "visual": "Estelle or the maker explains the confirmed Cup-day offer.",
            "text": null
          },
          {
            "seconds": 7,
            "visual": "Close-up of the product while the explanation finishes.",
            "text": null
          },
          {
            "seconds": 5,
            "visual": "Hold the bag or bowl in frame.",
            "text": "Meet us at the granola table"
          }
        ]
      }
    },
    {
      "id": "oct-14",
      "date": "2026-10-14",
      "title": "Prepare the stall and the camera",
      "format": "Instagram Reel · vertical short video · 23 sec",
      "outcome": "Viewers see the stall take shape without needing a full event rehearsal.",
      "tasks": [
        {
          "text": "Prepare the stall, numbered labels, clear price sign and interest or order form.",
          "owner": "Estelle",
          "boardTaskId": "event-9"
        },
        {
          "text": "Print the event material and pack the rashies and prize bags.",
          "owner": "Estelle",
          "boardTaskId": "event-8"
        },
        {
          "text": "Take three short clips while preparing the stall and event material.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "notes": [
        "Keep forms, personal details and private notes out of shot. Save any baking footage for tomorrow."
      ],
      "prompts": [
        "This is where you will find us on Friday."
      ],
      "caption": "Two days to go. The table, the signs and the Cup kit are coming together.",
      "production": {
        "cast": "Estelle or a stall helper; hands and preparation only.",
        "edit": "Four-shot setup montage",
        "audio": "Natural setup sounds; no spoken lines needed.",
        "subtitles": false,
        "shots": [
          {
            "seconds": 3,
            "visual": "The empty table before setup.",
            "text": "Two days to go"
          },
          {
            "seconds": 7,
            "visual": "A helper lays out the stall kit.",
            "text": "Getting the table ready"
          },
          {
            "seconds": 7,
            "visual": "Close-up of the real, approved price sign with the kit.",
            "text": "One last check"
          },
          {
            "seconds": 6,
            "visual": "The helper finishes the practice setup.",
            "text": "Next: pack the granola"
          }
        ]
      }
    },
    {
      "id": "oct-15",
      "date": "2026-10-15",
      "title": "Pack the batch and send the reminder",
      "format": "Instagram Reel · vertical short video · 27 sec",
      "outcome": "The final preparation video shows the real batch and reminds people about tomorrow.",
      "tasks": [
        {
          "text": "Bake, pack and number the bags; record the production actuals.",
          "owner": "Estelle",
          "boardTaskId": "produce-6"
        },
        {
          "text": "Help with the bake and packing.",
          "owner": "Abiguelle",
          "boardTaskId": "produce-7"
        },
        {
          "text": "Capture the packaging sneak peek and check the scheduled countdown caption.",
          "owner": "Estelle",
          "boardTaskId": "buzz-7"
        },
        {
          "text": "Send the Thursday reminder with times, what to bring and the confirmed parent instructions.",
          "owner": "Estelle",
          "boardTaskId": "event-10"
        },
        {
          "text": "Film four short clips during packing and one of the event equipment ready to go.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "caption": "The bags are packed and the Cup is tomorrow. Come for the surfing and meet us at the granola table.",
      "notes": [
        "Only use the ready-to-sell wording if the batch is ready. Fold the useful reminder from the scheduled bonfire post into this video’s caption. Send the practical WhatsApp reminder separately."
      ],
      "prompts": [
        "The bags are packed and the Cup is tomorrow."
      ],
      "production": {
        "cast": "The maker and one packing helper; mostly hands.",
        "edit": "Five-shot packing montage",
        "audio": "Natural bag rustle and kitchen sounds; no spoken lines needed.",
        "subtitles": false,
        "shots": [
          {
            "seconds": 3,
            "visual": "The first real bag being filled.",
            "text": "Tomorrow"
          },
          {
            "seconds": 6,
            "visual": "Fill the next bag.",
            "text": "Pack"
          },
          {
            "seconds": 6,
            "visual": "Apply the actual sticker.",
            "text": "Label"
          },
          {
            "seconds": 6,
            "visual": "Line up the finished bags.",
            "text": "Ready for the table"
          },
          {
            "seconds": 6,
            "visual": "Boards and packed kit by the door.",
            "text": "Friday 16 October · Tamarin Bay"
          }
        ]
      }
    },
    {
      "id": "oct-16",
      "date": "2026-10-16",
      "title": "Bring both stories to the beach",
      "format": "Instagram Reel · vertical short video · 30 sec",
      "outcome": "One Cup-day video brings the surfer and maker together while the event is happening.",
      "tasks": [
        {
          "text": "Run the event desk and programme.",
          "owner": "Estelle",
          "boardTaskId": "event-11"
        },
        {
          "text": "Run the granola stall and record paid bags, interest and feedback.",
          "owner": "Abiguelle",
          "boardTaskId": "event-12"
        },
        {
          "text": "Introduce the granola before the crowns as part of the day's programme.",
          "owner": "Dori",
          "boardTaskId": "event-13"
        },
        {
          "text": "Use the existing stall-reveal draft for the daily video, with the actual name, size, price and where to buy; keep a real stall photo too.",
          "owner": "Estelle",
          "boardTaskId": "t-e3c4f839a1ad"
        },
        {
          "text": "The camera helper records the surfer and maker, then sends three usable clips to Estelle for one quick edit.",
          "owner": "Camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "caption": "We are here at the Sunset Duckies Cup. Come and meet the crew and find the granola table.",
      "notes": [
        "Publish while the invitation is still useful. If the edit only goes out after the event, change the ending to Thanks for today. Collect awards footage for tomorrow; it does not all have to fit into today’s video.",
        "Use the current name, bag size, price and stall location in the caption. Event duties take priority; a single short hello from the beach is enough when busy.",
        "The 30-second cut is for posting while the stall is open. If posting afterwards, replace the final overlay with “Thank you for coming”."
      ],
      "prompts": [
        "We made it to Cup day. Come and say hello."
      ],
      "production": {
        "cast": "Our familiar surfer; the maker at the stall; a willing adult visitor.",
        "edit": "Five-shot Cup-day montage",
        "audio": "Natural beach sound and one short hello from the maker or adult visitor.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "The beach on Cup day.",
            "text": "Cup day"
          },
          {
            "seconds": 7,
            "visual": "Our familiar surfer in the water.",
            "text": null
          },
          {
            "seconds": 7,
            "visual": "The same maker we met earlier, now at the granola table.",
            "text": null
          },
          {
            "seconds": 7,
            "visual": "One willing adult gives a hello or genuine quick reaction.",
            "text": null
          },
          {
            "seconds": 6,
            "visual": "Hold a wide view of the table.",
            "text": "Come and meet us at the granola table"
          }
        ]
      }
    },
    {
      "id": "oct-17",
      "date": "2026-10-17",
      "title": "Thank the crew and share the results",
      "format": "Instagram Reel · vertical short video · 27 sec",
      "outcome": "The next-day thank-you uses the familiar faces and confirmed Cup results.",
      "tasks": [
        {
          "text": "Publish the confirmed results and thank-you on Instagram and WhatsApp.",
          "owner": "Estelle",
          "boardTaskId": "event-14"
        },
        {
          "text": "Keep the real crowns photo requested on the board and use it as the recap video cover if useful.",
          "owner": "Estelle",
          "boardTaskId": "t-d0b36f0cb762"
        },
        {
          "text": "Choose four Cup clips and record a short thank-you voiceover. Keep the full results in the caption or linked page.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "caption": "Thank you for Friday, Duckies. A few moments from the Cup and our first granola outing. If you tried it, tell us what you thought.",
      "notes": [
        "Replace the crowns photo draft with this recap Reel, keeping the photo as its cover if useful. The Instagram and WhatsApp thank-you still goes out on the board’s 17 October date."
      ],
      "prompts": [
        "What was your favourite moment yesterday?"
      ],
      "production": {
        "cast": "The familiar surfer and maker; one adult organiser delivering the thank-you.",
        "edit": "Highlights + spoken thank-you",
        "audio": "One adult thank-you over the middle clips, with cheering at the opening.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "Crowns or a cheering moment from the Cup.",
            "text": "Thank you, Duckies"
          },
          {
            "seconds": 9,
            "visual": "Our familiar surfer after their turn; begin the adult thank-you.",
            "text": null
          },
          {
            "seconds": 9,
            "visual": "The maker and helpers at the table; finish the thank-you.",
            "text": null
          },
          {
            "seconds": 6,
            "visual": "The crew together.",
            "text": "Tried the granola? Tell us what you thought"
          }
        ]
      }
    },
    {
      "id": "oct-18",
      "date": "2026-10-18",
      "title": "Write down what happened",
      "format": "Instagram Reel · vertical short video · 27 sec",
      "outcome": "A final short video shares one real lesson, with the detail in the follow-up blog.",
      "tasks": [
        {
          "text": "Complete the 48-hour report: bags sold, future interest, refusals and what people said.",
          "owner": "Estelle",
          "boardTaskId": "event-15"
        },
        {
          "text": "Write the follow-up blog from the report and interviews, with approved photos, real quotes and the agreed next step.",
          "owner": "Estelle"
        },
        {
          "text": "Record one adult answer after reviewing the report, using Cup footage to illustrate it.",
          "owner": "Estelle + camera helper"
        },
        {
          "text": "Edit one vertical video to 30 seconds or less, check subtitles and facts, then publish today’s Reel. Reuse it in Stories.",
          "owner": "Estelle"
        }
      ],
      "notes": [
        "Link the follow-up blog when it is published. Keep private financial details out of the video and distinguish sales, samples and unconfirmed future interest.",
        "The final overlay asks for feedback. If the recap blog is already live, replace it with “Read the Cup recap”."
      ],
      "prompts": [
        "What would you do differently for the next batch?"
      ],
      "caption": "One thing we learned from the Cup and the first batch. Thanks for helping us work out what comes next.",
      "production": {
        "cast": "The maker or Estelle; saved Cup footage for one cutaway.",
        "edit": "Reflection + next step",
        "audio": "One real observation and one next step, recorded after the team’s review.",
        "subtitles": true,
        "shots": [
          {
            "seconds": 3,
            "visual": "The maker with the bowl or remaining kit.",
            "text": "What we learned"
          },
          {
            "seconds": 12,
            "visual": "The maker or Estelle shares one real observation.",
            "text": null
          },
          {
            "seconds": 7,
            "visual": "Relevant Cup footage while they explain the next step.",
            "text": null
          },
          {
            "seconds": 5,
            "visual": "Return to the speaker.",
            "text": "Tell us what you thought"
          }
        ]
      }
    }
  ],
  "guides": [
    {
      "title": "The story and the audience",
      "body": "Club families need practical details and familiar faces. Other Tamarin families need to feel welcome. Granola buyers need to see the food, meet the maker and know the price and buying route. Each post asks for one action. The product story rests on the taste and the people making it; granola income and club spending remain separate. Estelle’s internship connects these strands: she is visiting to learn, meets people through Abiguelle, and hears from local hosts about their everyday lives. The four episodes are part of the daily series, with no second video required on those days."
    },
    {
      "title": "Estelle’s internship: four short episodes",
      "body": "4 October: who Estelle is and what she hopes to learn. 6 October: one conversation with Abiguelle. 8 October: a first local host shows an everyday activity. 11 October: another host and one thing Estelle learned. Let Abiguelle and the hosts suggest the places: a neighbourhood group, a community kitchen or a workshop might fit, if they want a visit. Focus on conversations and daily life rather than sightseeing. Leave room for people to speak in their own language and check the subtitles together. These visits do not need a granola sales message; the connection is Estelle getting to know the people she is working alongside."
    },
    {
      "title": "How to record it ourselves",
      "body": "Batch the simple filming: on 2 October capture the beach, tasting and Estelle’s introduction for 2–4; training on the 5th supplies the surfer and equipment clips; the second bake on the 7th supplies 7 and 9; packing on 14–15 supplies the final preparation. Record the Abiguelle conversation on the 6th and arrange two short host-led visits for the 8th and 11th episodes, filming earlier if that suits the hosts. Film vertically in daylight. Keep each answer to one thought and check subtitles. The 30-second limit includes opening and closing text. Allow 10–20 minutes a day for editing and posting, plus filming; plan separate time for arranging and travelling to the community visits once the hosts and places are confirmed."
    },
    {
      "title": "Keep the look and voice consistent",
      "body": "Use the existing cream, coral, sun-yellow and ink look, with the date in the same place on title frames. Reuse Getting ready for 16 October when it fits. Let natural kitchen and beach sound carry the scene. Use real ingredients and packaging, and the person's own words. Check family permission and the child's willingness before filming identifiable children for public posts. Ask children about surfing and adults about the product."
    },
    {
      "title": "How this fits the team's work",
      "body": "Production dates and owners still follow the branding board checked on 2 October. This revised plan adds a daily video commitment from 2 to 18 October, including weekends. Estelle assembles and posts; a camera helper captures people while they work. Dori checks event and product promises before they go into captions. Review the existing scheduled queue once at the start, convert the relevant photo drafts into video posts and remove overlapping feed posts. Keep the useful logistics reminders. The public plan does not itself change scheduled Instagram posts or the private board."
    },
    {
      "title": "If the fortnight gets busy",
      "body": "Keep the daily rhythm with a single 10–15 second clip: one person, one answer and the date on screen. Use footage captured earlier with an honest voiceover when there is no new shoot. Drop extra scenes and transitions, keep the video under 30 seconds, and reshare that same video to Stories."
    }
  ]
};
