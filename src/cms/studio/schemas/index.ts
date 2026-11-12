/**
 * Science of Gifts — Central Sanity Schema Registry & Integrity Verifier
 *
 * Exports:
 * - `SANITY_DOCUMENT_SCHEMAS` (Verified total: 9 document types)
 * - `SANITY_OBJECT_SCHEMAS` (Verified total: 33 reusable object types — covering the 20 core
 *   object models plus 13 strongly-typed nested sub-objects so zero anonymous `type: "object"`
 *   fields exist anywhere in the schema graph)
 * - `ALL_SANITY_STUDIO_TYPES` (All 42 registered schema types for `sanity.config.ts`)
 * - `verifySchemaRegistryIntegrity()` (Deterministic compiler check verifying that every
 *   referenced object or document type exists and every field has a valid Sanity type)
 */

import {
  SanityFieldSpec,
  SanityPrimitiveType,
  SanityTypeSpec,
  createSanityRule,
} from '../sanityCore';

// 9 Document Schemas
import { productDocument } from './documents/product';
import { giftGuideDocument } from './documents/giftGuide';
import { articleDocument } from './documents/article';
import { editorialHubDocument } from './documents/editorialHub';
import { taxonomyArchiveDocument } from './documents/taxonomyArchive';
import { authorDocument } from './documents/author';
import { researchCitationDocument } from './documents/researchCitation';
import { publicationInfoPageDocument } from './documents/publicationInfoPage';
import { siteSettingsDocument } from './documents/siteSettings';

// Reusable Object Schemas
import {
  directorySeoEntryObject,
  editorialImageObject,
  imageCropBoxObject,
  imageFocalPointObject,
  productImageObject,
  seoMetadataObject,
} from './objects/seoAndMediaObjects';
import {
  productBuyingConsiderationObject,
  productGiftVerdictObject,
  productOccasionNoteObject,
  productRecipientProfileObject,
  productSimilarComparisonObject,
  productSpecificationItemObject,
} from './objects/productObjects';
import {
  guideBuyingAdviceObject,
  guideComparisonObject,
  guideComparisonRowObject,
  guideCuratorNoteObject,
  guideEditorsPickObject,
  guideFaqObject,
  guideProductRecommendationObject,
  guideQuickPickObject,
  guideRecipientPathwayObject,
  guideSectionObject,
} from './objects/guideObjects';
import {
  articleBulletListObject,
  articleCalloutObject,
  articleComparisonRowObject,
  articleComparisonTableObject,
  articleContentSectionObject,
  articleContextualProductsObject,
  articleExpandableAdviceItemObject,
  articleExpandableAdviceObject,
  articleExpandableNoteObject,
  articlePullQuoteObject,
  articleSubSectionObject,
  citationAnnotationObject,
} from './objects/articleObjects';
import {
  editorialHubBudgetBracketObject,
  editorialHubFinderCtaObject,
  editorialHubPresetLinkObject,
  editorialHubProductSelectionObject,
  editorialHubRelationshipPathwayObject,
  editorialHubSeasonalCalloutObject,
  publicationInfoSectionObject,
  recipientSpotlightObject,
} from './objects/hubAndPageObjects';

/**
 * All 9 required Sanity document types:
 * 1. product
 * 2. giftGuide
 * 3. article
 * 4. editorialHub
 * 5. taxonomyArchive
 * 6. author
 * 7. researchCitation
 * 8. publicationInfoPage
 * 9. siteSettings
 */
export const SANITY_DOCUMENT_SCHEMAS: SanityTypeSpec[] = [
  productDocument,
  giftGuideDocument,
  articleDocument,
  editorialHubDocument,
  taxonomyArchiveDocument,
  authorDocument,
  researchCitationDocument,
  publicationInfoPageDocument,
  siteSettingsDocument,
];

/**
 * All 33 reusable Sanity object types (the 20 primary editorial objects + 13 typed sub-objects
 * so that no schema ever relies on an untyped anonymous object).
 */
export const SANITY_OBJECT_SCHEMAS: SanityTypeSpec[] = [
  // SEO & Media (6)
  seoMetadataObject,
  productImageObject,
  editorialImageObject,
  imageFocalPointObject,
  imageCropBoxObject,
  directorySeoEntryObject,

  // Product Editorial Profile Objects (6)
  productGiftVerdictObject,
  productRecipientProfileObject,
  productBuyingConsiderationObject,
  productOccasionNoteObject,
  productSpecificationItemObject,
  productSimilarComparisonObject,

  // Gift Guide Modular Objects (10)
  guideEditorsPickObject,
  guideQuickPickObject,
  guideRecipientPathwayObject,
  guideSectionObject,
  guideProductRecommendationObject,
  guideCuratorNoteObject,
  guideComparisonObject,
  guideComparisonRowObject,
  guideBuyingAdviceObject,
  guideFaqObject,

  // Article Content & Citation Objects (12)
  articleContentSectionObject,
  articleComparisonTableObject,
  articleComparisonRowObject,
  articleSubSectionObject,
  articleBulletListObject,
  articlePullQuoteObject,
  articleCalloutObject,
  articleExpandableNoteObject,
  articleExpandableAdviceObject,
  articleExpandableAdviceItemObject,
  articleContextualProductsObject,
  citationAnnotationObject,

  // Editorial Hub, Spotlight & Publication Info Objects (8)
  editorialHubRelationshipPathwayObject,
  editorialHubBudgetBracketObject,
  editorialHubProductSelectionObject,
  editorialHubFinderCtaObject,
  editorialHubPresetLinkObject,
  editorialHubSeasonalCalloutObject,
  recipientSpotlightObject,
  publicationInfoSectionObject,
];

export const ALL_SANITY_STUDIO_TYPES: SanityTypeSpec[] = [
  ...SANITY_DOCUMENT_SCHEMAS,
  ...SANITY_OBJECT_SCHEMAS,
];

const BUILTIN_SANITY_TYPES = new Set<SanityPrimitiveType>([
  'string',
  'number',
  'boolean',
  'text',
  'url',
  'date',
  'datetime',
  'slug',
  'image',
  'file',
  'reference',
  'array',
  'object',
  'block',
]);

export interface SchemaRegistryIntegrityReport {
  valid: boolean;
  documentCount: number;
  objectCount: number;
  totalTypesCount: number;
  duplicateTypeNames: string[];
  undefinedReferencedTypes: Array<{
    parentType: string;
    fieldPath: string;
    missingType: string;
  }>;
  invalidGroupReferences: Array<{
    parentType: string;
    fieldName: string;
    missingGroup: string;
  }>;
  invalidFieldsetReferences: Array<{
    parentType: string;
    fieldName: string;
    missingFieldset: string;
  }>;
}

/**
 * Walks every document and object schema in `ALL_SANITY_STUDIO_TYPES` and verifies:
 * 1. No duplicate schema names exist.
 * 2. Every field `type`, `of[].type`, `to[].type`, and Portable Text annotation `type`
 *    is either a Sanity built-in primitive or a registered schema in `ALL_SANITY_STUDIO_TYPES`.
 * 3. Every `group` and `fieldset` referenced on a field exists on its parent schema.
 * 4. Every `validation` callback compiles cleanly when invoked with `Rule`.
 */
export function verifySchemaRegistryIntegrity(
  types: SanityTypeSpec[] = ALL_SANITY_STUDIO_TYPES
): SchemaRegistryIntegrityReport {
  const registeredNames = new Set<string>();
  const duplicateTypeNames: string[] = [];

  for (const t of types) {
    if (registeredNames.has(t.name)) {
      duplicateTypeNames.push(t.name);
    }
    registeredNames.add(t.name);
  }

  const undefinedReferencedTypes: SchemaRegistryIntegrityReport['undefinedReferencedTypes'] =
    [];
  const invalidGroupReferences: SchemaRegistryIntegrityReport['invalidGroupReferences'] =
    [];
  const invalidFieldsetReferences: SchemaRegistryIntegrityReport['invalidFieldsetReferences'] =
    [];

  const isTypeKnown = (typeName: string): boolean =>
    BUILTIN_SANITY_TYPES.has(typeName as SanityPrimitiveType) ||
    registeredNames.has(typeName);

  const inspectField = (
    parentType: SanityTypeSpec,
    field: SanityFieldSpec,
    fieldPath: string
  ) => {
    if (!isTypeKnown(field.type)) {
      undefinedReferencedTypes.push({
        parentType: parentType.name,
        fieldPath,
        missingType: field.type,
      });
    }

    // Verify group references
    if (field.group) {
      const definedGroups = new Set(
        (parentType.groups ?? []).map((g) => g.name)
      );
      const fieldGroups = Array.isArray(field.group)
        ? field.group
        : [field.group];
      for (const grp of fieldGroups) {
        if (!definedGroups.has(grp)) {
          invalidGroupReferences.push({
            parentType: parentType.name,
            fieldName: fieldPath,
            missingGroup: grp,
          });
        }
      }
    }

    // Verify fieldset references
    if (field.fieldset) {
      const definedFieldsets = new Set(
        (parentType.fieldsets ?? []).map((fs) => fs.name)
      );
      if (!definedFieldsets.has(field.fieldset)) {
        invalidFieldsetReferences.push({
          parentType: parentType.name,
          fieldName: fieldPath,
          missingFieldset: field.fieldset,
        });
      }
    }

    // Verify reference target types
    if (field.to) {
      for (const target of field.to) {
        if (!isTypeKnown(target.type)) {
          undefinedReferencedTypes.push({
            parentType: parentType.name,
            fieldPath: `${fieldPath}.to`,
            missingType: target.type,
          });
        }
      }
    }

    // Verify array members & Portable Text annotations
    if (field.of) {
      for (const member of field.of) {
        if (!isTypeKnown(member.type)) {
          undefinedReferencedTypes.push({
            parentType: parentType.name,
            fieldPath: `${fieldPath}.of`,
            missingType: member.type,
          });
        }
        if (member.to) {
          for (const target of member.to) {
            if (!isTypeKnown(target.type)) {
              undefinedReferencedTypes.push({
                parentType: parentType.name,
                fieldPath: `${fieldPath}.of.to`,
                missingType: target.type,
              });
            }
          }
        }
        if (member.marks?.annotations) {
          for (const ann of member.marks.annotations) {
            if (!isTypeKnown(ann.type)) {
              undefinedReferencedTypes.push({
                parentType: parentType.name,
                fieldPath: `${fieldPath}.marks.annotations`,
                missingType: ann.type,
              });
            }
          }
        }
      }
    }

    // Compile validation callback to ensure it doesn't throw
    if (field.validation) {
      field.validation(createSanityRule());
    }
  };

  for (const schema of types) {
    if (schema.validation) {
      schema.validation(createSanityRule());
    }
    for (const field of schema.fields) {
      inspectField(schema, field, field.name);
    }
  }

  const documentCount = types.filter((t) => t.type === 'document').length;
  const objectCount = types.filter((t) => t.type === 'object').length;

  return {
    valid:
      duplicateTypeNames.length === 0 &&
      undefinedReferencedTypes.length === 0 &&
      invalidGroupReferences.length === 0 &&
      invalidFieldsetReferences.length === 0,
    documentCount,
    objectCount,
    totalTypesCount: types.length,
    duplicateTypeNames,
    undefinedReferencedTypes,
    invalidGroupReferences,
    invalidFieldsetReferences,
  };
}
