![NCS logo](vscode-extension/icons/ncs-extension.png)

# NCS Visual Studio Code Helper

The official core development extension for the **Node Container System (NCS)**.

NCS is a node-based programming language designed around named data containers, typed signatures, stack-based execution, compilation and interpretation. The NCS Visual Studio Code Helper provides the editor integration intended for programming in NCS, including language-aware highlighting, diagnostics, navigation, completion and data previews.

The extension is the recommended core tool for developing NCS programs in Visual Studio Code. It is not the NCS compiler, interpreter or runtime and does not replace compiler validation. Other editors may be used to write NCS source files.

## Features

- NCS-specific semantic highlighting and TextMate fallback grammar.
- Dark 2026 integration and optional standalone NCS Dark theme.
- Hierarchical node outline, qualified-path hover, local definition and reference navigation, completion and signature help.
- Live structural and type diagnostics, including protected-node warnings and tagged log hover.
- Modular node catalog discovery and custom-mode snippets.
- Color pickers, matrix summaries and local media previews, including experimental syntax.
- Icon-preserving installation and NCS-specific editor settings.

## Installation

1. Extract the extension ZIP and close Visual Studio Code.
2. From the extraction directory, run:

   ```bash
   bash ncs-vscode-language/install.sh
   ```

3. Reopen VS Code and open the Command Palette (`Ctrl+Shift+P`).
4. Run **NCS: Enable Dark 2026 Support**.

The installer backs up previous NCS extensions and preserves custom icons and manifest icon assignments, including `.ncs.compile` where registered. It does not change Linux MIME icons.

## Editor configuration

The Dark 2026 command selects VS Code's built-in Dark 2026 theme and enables the NCS semantic palette. To retain another theme, run **NCS: Apply NCS Colors** and select **Keep current theme and apply NCS colors**. NCS Dark v0.6 remains optional.

The commands update NCS-specific user settings in the active VS Code profile, not project source. They preserve other languages' color rules, enable semantic highlighting, disable rainbow brackets and turn off minimap section headers for NCS. Workspace overrides and competing extensions may take precedence. Highlighting uses semantic tokens and scoped TextMate rules; only color values retain swatch decorations. Actual editor and minimap rendering depends on VS Code. Click the NCS status bar for troubleshooting.

### Color palette

| Element | Color |
|---|---|
| Node declarations and user calls | Blue |
| Signatures | Lime |
| References | White |
| System calls and modes | Reddish-orange |
| F-strings, control keywords and booleans | Purple |
| Operators and brackets | Yellow |
| Node delimiters | Gray |
| Regular comments | Green |
| Documentation and strings | Orange |
| Numbers | Muted green |

Dotted callable names highlight only the final callable component as a call; parent components remain white.

## Media and matrix previews

Place the cursor inside a node and run **NCS: Preview Media or Matrix** from the Command Palette or editor context menu.

The following examples include proposed editor-preview syntax. Runtime support varies; editor recognition does not imply compiler support.

```ncs
<tint>"#FF660080"</color>
<photo>"assets/photo.png"</image(png)>
<moving>"assets/animation.gif"</image(gif)>
<track>"assets/voice.wav"</sound(wav)>
<clip>"assets/clip.mp4"</image|sound(mp4)>
<position>[10|20|30]</vector>
<grid>[[1|2]|[3|4]]</matrix>
<volume>[[[1|2]|[3|4]]|[[5|6]|[7|8]]]</matrix3d>
```

Colors support RGB/RGBA hex values with alpha `00` transparent and `FF` opaque. Grayscale can be derived from RGB. Numeric matrices use nested lists. The side preview supports images, animations, audio, video and rectangular tables, subject to browser codec availability. Audio waveforms are live during playback; video without `|sound` is muted. Media is resolved relative to the source file, restricted to local workspace/source-folder files, and no remote content is fetched. Inline static previews are enabled by default via `ncs.previews.inline`; they provide matrix summaries, still-image attachments and PCM WAV peak waveforms without modifying source text. Arbitrary inline webviews, direct inline playback and 3D rendering are not included. Native attachment sizing remains unverified. Media embedding and execution by the compiler are not established by these previews.

## Modular node catalog

The extension can discover data-only catalog definitions from:

- `.ncs/nodes/*.json` and `.ncs/nodes/*.ncs`
- Direct workspace imports/from containing top-level `</node>` declarations
- `${XDG_DATA_HOME:-$HOME/.local/share}/ncs/nodes/*.ncs`
- Workspace `Globus/` and the location specified by `NCS_GLOBUS`

Catalog metadata supports `test` and `info` fields. The custom-mode snippet generates required schema fields. No JavaScript or custom handler code is executed by the catalog. Reload VS Code after global catalog updates. Compiler support for custom handlers remains separate.

## Version history

### v0.10 — Stage 6 structural and type diagnostics

- Checks undefined bare scalar references, unquoted strings, int32 range errors, list types and positions (one-based), ordinary length mismatches (warning), forced excess capacity (error) and dictionary child restrictions.
- Reports stray text, mismatched brackets, missing terminators, invalid branches and incorrect match counts. Missing signatures remain warnings.
- Canonical match syntax: `|case|(value):` and `|case|_:`; use bare `pass`. Completion offers Elif, Else, Case and Default case after `<`, and case variants after `|`.
- `is`, `or`, `not`, `as` and `pass` receive purple highlighting; this does not implement new compiler Boolean operators.
- `samples/diagnostics-stress.ncs` intentionally contains seven errors and one warning.

### v0.9 — Stage 6 revision

- Structural diagnostics for missing/malformed closers, nameless nodes and unclosed blocks; unsigned data nodes produce warnings.
- `$name` is unique; `$signature` enforces the type, while `&immut` stores immutable data.
- Math diagnostics require one quoted string or f-string, including matrix math.
- Added Globus catalog discovery and inline static previews.

### v0.8 — Stage 6

- Matrix signatures `matrix(x,y)`, `&immut`, matrix queries and modifications, and tagged log hover.
- Custom-mode snippets and data-only catalog metadata discovery.
- Dark 2026 integration and icon-preserving installation retained.

### v0.7 — Comment handling and editor support

- Inline `!{...}` comments end at the closing brace, including prose contractions; complete quoted spans may contain braces.
- Endline `!<--` comments extend to the end of the line; triple-quote documentation is unchanged.
- Highlighting, fallback grammar, diagnostics and editor context share comment boundaries.
- Hierarchical outline, qualified-path hover, local navigation, completion, signature help and conservative math/input diagnostics.
- Experimental media and matrix previews and modular catalogs. Stage 5 compiler module support was limited to bootstrap.

## Testing and limitations

```bash
npm test
node test-stage6-revision.js
for t in test-*.js; do node "$t"; done
```

The JavaScript tests cover source-level diagnostics and preview data, but do not launch VS Code. Actual rendering and media codecs require VS Code testing. Source analysis is not a full language server or complete cross-module type inference. Runtime values, imported symbols, custom modes and complex function flows still require compiler/runtime validation. Protection diagnostics can intentionally highlight invalid code inside try/catch blocks.

## License

The NCS Visual Studio Code Helper is open-source software licensed under the [MIT License](LICENSE.md).

The MIT License applies to this extension and its associated documentation only. The NCS language implementation, compiler, interpreter, logger and runtime are separate proprietary software and are not licensed under the extension's MIT License.

Copyright (c) 2026 Phoenixwolf1245 and NCS contributors.
