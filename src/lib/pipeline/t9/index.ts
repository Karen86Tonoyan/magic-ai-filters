/**
 * ALFA T9 UNIFIED v2.0 — orchestrator
 * Copyright © Karen Tonoyan | ALFA Ecosystem
 */
import { FiltrTonoyana } from './filtry-tonoyana';
import { buildGraph } from './graph-builder';
import { OutputIntegrityGuard, isExecutionTrusted } from './output-integrity';
import { T9Predictor, injectContract } from './predictor';
import { HallucinationSnapshotDB } from './snapshot-db';
import { TrajectoryGuard } from './trajectory-guard';
import type { ExecutionReport, T9Decision, T9UnifiedResult, TrajectoryContract } from './types';

export * from './types';
export { T9Predictor, injectContract, TrajectoryGuard, OutputIntegrityGuard, FiltrTonoyana, HallucinationSnapshotDB, buildGraph };

const ORDER: T9Decision[] = ['PASS', 'VERIFY', 'HOLD', 'BLOCK'];
const maxDecision = (ds: T9Decision[]): T9Decision =>
  ds.reduce((acc, d) => (ORDER.indexOf(d) > ORDER.indexOf(acc) ? d : acc), 'PASS');

export function parseExecutionReport(raw: string): ExecutionReport {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      status: /\bDONE\b/i.test(raw) ? 'DONE' : /\bBLOCKED\b/i.test(raw) ? 'BLOCKED' : 'UNKNOWN',
      repo_path: '',
      files_changed: [],
      patch_applied: false,
      pytest_result: /\b[1-9]\d*\s+failed\b/.test(raw)
        ? 'FAILED'
        : /\b\d+\s+passed\b/.test(raw)
          ? 'PASSED'
          : 'NOT_RUN',
      pytest_output: '',
      command_output: '',
      diff_available: /diff/i.test(raw),
      diff_content: '',
    };
  }
  const statusRaw = String(
    (data.ALFA_EXECUTION_STATUS as string) || (data.alfa_execution_status as string) || 'UNKNOWN',
  ).toUpperCase();
  const pytestRaw = String((data.pytest_result as string) || 'NOT_RUN').toUpperCase();
  return {
    status: ['DONE', 'BLOCKED', 'PENDING', 'UNKNOWN'].includes(statusRaw)
      ? (statusRaw as ExecutionReport['status'])
      : 'UNKNOWN',
    repo_path: String(data.repo_path || ''),
    files_changed: Array.isArray(data.files_changed) ? (data.files_changed as string[]) : [],
    patch_applied: !!data.patch_applied,
    pytest_result: ['PASSED', 'FAILED', 'NOT_RUN'].includes(pytestRaw)
      ? (pytestRaw as ExecutionReport['pytest_result'])
      : 'NOT_RUN',
    pytest_output: String(data.pytest_output || ''),
    command_output: String(data.command_output || ''),
    diff_available: !!data.diff_available,
    diff_content: String(data.diff_content || ''),
  };
}

export class ALFAUnified {
  private t9 = new T9Predictor();
  private guard = new TrajectoryGuard();
  private oig = new OutputIntegrityGuard();
  private filtry = new FiltrTonoyana();
  private db = new HallucinationSnapshotDB();

  predict(userInput: string, history: string[] = []): TrajectoryContract {
    return this.t9.predict(userInput, history);
  }

  inject(contract: TrajectoryContract, prompt: string): string {
    return injectContract(contract, prompt);
  }

  verify(opts: {
    userInput: string;
    modelOutput: string;
    execReportJson?: string;
    history?: string[];
    toolTrace?: boolean;
    persist?: boolean;
  }): T9UnifiedResult {
    const { userInput, modelOutput, execReportJson, history = [], toolTrace = true, persist = true } = opts;
    const contract = this.t9.predict(userInput, history);
    const exec_report = execReportJson ? parseExecutionReport(execReportJson) : undefined;
    const observed = this.guard.observeState(modelOutput);
    const guard_result = this.guard.check(userInput, observed, contract.predicted_state, toolTrace);
    const overclaim_result = this.oig.scan(modelOutput, exec_report);
    const filter_report = this.filtry.analyze(modelOutput);
    const execution_trusted = isExecutionTrusted(exec_report);

    const filterDec: T9Decision =
      filter_report.decision === 'PASS' ? 'PASS' : filter_report.decision === 'WARN' ? 'VERIFY' : 'HOLD';
    let final = maxDecision([guard_result.decision, overclaim_result.decision, filterDec]);
    if (final === 'PASS' && !execution_trusted && exec_report) final = 'HOLD';

    const result: T9UnifiedResult = {
      user_input: userInput,
      model_output: modelOutput,
      contract,
      guard_result,
      overclaim_result,
      exec_report,
      filter_report,
      final_decision: final,
      execution_trusted,
      graph_mermaid: '',
      snapshot_id: '',
      timestamp: new Date().toISOString(),
    };
    result.graph_mermaid = buildGraph(result);
    result.snapshot_id = persist ? this.db.save(result) : '';
    return result;
  }

  stats() {
    return this.db.stats();
  }
}
