// Version changes must be explicit: signed records retain their exact text.
export const WAIVER_VERSION = "2026-09-14.1";
export const waiver = {
  title: "Parent / guardian liability waiver",
  introduction:
    'I confirm that I am the parent or legal guardian of the child named below, and that I am voluntarily enrolling them to participate in Sunset Duckies activities ("the activities") — including but not limited to club training sessions, the Sunset Duckies Cup, and any other competitions, socials, or club events organised by the Sunset Duckies surf club at Tamarin Bay.',
  acknowledgements: [
    "Surfing is a physical activity that carries an inherent risk of injury, including from waves, rocks, board contact, marine life, sun exposure, and other ocean conditions.",
    "Sunset Duckies is volunteer-run by coaches and parents. Reasonable safety measures are taken, but participation remains at our own risk.",
    "My child can swim confidently in open water, including in waves up to around 2 m and in currents — as agreed with the head coach.",
    "At least one parent or guardian from our family will be in the water for the full duration of every session, including our child's free first session.",
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
  gear: "I understand the gear policy: borrowing for the free first session is fine, then own board and winter wetsuit for regular training.",
  electronic:
    "I have read the waiver and registration details. I am a parent or legal guardian authorised to sign for this child. By selecting Sign and submit, I intend my typed name and any drawn signature to be my electronic signature on this record. I agree to receive and keep an electronic copy.",
} as const;
