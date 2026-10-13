export function readUmami(env?: Record<string, string | undefined>): {
  scriptUrl: string;
  origin: string;
  websiteId: string;
  domains: string;
} | null;
