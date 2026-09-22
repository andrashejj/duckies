// A member's avatar URL: the profile photo behind /api/social/avatars, versioned
// by its last change so a new photo shows straight away, or null for the initial.
export const avatarUrl = (person: { id: string; photoVersion: string | null }) =>
  person.photoVersion ? `/api/social/avatars/${encodeURIComponent(person.id)}?v=${encodeURIComponent(person.photoVersion)}` : null;
