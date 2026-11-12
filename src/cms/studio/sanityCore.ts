/**
 * Science of Gifts — Sanity v3 Schema & Studio Core API
 *
 * Provides the standard Sanity v3 schema definition helpers (`defineType`,
 * `defineField`, `defineArrayMember`, `defineConfig`, `defineCliConfig`) along
 * with an executable `Rule` validation engine, document preview evaluator, and
 * desk structure builder so schemas can be compiled, inspected, and unit-tested
 * locally without requiring a live Sanity project connection.
 */

export type SanityPrimitiveType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'text'
  | 'url'
  | 'date'
  | 'datetime'
  | 'slug'
  | 'image'
  | 'file'
  | 'reference'
  | 'array'
  | 'object'
  | 'block';

export interface SanityValidationContext {
  parent?: Record<string, unknown>;
  document?: Record<string, unknown>;
  path?: string[];
}

export interface SanityValidationIssue {
  level: 'error' | 'warning';
  message: string;
}

export type CustomValidatorFn<T = unknown> = (
  value: T,
  context: SanityValidationContext
) => true | string | { message: string; level?: 'error' | 'warning' } | Promise<true | string>;

export interface SanityRule {
  required(): SanityRule;
  optional(): SanityRule;
  min(minValue: number): SanityRule;
  max(maxValue: number): SanityRule;
  length(exactLength: number): SanityRule;
  positive(): SanityRule;
  integer(): SanityRule;
  precision(limit: number): SanityRule;
  regex(pattern: RegExp, options?: { name?: string; invert?: boolean }): SanityRule;
  uri(options?: { scheme?: Array<string | RegExp>; allowRelative?: boolean }): SanityRule;
  unique(): SanityRule;
  custom<T = unknown>(fn: CustomValidatorFn<T>): SanityRule;
  error(message?: string): SanityRule;
  warning(message?: string): SanityRule;
  /** Internal evaluator used by schema tests and publication-readiness checks */
  _evaluate(
    value: unknown,
    context?: SanityValidationContext
  ): SanityValidationIssue[];
  /** Human-readable summary of configured rule constraints */
  _describe(): string;
}

interface RuleCheck {
  description: string;
  level: 'error' | 'warning';
  customMessage?: string;
  test: (value: unknown, context: SanityValidationContext) => string | null;
}

export class ExecutableSanityRule implements SanityRule {
  private isRequiredFlag = false;
  private defaultLevel: 'error' | 'warning' = 'error';
  private pendingMessage?: string;
  private checks: RuleCheck[] = [];

  required(): SanityRule {
    this.isRequiredFlag = true;
    this.checks.push({
      description: 'required()',
      level: this.defaultLevel,
      test: (value) => {
        if (value === undefined || value === null) {
          return this.pendingMessage || 'This field is required.';
        }
        if (typeof value === 'string' && value.trim().length === 0) {
          return this.pendingMessage || 'This field cannot be empty.';
        }
        if (Array.isArray(value) && value.length === 0) {
          return this.pendingMessage || 'At least one item is required.';
        }
        if (
          typeof value === 'object' &&
          !Array.isArray(value) &&
          '_type' in (value as Record<string, unknown>) &&
          (value as Record<string, unknown>)._type === 'slug' &&
          typeof (value as { current?: string }).current === 'string' &&
          !(value as { current: string }).current.trim()
        ) {
          return this.pendingMessage || 'Slug value is required.';
        }
        return null;
      },
    });
    return this;
  }

  optional(): SanityRule {
    this.isRequiredFlag = false;
    return this;
  }

  min(minValue: number): SanityRule {
    this.checks.push({
      description: `min(${minValue})`,
      level: this.defaultLevel,
      test: (value) => {
        if (value === undefined || value === null || value === '') return null;
        if (typeof value === 'number') {
          return value < minValue
            ? this.pendingMessage || `Value must be at least ${minValue}.`
            : null;
        }
        if (typeof value === 'string' || Array.isArray(value)) {
          return value.length < minValue
            ? this.pendingMessage || `Minimum length is ${minValue}.`
            : null;
        }
        return null;
      },
    });
    return this;
  }

  max(maxValue: number): SanityRule {
    this.checks.push({
      description: `max(${maxValue})`,
      level: this.defaultLevel,
      test: (value) => {
        if (value === undefined || value === null || value === '') return null;
        if (typeof value === 'number') {
          return value > maxValue
            ? this.pendingMessage || `Value must be at most ${maxValue}.`
            : null;
        }
        if (typeof value === 'string' || Array.isArray(value)) {
          return value.length > maxValue
            ? this.pendingMessage || `Maximum length is ${maxValue}.`
            : null;
        }
        return null;
      },
    });
    return this;
  }

  length(exactLength: number): SanityRule {
    this.checks.push({
      description: `length(${exactLength})`,
      level: this.defaultLevel,
      test: (value) => {
        if (value === undefined || value === null || value === '') return null;
        if (typeof value === 'string' || Array.isArray(value)) {
          return value.length !== exactLength
            ? this.pendingMessage || `Must have length ${exactLength}.`
            : null;
        }
        return null;
      },
    });
    return this;
  }

  positive(): SanityRule {
    this.checks.push({
      description: 'positive()',
      level: this.defaultLevel,
      test: (value) => {
        if (value === undefined || value === null) return null;
        if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
          return this.pendingMessage || 'Value must be a positive number greater than 0.';
        }
        return null;
      },
    });
    return this;
  }

  integer(): SanityRule {
    this.checks.push({
      description: 'integer()',
      level: this.defaultLevel,
      test: (value) => {
        if (value === undefined || value === null) return null;
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          return this.pendingMessage || 'Value must be a whole integer.';
        }
        return null;
      },
    });
    return this;
  }

  precision(_limit: number): SanityRule {
    return this;
  }

  regex(
    pattern: RegExp,
    options?: { name?: string; invert?: boolean }
  ): SanityRule {
    this.checks.push({
      description: `regex(${pattern.toString()})`,
      level: this.defaultLevel,
      test: (value) => {
        if (value === undefined || value === null || value === '') return null;
        const str =
          typeof value === 'string'
            ? value
            : typeof (value as { current?: string })?.current === 'string'
            ? (value as { current: string }).current
            : '';
        if (!str) return null;
        const matched = pattern.test(str);
        const valid = options?.invert ? !matched : matched;
        if (!valid) {
          return (
            this.pendingMessage ||
            `Value "${str}" does not match expected format${options?.name ? ` (${options.name})` : ''}.`
          );
        }
        return null;
      },
    });
    return this;
  }

  uri(options?: {
    scheme?: Array<string | RegExp>;
    allowRelative?: boolean;
  }): SanityRule {
    this.checks.push({
      description: `uri(${JSON.stringify(options ?? {})})`,
      level: this.defaultLevel,
      test: (value) => {
        if (value === undefined || value === null || value === '') return null;
        if (typeof value !== 'string') return 'URL must be a string.';
        const trimmed = value.trim();
        if (options?.allowRelative && trimmed.startsWith('/')) {
          return null;
        }
        try {
          const parsed = new URL(trimmed);
          const protocol = parsed.protocol.replace(/:$/, '');
          const schemes = options?.scheme ?? ['https', 'http'];
          const schemeAllowed = schemes.some((s) =>
            typeof s === 'string' ? s === protocol : s.test(protocol)
          );
          if (!schemeAllowed) {
            return (
              this.pendingMessage ||
              `URL must use allowed protocol (${schemes.join(', ')}).`
            );
          }
          if (!parsed.hostname || !parsed.hostname.includes('.')) {
            return this.pendingMessage || 'URL must include a valid hostname.';
          }
          return null;
        } catch {
          return this.pendingMessage || `Invalid URL: "${trimmed}".`;
        }
      },
    });
    return this;
  }

  unique(): SanityRule {
    this.checks.push({
      description: 'unique()',
      level: this.defaultLevel,
      test: (value) => {
        if (!Array.isArray(value) || value.length <= 1) return null;
        const serialized = value.map((item) => {
          if (item && typeof item === 'object' && '_ref' in item) {
            return `ref:${String((item as { _ref: unknown })._ref)}`;
          }
          if (item && typeof item === 'object' && 'id' in item) {
            return `id:${String((item as { id: unknown }).id)}`;
          }
          return JSON.stringify(item);
        });
        const uniqueSet = new Set(serialized);
        if (uniqueSet.size !== serialized.length) {
          return this.pendingMessage || 'Duplicate items are not allowed.';
        }
        return null;
      },
    });
    return this;
  }

  custom<T = unknown>(fn: CustomValidatorFn<T>): SanityRule {
    this.checks.push({
      description: 'custom()',
      level: this.defaultLevel,
      test: (value, context) => {
        const res = fn(value as T, context);
        if (res === true || res instanceof Promise) return null;
        if (typeof res === 'string') return res;
        if (res && typeof res === 'object' && 'message' in res) {
          return res.message;
        }
        return null;
      },
    });
    return this;
  }

  error(message?: string): SanityRule {
    this.defaultLevel = 'error';
    if (message) {
      this.pendingMessage = message;
      const last = this.checks[this.checks.length - 1];
      if (last) {
        last.level = 'error';
        last.customMessage = message;
      }
    }
    return this;
  }

  warning(message?: string): SanityRule {
    this.defaultLevel = 'warning';
    if (message) {
      this.pendingMessage = message;
      const last = this.checks[this.checks.length - 1];
      if (last) {
        last.level = 'warning';
        last.customMessage = message;
      }
    }
    return this;
  }

  _evaluate(
    value: unknown,
    context: SanityValidationContext = {}
  ): SanityValidationIssue[] {
    const issues: SanityValidationIssue[] = [];
    for (const check of this.checks) {
      const failure = check.test(value, context);
      if (failure) {
        issues.push({
          level: check.level,
          message: check.customMessage || failure,
        });
      }
    }
    return issues;
  }

  _describe(): string {
    if (this.checks.length === 0) {
      return this.isRequiredFlag ? 'Rule.required()' : 'Rule.optional()';
    }
    return `Rule.${this.checks.map((c) => c.description).join('.')}`;
  }
}

export function createSanityRule(): SanityRule {
  return new ExecutableSanityRule();
}

export interface SanityFieldGroupDefinition {
  name: string;
  title: string;
  description?: string;
  default?: boolean;
  icon?: string;
}

export interface SanityFieldsetDefinition {
  name: string;
  title: string;
  description?: string;
  options?: {
    collapsible?: boolean;
    collapsed?: boolean;
    columns?: number;
  };
}

export interface SanityOrderingSortItem {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SanityOrderingDefinition {
  title: string;
  name: string;
  by: SanityOrderingSortItem[];
}

export interface SanityPreviewValue {
  title?: string;
  subtitle?: string;
  description?: string;
  media?: unknown;
  badge?: string;
}

export interface SanityPreviewConfig {
  select?: Record<string, string>;
  prepare?: (selection: Record<string, any>) => SanityPreviewValue;
}

export interface SanityArrayMemberDefinition {
  type: string;
  name?: string;
  title?: string;
  to?: Array<{ type: string }>;
  options?: Record<string, unknown>;
  fields?: SanityFieldSpec[];
  marks?: {
    decorators?: Array<{ title: string; value: string }>;
    annotations?: SanityArrayMemberDefinition[];
  };
  styles?: Array<{ title: string; value: string }>;
  lists?: Array<{ title: string; value: string }>;
}

export type ReadOnlyCallback = (context: {
  document?: Record<string, any>;
  parent?: Record<string, any>;
  value?: any;
}) => boolean;

export type HiddenCallback = (context: {
  document?: Record<string, any>;
  parent?: Record<string, any>;
  value?: any;
}) => boolean;

export interface SanityFieldSpec {
  name: string;
  title: string;
  type: string;
  group?: string | string[];
  fieldset?: string;
  description?: string;
  initialValue?: unknown | (() => unknown);
  readOnly?: boolean | ReadOnlyCallback;
  hidden?: boolean | HiddenCallback;
  options?: Record<string, any>;
  to?: Array<{ type: string }>;
  of?: SanityArrayMemberDefinition[];
  fields?: SanityFieldSpec[];
  validation?: (Rule: SanityRule) => SanityRule | SanityRule[];
  preview?: SanityPreviewConfig;
}

export interface SanityTypeSpec {
  name: string;
  title: string;
  type: 'document' | 'object';
  description?: string;
  icon?: string;
  singleton?: boolean;
  __experimental_actions?: Array<'create' | 'update' | 'delete' | 'publish'>;
  groups?: SanityFieldGroupDefinition[];
  fieldsets?: SanityFieldsetDefinition[];
  fields: SanityFieldSpec[];
  initialValue?: Record<string, unknown> | (() => Record<string, unknown>);
  orderings?: SanityOrderingDefinition[];
  preview?: SanityPreviewConfig;
  validation?: (Rule: SanityRule) => SanityRule | SanityRule[];
}

/**
 * Standard Sanity v3 `defineType` helper
 */
export function defineType<T extends SanityTypeSpec>(schema: T): T {
  return schema;
}

/**
 * Standard Sanity v3 `defineField` helper
 */
export function defineField<T extends SanityFieldSpec>(field: T): T {
  return field;
}

/**
 * Standard Sanity v3 `defineArrayMember` helper
 */
export function defineArrayMember<T extends SanityArrayMemberDefinition>(
  member: T
): T {
  return member;
}

export interface SanityStudioConfig {
  name: string;
  title: string;
  projectId: string;
  dataset: string;
  apiVersion?: string;
  basePath?: string;
  plugins?: Array<{ name: string; options?: Record<string, unknown> }>;
  schema: {
    types: SanityTypeSpec[];
    templates?: (prev: Array<{ id: string; schemaType: string }>) => Array<{
      id: string;
      schemaType: string;
    }>;
  };
  document?: {
    newDocumentOptions?: (
      prev: Array<{ templateId: string }>,
      context: { creationContext: { type: string; schemaType?: string } }
    ) => Array<{ templateId: string }>;
    actions?: (
      prev: Array<{ action?: string }>,
      context: { schemaType: string }
    ) => Array<{ action?: string }>;
  };
}

/**
 * Standard Sanity v3 `defineConfig` helper
 */
export function defineConfig(config: SanityStudioConfig): SanityStudioConfig {
  return config;
}

export interface SanityCliConfig {
  api: {
    projectId: string;
    dataset: string;
  };
  studioHost?: string;
}

export function defineCliConfig(config: SanityCliConfig): SanityCliConfig {
  return config;
}

/**
 * Evaluates all field-level and document-level validation rules on a SanityTypeSpec
 * against a candidate document object.
 */
export function validateDocumentWithSchema(
  schema: SanityTypeSpec,
  doc: Record<string, any>
): {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
  warnings: Array<{ path: string; message: string }>;
} {
  const errors: Array<{ path: string; message: string }> = [];
  const warnings: Array<{ path: string; message: string }> = [];

  const runRuleSpec = (
    ruleBuilder: ((Rule: SanityRule) => SanityRule | SanityRule[]) | undefined,
    value: unknown,
    path: string,
    parent?: Record<string, unknown>
  ) => {
    if (!ruleBuilder) return;
    const built = ruleBuilder(createSanityRule());
    const rules = Array.isArray(built) ? built : [built];
    for (const rule of rules) {
      const issues = rule._evaluate(value, {
        document: doc,
        parent: parent ?? doc,
        path: path.split('.').filter(Boolean),
      });
      for (const issue of issues) {
        if (issue.level === 'error') {
          errors.push({ path, message: issue.message });
        } else {
          warnings.push({ path, message: issue.message });
        }
      }
    }
  };

  for (const field of schema.fields) {
    const val = doc[field.name];
    runRuleSpec(field.validation, val, field.name, doc);
  }

  runRuleSpec(schema.validation, doc, '_document', doc);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Resolves a dotted selection path (e.g., 'product.title' or 'images.0.alt') against a sample record
 * and executes the schema's `preview.prepare` function.
 */
export function evaluateDocumentPreview(
  schema: { preview?: SanityPreviewConfig },
  doc: Record<string, any>
): SanityPreviewValue {
  if (!schema.preview) {
    return {
      title: String(doc.title ?? doc.name ?? doc.id ?? 'Untitled'),
    };
  }
  const selected: Record<string, any> = {};
  const selectMap = schema.preview.select ?? {};
  for (const [key, pathStr] of Object.entries(selectMap)) {
    const segments = pathStr.split('.');
    let current: any = doc;
    for (const seg of segments) {
      if (current === undefined || current === null) break;
      current = current[seg];
    }
    selected[key] = current;
  }
  if (schema.preview.prepare) {
    return schema.preview.prepare(selected);
  }
  return {
    title: selected.title ? String(selected.title) : 'Untitled',
    subtitle: selected.subtitle ? String(selected.subtitle) : undefined,
    media: selected.media,
  };
}

function readSanityEnvVar(
  key: string,
  envOverride?: Record<string, string | undefined>
): string {
  if (envOverride && key in envOverride) {
    return String(envOverride[key] ?? '').trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  return '';
}

/**
 * Strictly parses an environment variable value into a boolean.
 * Ensures that string `"false"`, `"0"`, `"no"`, `""`, or `undefined` always
 * evaluates to `false` rather than truthy non-empty string coercion.
 */
export function parseStrictBooleanEnv(
  rawValue: string | boolean | undefined | null,
  defaultValue = false
): boolean {
  if (rawValue === undefined || rawValue === null) {
    return defaultValue;
  }
  if (typeof rawValue === 'boolean') {
    return rawValue;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (normalized === '') {
    return defaultValue;
  }
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return defaultValue;
}

export interface ResolvedSanityEnvironmentConfig {
  projectId: string;
  dataset: string;
  apiVersion: string;
  /** Strictly optional; not required for Studio setup or public datasets */
  apiReadToken?: string;
  /** Defaults to false; parsed explicitly so string "false" never enables draft preview */
  usePreviewDrafts: boolean;
  /** Defaults to 'published' for public datasets; only uses 'previewDrafts' when explicitly enabled with a token */
  perspective: 'published' | 'previewDrafts';
  /** Locked to 'local-catalog' in Phase 1 so configuring Studio never replaces the Astro content repository */
  frontendDataSource: 'local-catalog';
}

export function resolveSanityEnvironmentConfig(
  envOverride?: Record<string, string | undefined>
): ResolvedSanityEnvironmentConfig {
  const projectId =
    readSanityEnvVar('SANITY_STUDIO_PROJECT_ID', envOverride) ||
    readSanityEnvVar('SANITY_PROJECT_ID', envOverride) ||
    '';
  const dataset =
    readSanityEnvVar('SANITY_STUDIO_DATASET', envOverride) ||
    readSanityEnvVar('SANITY_DATASET', envOverride) ||
    '';
  const apiVersion =
    readSanityEnvVar('SANITY_STUDIO_API_VERSION', envOverride) ||
    readSanityEnvVar('SANITY_API_VERSION', envOverride) ||
    '2025-02-01';
  const rawToken = readSanityEnvVar('SANITY_API_READ_TOKEN', envOverride);
  const apiReadToken = rawToken.length > 0 ? rawToken : undefined;

  const rawPreviewFlag = readSanityEnvVar(
    'SANITY_USE_PREVIEW_DRAFTS',
    envOverride
  );
  const usePreviewDrafts = parseStrictBooleanEnv(rawPreviewFlag, false);

  const perspective: 'published' | 'previewDrafts' =
    usePreviewDrafts && Boolean(apiReadToken) ? 'previewDrafts' : 'published';

  return {
    projectId,
    dataset,
    apiVersion,
    apiReadToken,
    usePreviewDrafts,
    perspective,
    frontendDataSource: 'local-catalog',
  };
}

export function isSanityStudioEnvConfigured(
  envConfig: ResolvedSanityEnvironmentConfig = resolveSanityEnvironmentConfig()
): boolean {
  return Boolean(
    envConfig.projectId.length > 0 && envConfig.dataset.length > 0
  );
}

