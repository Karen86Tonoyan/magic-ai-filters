export interface MatchedSection {
  section_id: string;
  title: string;
  parent: string;
  depth: number;
  content_preview: string;
}

export interface RunManifest {
  run_id: string;
  schema_version: string;
  timestamp: string;
  query: string;
  source: 'pdfminer_offline' | 'pypdf_offline' | 'pageindex_online' | string;
  decision: 'ALLOW' | 'REJECT' | string;
  failed_gate: string | null;
  reject_type: string | null;
  reject_reason: string | null;
  confidence: number;
  evidence_count: number;
  evidence_paths: string[];
  matched_sections: MatchedSection[];
  latency_ms: number;
  strict_passed: boolean;
  schema_valid: boolean;
  false_accept_critical: boolean;
}

export async function loadAllRuns(): Promise<RunManifest[]> {
  const idx = await fetch('/results/index.json').then(r => r.json());
  const runs = await Promise.all(
    (idx.runs as string[]).map(p => fetch(`/results/${p}`).then(r => r.json()))
  );
  return runs as RunManifest[];
}
