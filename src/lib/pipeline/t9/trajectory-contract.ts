export class TrajectoryContract {
  private static PREAMBLE = `[ALFA T9 TRAJECTORY CONTRACT]
The following response MUST:
1. Stay within the scope of the user's original intent.
2. Avoid pontification, speculation, and ungrounded claims.
3. Distinguish between "I know" (verified) and "I predict" (inferred).
4. Flag uncertainty explicitly.
5. NEVER drift into unrelated topics.
---`;

  injectContract(prompt: string): string {
    return `${TrajectoryContract.PREAMBLE}\n\n${prompt}`;
  }
}
