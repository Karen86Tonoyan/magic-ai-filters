import type {
  FilterDecisionLevel,
  FilterReport,
  FilterResult,
  FilterSeverity,
  HallucinationType,
} from './types';

const count = (text: string, patterns: RegExp[]): number =>
  patterns.reduce((acc, p) => acc + (text.match(p)?.length || 0), 0);

const make = (
  filter_name: string,
  passed: boolean,
  score: number,
  confidence: number,
  issues: string[],
  suggestions: string[],
  htypes: HallucinationType[],
  severity: FilterSeverity,
  metadata: Record<string, number>,
): FilterResult => ({
  filter_name,
  passed,
  score: Math.max(0, Math.min(100, score)),
  confidence,
  issues,
  suggestions,
  hallucination_types: htypes,
  severity,
  metadata,
});

const ABS = [
  /\bwszystk[iey]\b/gi, /\bzawsze\b/gi, /\bnigdy\b/gi, /\bkażdy\b/gi, /\bnikt\b/gi,
  /\bna pewno\b/gi, /\b100%\b/gi, /\bniemożliwe\b/gi,
  /\balways\b/gi, /\bnever\b/gi, /\bdefinitely\b/gi, /\babsolutely\b/gi, /\bimpossible\b/gi,
];
const ALT = [/\bjednak\b/gi, /\bz drugiej strony\b/gi, /\balternatywnie\b/gi, /\bhowever\b/gi, /\bon the other hand\b/gi, /\balternatively\b/gi];
const CLAIMS = [/\bbadania pokazują\b/gi, /\beksperci twierdzą\b/gi, /\bdane wskazują\b/gi, /\bstudies show\b/gi, /\bexperts say\b/gi, /\baccording to data\b/gi];
const SOURCES = [/\bwedług\b/gi, /\bźródło:\b/gi, /https?:\/\/\S+/gi, /\bdoi:\S+/gi, /\baccording to\b/gi, /\[\d+\]/g, /\(20[12]\d\)/g, /\bdokumentacja\b/gi, /\bwhitepaper\b/gi];
const SIMP = [/\bpo prostu\b/gi, /\bto oczywiste\b/gi, /\bkażdy wie\b/gi, /\bjust\b/gi, /\bobviously\b/gi, /\beveryone knows\b/gi];
const MAGIC = [/\bautomagicznie\b/gi, /\bsam[ao] się\b/gi, /\bbez wysiłku\b/gi, /\bmagically\b/gi, /\bautomagically\b/gi, /\bwithout effort\b/gi, /\bpo prostu działa\b/gi, /\bjust works\b/gi];
const VAGUE = [/\bcoś tam\b/gi, /\bjakoś\b/gi, /\bgdzieś\b/gi, /\bsomehow\b/gi, /\bsomewhere\b/gi];
const POL = [/\bidioci\b/gi, /\bwrogowie\b/gi, /\bkłamcy\b/gi, /\bidiots\b/gi, /\benemies\b/gi, /\bliars\b/gi];
const DEM = [/\bzawsze kłamią\b/gi, /\bnigdy nie mówią prawdy\b/gi, /\balways lie\b/gi];
const DUAL = [/\bz perspektywy\b/gi, /\bz jednej strony\b/gi, /\bz drugiej\b/gi, /\bhowever\b/gi];
const JUMP = [/\bwięc oczywiście\b/gi, /\bkażdy wie że\b/gi, /\bthus obviously\b/gi, /\beveryone knows that\b/gi];
const CIRC = [/\bbo tak\b/gi, /\bbecause it is\b/gi];
const INT = [/\bbo jest głupi\b/gi, /\bbecause he's stupid\b/gi, /\bz natury\b/gi, /\binnately\b/gi, /\bwrodzony\b/gi];
const EXT = [/\bniezależnie od okoliczności\b/gi, /\bregardless of circumstances\b/gi];

const sev = (n: number, hi: number, mid: number): FilterSeverity =>
  n >= hi ? 'HIGH' : n >= mid ? 'MEDIUM' : 'LOW';

const FILTERS = [
  (t: string): FilterResult => {
    const ac = count(t, ABS), alt = count(t, ALT);
    const score = Math.max(10, 90 - ac * 15 + alt * 8);
    return make('Kontrargument', score >= 40 && ac < 3, score, 0.9,
      ac > 0 ? [`Absolutnych stwierdzeń: ${ac}`] : [],
      ac > 0 ? ['Dodaj alternatywne perspektywy'] : [],
      ac > 0 ? ['OVERCONFIDENT'] : [], sev(ac, 3, 1), { absolute: ac, alternatives: alt });
  },
  (t: string): FilterResult => {
    const cl = count(t, CLAIMS), sr = count(t, SOURCES);
    const ratio = cl > 0 ? sr / cl : 1;
    const score = cl === 0 ? 90 : Math.max(20, Math.floor(ratio * 80));
    const sevLvl: FilterSeverity = cl >= 2 && sr === 0 ? 'HIGH' : cl >= 1 && sr === 0 ? 'MEDIUM' : 'LOW';
    return make('Weryfikacja', score >= 40, score, 0.85,
      cl > 0 && sr === 0 ? [`Twierdzenia bez źródeł: ${cl}`] : [],
      cl > 0 && sr === 0 ? ['Podaj źródła'] : [],
      cl > 0 && sr === 0 ? ['UNSOURCED_CLAIM'] : [], sevLvl, { claims: cl, sources: sr });
  },
  (t: string): FilterResult => {
    const sc = count(t, SIMP);
    const score = Math.max(15, 90 - sc * 10);
    return make('Kontekst', score >= 40, score, 0.8,
      sc > 0 ? [`Uproszczenia: ${sc}`] : [],
      sc > 0 ? ['Uwzględnij pełen kontekst'] : [],
      sc > 0 ? ['CONTEXT_DRIFT'] : [], sc >= 2 ? 'MEDIUM' : 'LOW', { simplifications: sc });
  },
  (t: string): FilterResult => {
    const mg = count(t, MAGIC), vg = count(t, VAGUE);
    const score = Math.max(10, 85 - mg * 20 - vg * 8);
    return make('Anti-magic', score >= 40, score, 0.88,
      mg > 0 ? [`Magiczne myślenie: ${mg}`] : [],
      mg > 0 ? ['Opisz konkretny mechanizm'] : [],
      mg > 0 ? ['WISHFUL_THINKING'] : [], sev(mg, 2, 1), { magic: mg, vague: vg });
  },
  (t: string): FilterResult => {
    const pc = count(t, POL), dc = count(t, DEM), du = count(t, DUAL);
    const score = Math.max(15, 85 - pc * 15 - dc * 20 + du * 8);
    const sevLvl: FilterSeverity = dc > 0 ? 'HIGH' : pc >= 2 ? 'MEDIUM' : 'LOW';
    return make('Dwuperspektywa', score >= 40, score, 0.82,
      pc > 0 ? [`Polaryzacja: ${pc}`] : [],
      pc > 0 ? ['Uwzględnij perspektywę drugiej strony'] : [],
      pc > 0 ? ['POLARIZATION'] : [], sevLvl, { polarization: pc, demonization: dc, dual: du });
  },
  (t: string): FilterResult => {
    const jc = count(t, JUMP), cc = count(t, CIRC);
    const score = Math.max(20, 85 - jc * 10 - cc * 15);
    return make('Backtrack', true, score, 0.6,
      jc > 0 ? [`Skoki logiczne: ${jc}`] : [],
      jc > 0 ? ['Wyjaśnij krok po kroku'] : [],
      jc > 0 ? ['LOGICAL_JUMP'] : [], 'INFO', { jumps: jc, circular: cc });
  },
  (t: string): FilterResult => {
    const ic = count(t, INT), ec = count(t, EXT);
    const score = Math.max(20, 85 - ic * 15 - ec * 20);
    return make('Atrybucja', score >= 40, score, 0.78,
      ic > 0 ? [`Błąd atrybucji: ${ic}`] : [],
      ic > 0 ? ['Uwzględnij czynniki zewnętrzne'] : [],
      ic > 0 ? ['ATTRIBUTION_ERROR'] : [], sev(ic, 2, 1), { internal: ic, ext_ignore: ec });
  },
];

export class FiltrTonoyana {
  analyze(text: string): FilterReport {
    const results = FILTERS.map((f) => f(text));
    const blocked_by = results.filter((r) => !r.passed).map((r) => r.filter_name);
    const overall_score = Math.floor(results.reduce((a, r) => a + r.score, 0) / results.length);
    const passed = blocked_by.length === 0;
    const decision: FilterDecisionLevel = passed ? 'PASS' : overall_score >= 50 ? 'WARN' : 'BLOCK';
    return { text: text.slice(0, 200), passed, overall_score, decision, results, blocked_by };
  }
}
