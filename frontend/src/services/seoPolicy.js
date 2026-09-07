export const INDEX_FOLLOW = 'index,follow';
export const NOINDEX_FOLLOW = 'noindex,follow';

export function knowledgeListingRobots({ hasSearchQuery, routeMissing }) {
  return hasSearchQuery || routeMissing ? NOINDEX_FOLLOW : INDEX_FOLLOW;
}

