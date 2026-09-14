export function productSizes(sizes: string[]): string[] {
  return [...new Set(sizes.flatMap(size => size.split(/\s*[·,]\s*/g)).map(size => size.trim()).filter(Boolean))];
}
