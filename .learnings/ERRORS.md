# Errors

Command failures and integration errors.

---

## [ERR-20260709-001] powershell-json-validation

**Logged**: 2026-07-09T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
Windows PowerShell misread a UTF-8 JSON file containing Chinese text as the system encoding.

### Error
```
ConvertFrom-Json reported an invalid object after Chinese text was decoded incorrectly.
```

### Context
- Validation used `Get-Content` without an explicit encoding.
- The generated JSON file was UTF-8 without BOM.

### Suggested Fix
Use `Get-Content -Encoding UTF8` when validating UTF-8 project files in Windows PowerShell.

### Metadata
- Reproducible: yes
- Related Files: sitemap.json

### Resolution
- **Resolved**: 2026-07-09T00:00:00+08:00
- **Notes**: Re-run validation with explicit UTF-8 decoding.

---
