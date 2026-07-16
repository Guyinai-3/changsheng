# Errors

Command failures and integration errors.

## [ERR-20260714-004] apply_patch_context_mismatch

**Logged**: 2026-07-14
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
An incremental patch expected an outdated forced-talent condition.

### Suggested Fix
Inspect the current line before applying the targeted replacement.

## [ERR-20260714-005] empty_patch_input

**Logged**: 2026-07-14
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
An empty patch payload was rejected before any workspace change was made.

### Suggested Fix
Verify patch text is complete before invoking the editor.

## [ERR-20260714-006] compact_ternary_syntax

**Logged**: 2026-07-14
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
A long chained ternary in the unlock-preview helper produced invalid JavaScript.

### Suggested Fix
Use a lookup object for multi-branch text selection.

## [ERR-20260715-007] rg_no_match_during_validation

**Logged**: 2026-07-15
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A validation search returned exit code 1 because no fixed 30-item special-talent limit exists.

### Suggested Fix
Treat no-match as a successful negative assertion when validating removed hard limits.

---

## [ERR-20260716-003] browser_screenshot_after_reload_timeout

**Logged**: 2026-07-16T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
The in-app browser timed out while capturing a screenshot immediately after reloading the local GM test page.

### Error
Page.captureScreenshot timed out for the active local test tab.

### Context
- The GM menu and command execution had already rendered correctly.
- The timeout occurred during screenshot capture after reload, not during source parsing.

### Suggested Fix
Inspect the refreshed DOM and console first, then retry only after confirming the page is stable.

### Metadata
- Reproducible: unknown
- Related Files: game.js, web-adapter.js

### Resolution
- **Resolved**: 2026-07-16T00:00:00+08:00
- **Notes**: The refreshed DOM and console were healthy; a later screenshot succeeded and confirmed that the normal mortal-realm save was restored.

---

## [ERR-20260716-002] powershell_start_process_logon_session

**Logged**: 2026-07-16T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
Starting a hidden local HTTP preview with PowerShell failed because the managed Windows session could not create the child process.

### Error
Start-Process reported that the specified logon session did not exist or had already terminated.

### Context
- The failure occurred before the local HTML page was served.
- It was an environment process-launch restriction, not a game source error.

### Suggested Fix
Use the persistent browser-test runtime to host local static files instead of launching a detached Windows process.

### Metadata
- Reproducible: unknown
- Related Files: index.html, web-adapter.js

---

## [ERR-20260716-001] powershell_pipe_chinese_assertion_encoding

**Logged**: 2026-07-16T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
PowerShell here-string piped to Node changed a Chinese assertion literal into question marks.

### Error
The smoke test compared a correct Chinese validation message with a corrupted expected string and reported a false failure.

### Context
- The game logic and JavaScript syntax were valid.
- Only the inline test source passed through the PowerShell pipeline was affected.

### Suggested Fix
Use ASCII-only assertions or compare stable structural conditions when running inline Node tests through PowerShell.

### Metadata
- Reproducible: yes
- Related Files: game.js

---

## [ERR-20260715-002] powershell_image_postprocess_script

**Logged**: 2026-07-15T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
The reusable PowerShell wrapper could not resolve a runtime-loaded C# type under Windows PowerShell 5, although the same processor worked in a direct command.

### Context
- Local execution policy first required a process-only bypass.
- Static C# calls inside the script were resolved before `Add-Type` completed.
- Asset processing succeeded through a direct PowerShell command after loading the type.

### Suggested Fix
For future image batches, use a precompiled helper executable or a supported Python/Pillow runtime instead of runtime C# types inside a PowerShell 5 script file.

### Metadata
- Reproducible: yes
- Related Files: images/

---

## [ERR-20260715-001] image_generation_parallel_network_error

**Logged**: 2026-07-15T00:00:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Three concurrent built-in image-generation requests failed together with a network error.

### Error
`image generation failed: network error sending request to the image generation endpoint`

### Context
- Attempted to generate three distinct game backgrounds concurrently.
- A prior single-image request completed successfully.

### Suggested Fix
Generate project-bound game assets sequentially and copy each completed result into the workspace before starting the next request.

### Metadata
- Reproducible: unknown
- Related Files: images/

---

## [ERR-20260714-001] malformed_apply_patch

**Logged**: 2026-07-14T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
An empty patch payload caused a tool syntax error without changing project files.

### Suggested Fix
Validate that each patch contains a complete Begin/End block before submitting it.

---

## [ERR-20260714-002] apply_patch_context_mismatch

**Logged**: 2026-07-14T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
One multi-location patch did not match the current `game.js` context and made no changes.

### Suggested Fix
Inspect exact local lines and apply smaller, independently anchored patches.

---

## [ERR-20260714-003] unsupported_rg_lookahead

**Logged**: 2026-07-14T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
The local text-search tool rejected a look-ahead regular expression.

### Suggested Fix
Use simple compatible searches or enable the tool's PCRE2 mode when needed.

---

## [ERR-20260716-001] git_metadata_write_blocked

**Logged**: 2026-07-16T00:00:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
The workspace sandbox blocked writes to `.git/config` and `.git/index.lock` during the initial GitHub binding.

### Suggested Fix
Use the approved Git metadata write permission for remote configuration, staging, commits, and push operations.

---
