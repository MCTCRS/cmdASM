// ==============================
// Monaco Editor Initialization
// ==============================
require.config({
    paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs"
    }
});

require(["vs/editor/editor.main"], function () {
    

    // ------------------------------
    // Language: cmdASM
    // ------------------------------
    monaco.languages.register({ id: "cmdASM" });

    monaco.languages.setMonarchTokensProvider("cmdASM", {
        tokenizer: {
            root: [
                [/#.*/, "comment"],
                [/\.(ret|call|eval|head|sleep|jump)/, "keyword"],
                [/@\w+/, "variable.predefined"],
                [/\d+/, "number"],
                [/".*?"/, "string"],
            ],
        },
    });

    // ------------------------------
    // Autocomplete Provider
    // ------------------------------
    monaco.languages.registerCompletionItemProvider("cmdASM", {
        triggerCharacters: [".", "@", " "],
        provideCompletionItems: (model, position) => {
            const lineText = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            // Collect all labels (@label) in file
            const getLabels = () => {
                const text = model.getValue();
                const matches = [...text.matchAll(/@(\w+)/g)];
                return [...new Set(matches.map((m) => m[1]))];
            };

            const labels = getLabels();

            // Jump/call autocomplete
            if (/@$/.test(lineText) || /\.jump\s+\S*$/.test(lineText) || /\.call\s+\S*$/.test(lineText)) {
                return {
                    suggestions: labels.map((label) => ({
                        label,
                        kind: monaco.languages.CompletionItemKind.Variable,
                        insertText: label,
                        documentation: "Jump label",
                    })),
                };
            }

            // .head autocomplete
            if (/\.head\s*$/.test(lineText)) {
                return {
                    suggestions: [
                        { label: "SB_OBJ <string>", insertText: "SB_OBJ ${1:objectiveName}", documentation: "Scoreboard objective" },
                        { label: "SB_PREFIX <string>", insertText: "SB_PREFIX ${1:prefix}", documentation: "Scoreboard name prefix" },
                        { label: "SB_SUFFIX <string>", insertText: "SB_SUFFIX ${1:suffix}", documentation: "Scoreboard name suffix" },
                        { label: "ENTITY <UUID>/RANDOM", insertText: "ENTITY ${1:uuid}", documentation: "Entity by UUID" },
                        { label: "EVAL_ENTITY <UUID>/RANDOM", insertText: "EVAL_ENTITY ${1:uuid}", documentation: "Entity UUID for eval" },
                        { label: "STORAGE <namespace>", insertText: "STORAGE ${1:namespace}", documentation: "Storage namespace" },
                        { label: "STORAGE_PATH <path>", insertText: "STORAGE_PATH ${1:path}", documentation: "Storage path" },
                    ].map((s) => ({
                        ...s,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    })),
                };
            }

            // Default autocomplete
            return {
                suggestions: [
                    { label: ".head <head>", insertText: "head ", documentation: "Set a header" },
                    { label: ".ret", insertText: "ret", documentation: "Return to last call stack" },
                    { label: ".eval <jsonString>", insertText: "eval ", documentation: "Eval and run jsonString" },
                    { label: ".sleep <ticks>", insertText: "sleep ${1:20}", documentation: "Pause execution" },
                    { label: ".jump <label> [condition]", insertText: "jump ${1:label}", documentation: "Jump to a label" },
                    { label: ".call <label>", insertText: "call ${1:label}", documentation: "Call a label" },
                    { label: "@<label>", insertText: "@${1:label}", documentation: "Define a label" },
                ].map((s) => ({
                    ...s,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                })),
            };
        },
    });


    // add SHIFT+CLICK navigation (Go to Definition)
    monaco.languages.registerDefinitionProvider('cmdASM', {
        provideDefinition: function (model, position) {
            let wordInfo = model.getWordAtPosition(position);
            if (!wordInfo) return null;

            const word = wordInfo.word;
            const lines = model.getValue();
            const labelRegex = /^\s*@([^\s]+)\s*$/gm;

            // Find all labels and their line numbers
            let match;
            while ((match = labelRegex.exec(lines)) !== null) {
                const labelName = match[1];
                if (labelName === word) {
                    // Calculate line and column of the match
                    const startOffset = match.index;
                    const beforeMatch = lines.slice(0, startOffset);
                    const lineNumber = (beforeMatch.match(/\n/g)?.length || 0) + 2;
                    const columnStart = match[0].search(/@[^\s]+/); // +1 because Monaco is 1-indexed
                    const columnEnd = columnStart + labelName.length + 1; // include the @

                    return {
                        uri: model.uri,
                        range: new monaco.Range(lineNumber, columnStart, lineNumber, columnEnd)
                    };
                }
            }

            return null;
        }
    });



    // ------------------------------
    // Create Editor
    // ------------------------------
    const editor = monaco.editor.create(document.getElementById("container"), {
        value: `# CMD ASM 
#Execute commands with structured control flow using only 20 command blocks. Supports jumps, calls, sleeps, and JSON evaluation.

#Disclaimer: This system is very performance-heavy. Use with caution on large command sequences or multiplayer servers.
# tested on 1.21.4

#SCOREBOARD 
.head SB_OBJ objectiveName 
#.head SB_PREFIX prefix 
#.head SB_SUFFIX suffix 

#STORAGE
.head STORAGE namespace 
#.head STORAGE_PATH path

#ENTITIES
.head ENTITY RANDOM
#.head EVAL_ENTITY RANDOM 

@start 
say Hello World`,
        language: "cmdASM",
        theme: "vs-dark",
        fontSize: 14,
    });

        editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyZ, function() {
        const current = editor.getOption(monaco.editor.EditorOption.wordWrap);
        editor.updateOptions({ wordWrap: current === 'off' ? 'on' : 'off' });
    });



    function validateCmdASM(model) {
        const text = model.getValue();
        const markers = [];

        // Collect all labels
        const labels = new Set([...text.matchAll(/@(\w+)/g)].map(m => m[1]));

        // Split lines for easier handling
        const lines = text.split(/\r?\n/);

        const definedHeaders = new Set([]);

        lines.forEach((line, idx) => {
            const lineNumber = idx + 1;

            const whitespaces = line.match(/^\s*/)[0].length;
            line = line.trim();

            if (!line) return;

            const args = line.split(' ');

            if (line[0] === "@") {
                if (line.includes(" ")) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Label can not contain spaces`,
                        startLineNumber: lineNumber,
                        startColumn: 1 + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1 + whitespaces
                    })
                }
            }


            if (args[0] === '.head') {
                if (args.length === 1) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Expects 2 argument (.head <header> <value>)`,
                        startLineNumber: lineNumber,
                        startColumn: 5 + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: 6 + whitespaces
                    })
                }
                else if (!["SB_OBJ", "SB_PREFIX", "SB_SUFFIX", "ENTITY", "STORAGE", "STORAGE_PATH", "EVAL_ENTITY"].includes(args[1])) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Unknown header ["SB_OBJ", "SB_PREFIX", "SB_SUFFIX", "ENTITY", "STORAGE", "STORAGE_PATH", "EVAL_ENTITY"]`,
                        startLineNumber: lineNumber,
                        startColumn: 7 + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: 7 + args[1].length + whitespaces
                    })
                }
                else if (definedHeaders.has(args[1])) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Header '${args[1]}' is already defined`,
                        startLineNumber: lineNumber,
                        startColumn: 7 + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: 7 + args[1].length + whitespaces
                    })
                }
                else if (args.length === 2) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Expected a value (.head <header> <value>)`,
                        startLineNumber: lineNumber,
                        startColumn: line.length + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1 + whitespaces
                    })
                }
                else if (args.length > 3) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Expected only 2 argument, found ${args.length - 1} (.head <header> <value>)`,
                        startLineNumber: lineNumber,
                        startColumn: line.length + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1 + whitespaces
                    })
                }
                else {
                    definedHeaders.add(args[1]);
                }

                return;
            }



            // JUMPPPPPPPPPPPPP

            if (args[0] === '.jump') {
                if (args.length === 1) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Expected at least 1 argument (.jump <lable> [optional condition])`,
                        startLineNumber: lineNumber,
                        startColumn: 5,
                        endLineNumber: lineNumber,
                        endColumn: 6
                    });
                } else if (!labels.has(args[1])) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Could not find label '${args[1]}'`,
                        startLineNumber: lineNumber,
                        startColumn: 7 + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: 7 + args[1].length + whitespaces
                    });
                }
                return;
            }

            if (args[0] === '.call') {
                if (args.length === 1) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Expected at least 1 argument (.call <lable>)`,
                        startLineNumber: lineNumber,
                        startColumn: 5 + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: 6 + whitespaces
                    });
                } else if (!labels.has(args[1])) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Could not find label '${args[1]}'`,
                        startLineNumber: lineNumber,
                        startColumn: 7 + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: 7 + args[1].length + whitespaces
                    });
                } else if (args.length > 2) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Expected only 1 argument, found ${args.length - 1} (.call <lable>)`,
                        startLineNumber: lineNumber,
                        startColumn: line.length + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1 + whitespaces
                    })
                }
                return;
            }

            if (args[0] === '.sleep') {
                if (args.length === 1) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Expected at least 1 argument (.sleep <tick>/(command))`,
                        startLineNumber: lineNumber,
                        startColumn: 6 + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: 7 + whitespaces
                    });
                    return;
                }
                if (args[1][0] === "(") {
                    //command case
                    if (!line.endsWith(")")) {
                        markers.push({
                            severity: monaco.MarkerSeverity.Error,
                            message: `Unclosed parenthesis for command (.sleep (command))`,
                            startLineNumber: lineNumber,
                            startColumn: 8 + whitespaces,
                            endLineNumber: lineNumber,
                            endColumn: line.length + 1 + whitespaces
                        });
                        return;
                    }
                } else {
                    if (!/^-?\d+$/.test(args[1]) || args[1][0] === "-") {
                        markers.push({
                            severity: monaco.MarkerSeverity.Error,
                            message: `Tick must be positive int (.sleep <tick>)`,
                            startLineNumber: lineNumber,
                            startColumn: 8 + whitespaces,
                            endLineNumber: lineNumber,
                            endColumn: line.length + 1 + whitespaces
                        });
                        return;
                    }
                }
                return;
            }

            if (args[0] === '.eval') {
                if (args.length === 1) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Expected at least 1 argument (.eval jsonString)`,
                        startLineNumber: lineNumber,
                        startColumn: 5 + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: 6 + whitespaces
                    });
                    return;
                } else {
                    if (!(args[1].startsWith("'") && line.endsWith("'"))) {
                        markers.push({
                            severity: monaco.MarkerSeverity.Warning,
                            message: `Likely to be invalid json`,
                            startLineNumber: lineNumber,
                            startColumn: 7 + whitespaces,
                            endLineNumber: lineNumber,
                            endColumn: line.length + 1 + whitespaces
                        });
                    }
                    return;
                }
                return;
            }

            if (args[0] === '.ret') {
                if (args.length !== 1) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `Expected 0 argument (.ret)`,
                        startLineNumber: lineNumber,
                        startColumn: 6 + whitespaces,
                        endLineNumber: lineNumber,
                        endColumn: line.length + 1 + whitespaces
                    });


                    return;
                }
                return;
            }

            if (args[0][0] === '.') {
                markers.push({
                    severity: monaco.MarkerSeverity.Error,
                    message: `Unknown instruction`,
                    startLineNumber: lineNumber,
                    startColumn: 2 + whitespaces,
                    endLineNumber: lineNumber,
                    endColumn: line.length + 1 + whitespaces
                });
                return;
            }

        });

        monaco.editor.setModelMarkers(model, "cmdASM-checker", markers);
    }




    // Run once at start
    validateCmdASM(editor.getModel());



    // 3️⃣ Hook validation to model changes
    editor.onDidChangeModelContent(() => {
        validateCmdASM(editor.getModel());
    });

    // ==============================
    // File Handling (with overwrite)
    // ==============================
    let currentFileName = "untitled.casm";
    let currentFileHandle = null;

    const fileInput = document.getElementById("fileInput");
    const currentFileLabel = document.getElementById("currentFile");

    function setCurrentFileName(name) {
        currentFileName = name;
        currentFileLabel.textContent = `[ ${name} ]`;
    }
    setCurrentFileName(currentFileName);

    // File menu toggle
    const fileMenu = document.getElementById("fileMenu");
    const fileDropdown = document.getElementById("fileDropdown");
    fileMenu.addEventListener("click", () => {
        fileDropdown.style.display = fileDropdown.style.display === "block" ? "none" : "block";
    });

    // Load file (via File Picker for overwrite support)
    document.getElementById("loadFileBtn").addEventListener("click", async () => {
        fileDropdown.style.display = "none";

        // Show file picker
        [currentFileHandle] = await window.showOpenFilePicker({
            types: [{ description: "CASM Files", accept: { "text/plain": [".casm"] } }]
        });

        const file = await currentFileHandle.getFile();
        setCurrentFileName(file.name);

        const text = await file.text();
        editor.setValue(text);
    });

    // Save file (overwrites the same file)
    async function saveToFile() {
        if (currentFileHandle) {
            const writable = await currentFileHandle.createWritable();
            await writable.write(editor.getValue());
            await writable.close();
        } else {
            // Fallback for untitled files
            currentFileHandle = await window.showSaveFilePicker({
                suggestedName: currentFileName,
                types: [{ description: "CASM Files", accept: { "text/plain": [".casm"] } }]
            });
            const writable = await currentFileHandle.createWritable();
            await writable.write(editor.getValue());
            await writable.close();
            setCurrentFileName((await currentFileHandle.getFile()).name);
        }
    }

    // Save button
    document.getElementById("saveFileBtn").addEventListener("click", async () => {
        fileDropdown.style.display = "none";
        await saveToFile();
    });

    // Ctrl+S shortcut
    document.addEventListener("keydown", async (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === "s") {
            e.preventDefault();
            await saveToFile();
        }
    });


    // ==============================
    // Convert Button / Output Page
    // ==============================
    const containerEl = document.getElementById("container");
    const outputPageEl = document.getElementById("outputPage");
    const convertBtn = document.getElementById("convertBtn");
    const backBtn = document.getElementById("backBtn");
    const outputList = document.getElementById("outputList");

    convertBtn.addEventListener("click", () => {
        const text = editor.getValue();
        const commands = cmdASM.tryCompileString(text); // your compiler

        outputList.innerHTML = "";
        commands.forEach((cmd, i) => {
            const row = document.createElement("div");
            row.className = "commandRow";

            row.innerHTML = `
        <div class="commandLabel">Command ${i + 1}</div>
        <button class="commandCopyBtn">copy</button>
        <input class="commandInput" type="text" value="${cmd}" readonly>
      `;

            row.querySelector(".commandCopyBtn").addEventListener("click", () => {
                navigator.clipboard.writeText(cmd);
            });

            outputList.appendChild(row);
        });

        containerEl.classList.remove("active");
        outputPageEl.classList.add("active");
        convertBtn.style.display = "none";
        backBtn.style.display = "inline-block";
    });

    backBtn.addEventListener("click", () => {
        outputPageEl.classList.remove("active");
        containerEl.classList.add("active");
        backBtn.style.display = "none";
        convertBtn.style.display = "inline-block";
    });
});
