const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&#x2F;': '/',
  '&apos;': "'",
  '&#038;': '&',
  '&#060;': '<',
  '&#062;': '>',
};

const ENTITY_REGEX = new RegExp(Object.keys(ENTITIES).join('|'), 'gi');

export function decodeEntities(str: string): string {
  if (!str || typeof str !== 'string') return str;
  return str.replace(ENTITY_REGEX, (match) => ENTITIES[match.toLowerCase()] || match);
}

export function decodeObjectEntities(obj: any): any {
  if (typeof obj === 'string') return decodeEntities(obj);
  if (Array.isArray(obj)) return obj.map(decodeObjectEntities);
  if (obj && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = decodeObjectEntities(value);
    }
    return result;
  }
  return obj;
}
