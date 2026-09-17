// Version changes must be explicit: signed records retain their exact text.
export const WAIVER_VERSION = "2026-09-17.1";
export const MINIMUM_AGE = 7;
export const membershipCovers = {
  included: [
    "Regular club training on Monday and Friday, 4–6pm, at Tamarin Bay — you choose one or two sessions a week.",
  ],
  excluded: [
    "Gear: every duckie brings their own surfboard and a wetsuit or rashie (we recommend a wetsuit). The club does not lend, rent or store gear, and there is no club rashie.",
    "Competitions such as the Sunset Duckies Cup, socials and other events — these are organised and ticketed separately.",
  ],
} as const;
export const waiver = {
  title: "Parent / guardian liability waiver",
  introduction:
    'I confirm that I am the parent or legal guardian of the child named below, and that I am voluntarily enrolling them to participate in Sunset Duckies activities ("the activities") — including but not limited to club training sessions, occasional reef sessions at Dal, the Sunset Duckies Cup, and any other competitions, socials, or club events organised by the Sunset Duckies surf club at Tamarin Bay.',
  acknowledgements: [
    "Surfing is a physical activity that carries an inherent risk of injury, including from waves, rocks, reef, board contact, marine life, sun exposure, and other ocean conditions.",
    "Sunset Duckies is volunteer-run by coaches and parents. Reasonable safety measures are taken, but participation remains at our own risk.",
    `My child is at least ${MINIMUM_AGE} years old and can swim confidently in open water, including in waves up to around 2 m and in currents — as agreed with the head coach.`,
    "At least one parent or guardian from our family will be in the water for the full duration of every session.",
    "From time to time the crew surfs the reef at Dal instead of the bay. My child may join those sessions when the coach calls them, under the same rules.",
    "The organisers may take reasonable medical decisions in an emergency if I cannot be reached immediately.",
  ],
  agreements: [
    "Release the volunteer organisers, coaches, judges, and Sunset Duckies from any claim arising from ordinary risks of the activities.",
    "Follow all instructions from the coaches and any water or beach marshals on the day.",
    "Inform the head coach of any medical condition, allergy, or medication relevant to my child, and keep this up to date.",
  ],
  mediaYes:
    "I consent to photos and short videos of my child being used on Sunset Duckies social channels and recap posts.",
  mediaNo:
    "I do not consent — please blur or exclude my child from any posted media.",
  reef: "My child may join the occasional reef session at Dal when the coach calls it. The same parent-in-the-water rule applies there.",
  gear: "I understand the gear policy: my child brings their own surfboard and a wetsuit or rashie (we recommend a wetsuit) to every session. Borrowing is not an option — the club does not lend, rent or store gear, and there is no club rashie.",
  electronic:
    "I have read the waiver and registration details. I am a parent or legal guardian authorised to sign for this child. By selecting Sign and submit, I intend my typed name and any drawn signature to be my electronic signature on this record. I agree to receive and keep an electronic copy.",
} as const;
