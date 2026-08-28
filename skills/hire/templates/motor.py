#!/usr/bin/env python3
"""{{Name}} — standing motor. Hired {{date}} via /hire.

WRITTEN DISABLED. This runs nothing until someone reads it, fills in the body, and
registers the schedule deliberately. A motor that starts running the moment it is
generated is a motor nobody has read.

Cadence declared at hire: {{cadenceDetail}}
Inputs:  {{inputs}}
Outputs: {{outputs}}
Never:   {{nevers}}
"""

ENABLED = False  # flip only after the body below actually does the job


def run() -> int:
    if not ENABLED:
        print("{{name}}: motor is disabled — fill in run() and set ENABLED = True")
        return 0
    raise NotImplementedError("{{name}} motor body not written yet")


if __name__ == "__main__":
    raise SystemExit(run())
