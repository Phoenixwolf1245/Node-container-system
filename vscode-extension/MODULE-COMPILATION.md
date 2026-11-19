# NCS native module compilation — Stage 4 design preparation

This is the intended module behavior, not an implemented import/export system. It applies to compiler2 and compiler3 equally regardless of which host runs the compiler.

## Import

Build the entire source library as a separate native library for the requested final output platform. Retain its signed definitions. Link an already compiled compatible library rather than rebuilding it. Loading a library is distinct from invoking its root execution stack; a reference to an exported definition does not require unrelated top-level code to execute. Native code needs an export ABI and an initialization convention before this works reliably. Avoid initializing the same library repeatedly; track dependency identity and detect cycles.

| Final output | Dependency artifact |
| --- | --- |
| Linux .so | .so |
| Linux ELF executable | .so |
| Windows .dll | .dll |
| Windows .exe | .dll |

The target, not the compiler host or host OS, chooses this format. Existing native libraries must match platform, architecture and NCS export ABI. Wine can execute Windows libraries; it does not convert ELF into PE or replace a cross-linker.

## From

Take the selected named node/definition and its transitive dependencies from another source file. Resolve and compile those into the current output; do not produce an additional library solely for this directive. Keep qualified names and resolve conflicts explicitly. Do not blindly text-copy a node that references other definitions. Forced signatures and definition preservation rules still apply.

## Use

Intended to bind or alias a selected available function or node. The exact grammar and whether this directive alone loads a file or only binds a previously imported symbol remains open. It should not silently invoke root execution.

## Editor templates

The three templates in `nodes/` are drafts, modeled on the previously proposed pipe-delimited use/from style. They are not accepted compiler syntax yet. The separate compiler-preparation patch reports an explicit error for these draft directives rather than attempting to compile them as ordinary nodes. No new dependency artifacts are created by that patch.

## Remaining requirements

1. Confirm exact syntax for import, use, from (file paths, selections, aliases).
2. Establish exported function and node ABI, supported data types, ownership and initialization; `ncs_run()` alone is not sufficient for individual node access.
3. Implement source dependency resolution, native build scheduling, incremental reuse, cycle errors and correct runtime library search paths.
4. Test compiled targets under Linux and Wine; verify `from` creates no extra library, and `import` avoids running unrelated roots.
