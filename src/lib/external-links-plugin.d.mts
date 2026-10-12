export function isExternalHref(href: unknown): boolean;
export function externalLinksPlugin(): {
  name: string;
  element: { filter: string[]; visit(node: unknown, ctx: unknown): void };
};
