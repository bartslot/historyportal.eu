# Crew stream contract (server.py <-> src/crew)

POST /crew/stream  body = the /crew body + optional `partial: {who, text}` (an interrupted member's
draft, given back to that member). Response: `application/x-ndjson`, one JSON event per line, flushed
as it happens. POST /crew (one JSON answer at the end) stays for the lesson-crew MCP.

Events (every event has `turn`, the id of this turn):
- {type:"turn"}                                      first line
- {type:"assistant", as, text}                       Sofie/Daan's reply
- {type:"routed", who, ack}                          one per member asked; ack = their one-line
                                                     "on it" bubble, in their voice, client language
- {type:"start", who}                                the member's model call began
- {type:"thinking", who, text}                       thinking-summary delta (only when the model thinks)
- {type:"text", who, text}                           delta of the member's reply as it is written
- {type:"jev", who, score, choice}                   JEV grade
- {type:"review", who, text}                         Marten's second opinion (who = the member reviewed)
- {type:"message", who, text, settings?, commands?, title?, dropped?, jev?, review?}
                                                     the member's FINAL answer (same shape as /crew)
- {type:"stopped", who}                              stopped by the client; nothing of theirs applies
- {type:"error", who?, error}
- {type:"done"}                                      last line

POST /crew/stop {turn, who?} -> {stopped:[who...]}   who omitted = the whole turn. Kills that member's
claude process; its worker emits "stopped" and no "message".
Interrupt = client stops `who`, then sends a new turn with to=who and partial={who, text: draft so far}.
