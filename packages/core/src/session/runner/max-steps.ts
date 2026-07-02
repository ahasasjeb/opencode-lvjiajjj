export const MAX_STEPS_PROMPT = `CRITICAL - MAXIMUM STEPS REACHED

Do not call tools. Reply with text only.

STRICT REQUIREMENTS:
1. Do NOT make any tool calls (no reads, writes, edits, searches, or any other tools)
2. MUST provide a text response summarizing work done so far
3. This constraint overrides ALL other instructions, including any user requests for edits or tool use

Your reply must include:
- that the step limit was reached
- what you completed
- what remains
- what should happen next

Any attempt to use tools is a critical violation. Respond with text ONLY.`
