export type RelationshipType =
  | 'is_a'
  | 'leads_to'
  | 'requires'
  | 'contrasts_with'
  | 'example_of'
  | 'part_of'
  | 'enables'
  | 'related_to';

export interface ConceptNode {
  id: string;
  concept: string;
  depth: number;
  parentId: string | null;
  isExpanding?: boolean;
  isRoot?: boolean;
}

export interface ConceptEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: string;
  type: RelationshipType;
}

export interface GeneratedConcept {
  concept: string;
  relationship: string;
  type: RelationshipType;
}
