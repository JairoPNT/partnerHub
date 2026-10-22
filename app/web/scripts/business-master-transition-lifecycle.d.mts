export type TreeProof = { exists: boolean; files: { path: string; hash: string }[]; directories: string[];
  nodes: { path: string; dev: string; ino: string; mode: string; size?: string; mtimeNs?: string; ctimeNs?: string }[]; hash: string };
export type AncestorProof = { path: string; dev: string; ino: string; mode: string }[];
// Only the release producer constructs adapters. The optional capability is
// checked against the complete object's private identity, never its shape.
export type BusinessMasterTransitionAdapter = object & { cutoverPermit?: unknown; assertRetainedCapture?: (previousDirectory?: string) => Promise<void> };
export function executeBusinessMasterTransition(adapter: BusinessMasterTransitionAdapter): Promise<Readonly<{ outcome: "APPLIED" }>>;
export function captureBusinessMasterTree(directory: string): Promise<TreeProof>;
export function captureBusinessMasterAncestors(directory: string): Promise<AncestorProof>;
export function sha256(bytes: string | Uint8Array): string;
