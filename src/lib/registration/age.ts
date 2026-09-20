export function ageAt(dateOfBirth: string, today = new Date()) {
  const birth = new Date(dateOfBirth + "T00:00:00Z");
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() &&
      today.getUTCDate() < birth.getUTCDate())
  )
    age--;
  return age;
}
