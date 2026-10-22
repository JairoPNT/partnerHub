import type { TestContext } from "node:test";
import type { BusinessCutoverWriterInventory } from "./build-business-cutover-writer-inventory.mjs";
export const required: readonly string[];
export function image(t: TestContext, successor?: boolean): Promise<string>;
export function builder(root: string): Promise<{
  buildBusinessCutoverWriterInventory(): Promise<BusinessCutoverWriterInventory>;
  validateBusinessCutoverWriterInventory(value: unknown): BusinessCutoverWriterInventory;
}>;
