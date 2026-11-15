import React from 'react';
import {
  BookOpen,
  Compass,
  FileText,
  GraduationCap,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  User,
} from 'lucide-react';
import { OFFICIAL_SANITY_STUDIO_TYPES } from './schemas';
import { ExecutableSanityRule } from './sanityCore';
import { OfficialSanityProductAiAuthoringInput } from '../../components/studio/OfficialSanityProductAiAuthoringInput';

const LUCIDE_ICON_MAP: Record<string, React.ComponentType<any>> = {
  Package,
  BookOpen,
  FileText,
  Compass,
  Tags,
  User,
  GraduationCap,
  ShieldCheck,
  Settings,
  Sparkles,
};

/**
 * Adapts a `sanityCore.ts` validation function (`(Rule) => ...`) into an Official
 * Sanity Studio (`sanity` v6) `Rule.custom(...)` validator pair (error + warning).
 *
 * This prevents Official Sanity Studio from throwing runtime errors such as
 * `Validator for flag "regex" not found for type "Object"` (e.g. when `.regex()` is
 * used on a `slug` field or `.uri()` / `.optional()` is used on a `string` field),
 * while preserving 100% of the validation rules and error/warning severities.
 */
function adaptValidationFnForOfficialSanity(
  origValidationFn: (rule: any) => any
) {
  let hasWarningOrCustomRule = false;
  try {
    const probe = origValidationFn(new ExecutableSanityRule());
    const probeRules = Array.isArray(probe) ? probe : [probe];
    hasWarningOrCustomRule = probeRules.some(
      (r: any) =>
        r &&
        Array.isArray(r._checks) &&
        r._checks.some(
          (c: any) => c?.level === 'warning' || c?.kind === 'custom'
        )
    );
  } catch {
    hasWarningOrCustomRule = true;
  }

  return (SanityRule: any) => {
    const evaluateIssues = (
      value: unknown,
      context: any,
      targetLevel: 'error' | 'warning'
    ): true | string => {
      try {
        const configured = origValidationFn(new ExecutableSanityRule());
        const rules = Array.isArray(configured) ? configured : [configured];
        const evalContext = {
          parent: context?.parent as Record<string, unknown> | undefined,
          document: context?.document as Record<string, unknown> | undefined,
          path: Array.isArray(context?.path)
            ? context.path.map(String)
            : undefined,
        };
        for (const r of rules) {
          if (r && typeof r._evaluate === 'function') {
            const issues = r._evaluate(value, evalContext);
            const match = issues.find((i: any) => i.level === targetLevel);
            if (match) return match.message;
          }
        }
      } catch {}
      return true;
    };

    const baseRule =
      typeof SanityRule?.clone === 'function' ? SanityRule.clone() : SanityRule;
    const errorRule = baseRule.custom((value: unknown, context: any) =>
      evaluateIssues(value, context, 'error')
    );

    if (!hasWarningOrCustomRule) {
      return errorRule;
    }

    const RuleCtor = SanityRule?.constructor;
    const blankRule =
      typeof RuleCtor === 'function'
        ? new RuleCtor()
        : typeof SanityRule?.clone === 'function'
        ? SanityRule.clone()
        : SanityRule;

    // Strip any pre-populated type/valid flags from the secondary warning rule so options.list is never checked twice
    if (blankRule && Array.isArray(blankRule._rules)) {
      blankRule._rules = [];
    }

    const warningRule = blankRule
      .custom((value: unknown, context: any) =>
        evaluateIssues(value, context, 'warning')
      )
      .warning();

    return [errorRule, warningRule];
  };
}

function adaptSchemaNodeRecursively(node: any): any {
  if (!node || typeof node !== 'object') return node;

  const cloned: Record<string, any> = { ...node };

  if (typeof cloned.icon === 'string') {
    cloned.icon = LUCIDE_ICON_MAP[cloned.icon] || FileText;
  }

  if (Array.isArray(cloned.groups)) {
    cloned.groups = cloned.groups.map((grp: any) => ({
      ...grp,
      icon:
        typeof grp.icon === 'string'
          ? LUCIDE_ICON_MAP[grp.icon] || undefined
          : grp.icon,
    }));
  }

  if (typeof cloned.validation === 'function') {
    cloned.validation = adaptValidationFnForOfficialSanity(cloned.validation);
  }

  if (Array.isArray(cloned.fields)) {
    cloned.fields = cloned.fields.map((field: any) =>
      adaptSchemaNodeRecursively(field)
    );
  }

  if (Array.isArray(cloned.of)) {
    cloned.of = cloned.of.map((member: any) =>
      adaptSchemaNodeRecursively(member)
    );
  }

  return cloned;
}

/**
 * Translates `OFFICIAL_SANITY_STUDIO_TYPES` into official Sanity Studio (`sanity` v6)
 * schema definitions with React icon components, compatible validation rules, and attaches
 * the integrated `OfficialSanityProductAiAuthoringInput` workspace to the `product` document editor.
 */
export function buildOfficialSanitySchemaTypes(): any[] {
  return OFFICIAL_SANITY_STUDIO_TYPES.map((schemaSpec) => {
    const adapted = adaptSchemaNodeRecursively(schemaSpec);

    if (adapted.name === 'product') {
      return {
        ...adapted,
        components: {
          ...adapted.components,
          input: OfficialSanityProductAiAuthoringInput,
        },
      };
    }

    return adapted;
  });
}
