# NCS Language Support 0.7

Install: extract the ZIP, close VS Code, then run `bash ncs-vscode-language/install.sh` from the extraction directory. The installer backs up previous NCS extensions and preserves existing custom icon files and manifest icon assignments, including `.ncs.compile` where registered. It does not change Linux MIME icons. Reopen VS Code and run **NCS: Enable Dark 2026 Support** (`Ctrl+Shift+P`). This selects VS Code's built-in Dark 2026 theme and enables the NCS semantic palette with language-specific color rules. It preserves existing color rules for other languages. The extension also contributes Dark 2026 NCS-only defaults; the command repairs conflicting user settings explicitly. Workspace-level overrides or competing extensions can still take precedence. For a different theme run **NCS: Apply NCS Colors** and choose **Keep current theme and apply NCS colors**; the standalone NCS Dark v0.6 theme remains optional. The command writes NCS-specific settings into the active VS Code profile's user settings, not into project source. It enables NCS semantic highlighting, disables rainbow brackets, and turns off minimap section headers only for NCS. Colors use semantic tokens and scoped TextMate fallback rules, not whole-document decorations. Only color values retain swatch decorations. Actual editor/minimap rendering depends on VS Code. For troubleshooting, click the NCS v0.7 status bar.

## v0.7 comment fix

Inline `!{...}` comments stop at their closing brace, including when ordinary prose contains contractions such as `Don’t` or `Don't`. Complete quoted spans may contain braces. Endline `!<--` comments still extend to the end of the line; triple-quote documentation is unchanged. Highlighting, the fallback grammar, source diagnostics and editor context share the comment boundary rule. The compiler is unchanged.

## New language support

* Blue node declarations and user calls, lime signatures, white references, reddish-orange system calls/modes, purple f-strings and `in`, `range`, `continue`, `break`; yellow operators and brackets, gray node delimiters, green regular comments, orange docs and strings. Numbers use muted green; booleans purple. Dotted callable names color only their last part as a call; parents are white.
* Hierarchical Outline using true `DocumentSymbol.children` and number/string/object icons; deepest exact qualified-path hover, local Go to Definition, basic Find References, completion and signature help. This is still source-local, not a full language server. Hover descendants of locked nodes displays a bold locked warning.
* Live source checks for your malformed math and integer-input examples plus previous diagnostics. Source checking is conservative and not a substitute for the compiler.

## Editor-only planned media signatures

The following are proposed **preview syntax**, not yet runtime signatures. Color uses hex RGB or RGBA (alpha 00 transparent, FF opaque); grayscale/luminance can be derived from RGB, so it needn't be a separate channel. Color values show their actual swatch and editable color picker. Numeric matrices use a literal list of lists; 3D matrix rendering is deferred.

```
<tint>"#FF660080"</color>
<photo>"assets/photo.png"</image(png)>
<moving>"assets/animation.gif"</image(gif)>
<track>"assets/voice.wav"</sound(wav)>
<clip>"assets/clip.mp4"</image|sound(mp4)>
<position>[10|20|30]</vector>
<grid>[[1|2]|[3|4]]</matrix>
<volume>[[[1|2]|[3|4]]|[[5|6]|[7|8]]]</matrix3d>
```

Place the cursor inside the node and run **NCS: Preview Media or Matrix** from the Command Palette or editor context menu. A compact side preview shows the picture/animation/video/audio or rectangular table. Audio waveform is live while playing; video without `|sound` is muted. Browser codec availability limits supported files. Files are local to the workspace or source folder; no remote content is fetched. Media paths are resolved relative to the source file. No media is embedded or executed by the compiler yet. Future compiler implementation should preserve source format and support embedded assets, rather than making import directives necessary. Direct inline thumbnail playback and 3D render are not included.

Modular catalog: add JSON definitions in `.ncs/nodes/` as before. Built-in modules describe import/from/use and new planned signatures. No JavaScript is run from node catalog files. Stage 5 compiler module support is limited to bootstrap. Tests: `npm test`; actual UI/preview codecs require VS Code.

## v0.8 / Stage 6

Matrix signatures `matrix(x,y)`, immutable suffix `&immut`, matrix queries and modification, and tagged log hover support. The custom-mode snippet creates required schema fields. The catalog can load data-only `test` / `info` metadata from top-level `</node>` declarations in direct workspace imports/from, `.ncs/nodes/*.ncs`, or `${XDG_DATA_HOME:-$HOME/.local/share}/ncs/nodes/*.ncs`. No custom code is executed. Custom handler execution is not yet implemented by the compiler. Existing Dark 2026 support and icon-preserving installation are unchanged. Reload after global catalog updates.

## v0.9 / Stage 6 revision

- Structural error diagnostics for missing and malformed closers (including match), nameless nodes and unclosed blocks; yellow warnings for unsigned data nodes.
- `$name` is unique; `$signature` enforces the type rather than freezing the data. `&immut` stores immutable data.
- Math diagnostics enforce one quoted string or f-string, including matrix math.
- `Globus/` in the workspace root, or the `NCS_GLOBUS` environment variable, is included in catalog discovery.
- Same-file static previews (`ncs.previews.inline`, enabled by default): compact matrix row summary/hover, still-image thumbnail attachment, and PCM WAV peak waveform. No text in the source is changed. Live/audio/video and larger previews continue to use NCS: Preview Media or Matrix. VS Code does not offer a general arbitrary inline webview in its normal text editor. Native rendering of attachment sizes is unverified.
- Existing Dark 2026 colors and icon-preserving installer remain intact.

Run `node test-stage6-revision.js` for the new source-level diagnostics and preview-data regressions; tests do not launch VS Code.

## v0.10 / Stage 6 structural and type diagnostics

* Undefined bare scalar values are no longer silently accepted as arbitrary references; valid declared references, parameters, loop bindings and known imports remain accepted.
* Unquoted string literals, int32 range errors, list type/position checks (one-based diagnostics), ordinary length mismatches (warning), forced excess capacity (error), and dictionary child shape/restrictions are checked.
* Stray text, mismatched brackets, missing terminators, invalid branch syntax and incorrect match counts are flagged. Missing signatures remain warnings.
* Canonical match form is `|case|(value):` / `|case|_:`; use bare `pass`. The `<` menu includes Elif, Else, Case and Default case, and a leading `|` also offers the latter two. `is`, `or`, `not`, `as`, and `pass` use purple syntax tokens; this is highlighting, not a new compiler implementation of Boolean operators.
* `samples/diagnostics-stress.ncs` intentionally produces seven errors and one warning. Open it to inspect the Problems panel. Run the pure JavaScript tests with `for t in test-*.js; do node "$t"; done`.

This is source analysis, not complete cross-module type inference; runtime values, custom modes, imported symbols and complex function flows still require the compiler/runtime. Existing protection checks intentionally highlight deliberately invalid code inside try/catch blocks.
