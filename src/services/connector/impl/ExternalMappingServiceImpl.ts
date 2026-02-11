/**
 * External Mapping Service Implementation
 * 
 * Applies mapping rules and basic transforms.
 */

import { IExternalMappingService } from "../IExternalMappingService";
import { ExternalMappingResult, ExternalMappingRule, MappingTransform } from "../types/ExternalTypes";

export class ExternalMappingServiceImpl implements IExternalMappingService {
  mapExternalOrder(raw: Record<string, unknown>, rules: ExternalMappingRule[]): ExternalMappingResult {
    return this.applyMapping(raw, rules);
  }

  mapExternalProduct(raw: Record<string, unknown>, rules: ExternalMappingRule[]): ExternalMappingResult {
    return this.applyMapping(raw, rules);
  }

  private applyMapping(raw: Record<string, unknown>, rules: ExternalMappingRule[]): ExternalMappingResult {
    const mappedPayload: Record<string, unknown> = {};
    const errors: string[] = [];

    for (const rule of rules) {
      const value = this.getValueByPath(raw, rule.sourceField);

      if (value === undefined || value === null) {
        if (rule.required) {
          errors.push(`Missing source field: ${rule.sourceField}`);
        }
        continue;
      }

      const transformed = this.applyTransform(value, rule.transform);
      if (transformed === undefined && rule.required) {
        errors.push(`Transform failed for: ${rule.sourceField}`);
        continue;
      }

      this.setValueByPath(mappedPayload, rule.targetField, transformed);
    }

    return { mappedPayload, errors };
  }

  private applyTransform(value: unknown, transform?: MappingTransform): unknown {
    if (!transform) {
      return value;
    }

    switch (transform.type) {
      case "enum": {
        if (typeof value !== "string" || !transform.map) {
          return undefined;
        }
        return transform.map[value] ?? transform.map[value.toLowerCase()] ?? value;
      }
      case "number": {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? undefined : parsed;
      }
      case "currency": {
        return typeof value === "string" ? value.toUpperCase() : undefined;
      }
      case "string": {
        return value === null || value === undefined ? undefined : String(value);
      }
      case "boolean": {
        return Boolean(value);
      }
      case "lowercase": {
        return typeof value === "string" ? value.toLowerCase() : undefined;
      }
      case "stockStatus": {
        if (typeof value !== "string") {
          return undefined;
        }
        const normalized = value.toLowerCase();
        if (normalized === "instock") {
          return true;
        }
        if (normalized === "outofstock" || normalized === "onbackorder") {
          return false;
        }
        return undefined;
      }
      default:
        return value;
    }
  }

  private getValueByPath(source: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = source;

    for (const part of parts) {
      if (!current || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private setValueByPath(target: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split(".");
    let current: Record<string, unknown> = target;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current[part] = value;
        return;
      }

      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }

      current = current[part] as Record<string, unknown>;
    });
  }
}
