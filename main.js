// Online Javascript Editor for free
// Write, Edit and Run your Javascript code using JS Online Compiler

const cmdASM = 
{

    tryCompileString: function(sourceString)
    {
        try
        {
            return this.compileString(sourceString);
        }
        catch(e)
        {
            alert(this.errorMessages(e));
        }
    },

    errorMessages: function(errData) {
        //console.log(errData);

        errData.context.origin += 1;

        const errorMessageList = {
            "missingHeader": () =>
                `[Error] Missing required header '${errData.head}'.\n  → Add it with: .head ${errData.head} ...`,

            "headerTooLarge": () =>
                `[Error] Header is too long for a command block.\n  → Try shortening the .head name.`,

            "evalMissingEntity": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .eval requires an 'EVAL_ENTITY' header.\n  → Example: .head EVAL_ENTITY <uuid>`,

            "invalidUUID": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): Invalid UUID '${errData.uuid}'.`,

            "headDuplicatedHeader": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): Header '${errData.header}' is already defined.\n  → First defined at line ${errData.with.origin}.`,

            "invalidLabelName": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): Invalid label name '${errData.label}'.\n  → Labels cannot contain spaces or special characters.`,

            "duplicateLabelName": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): Label '${errData.label}' already used.\n  → First defined at line ${errData.with.origin}.`,

            "headMissingArg": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .head expects 2 arguments (HEADER VALUE).`,

            "headUnknownHeader": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): Unknown .head argument '${errData.targetHead}'.\n  → Allowed: SB_OBJ, SB_PREFIX, SB_SUFFIX, ENTITY, STORAGE, STORAGE_PATH, EVAL_ENTITY`,

            "sleepMissingArg": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .sleep expects 1 argument but found none.\n  → Usage: .sleep <ticks|command>`,

            "sleepUnclosedParenthesis": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .sleep has an unclosed parenthesis.`,

            "sleepInvalidTypeArg": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): Invalid .sleep argument '${errData.argContext}'.\n  → Must be a number or (command).`,

            "jumpMissingArg": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .jump expects at least 1 argument but found none.\n  → Usage: .jump <label> [optional condition]`,

            "jumpUndefinedLabel": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .jump references undefined label '${errData.arg}'.`,

            "evalInvalidJson": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .eval contains invalid JSON.\n  → Offending input: ${errData.arg}`,

            "evalMissingArg": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .eval expects 1 argument but got none.\n  → Offending input: ${errData.arg}`,

            "callTooManyArg": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .call expects 1 argument but got ${errData.found}.\n  → Usage: .call <LABEL>`,

            "callMissingArg": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .call expects at least 1 argument but found none.\n  → Usage: .call <LABEL>`,

            "callUndefinedLabel": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .call references undefined label '${errData.arg}'.`,

            "RetTooManyArg": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): .ret expects no arguments but got ${errData.found}.`,

            "unknownInstruction": () =>
                `[Error] Line ${errData.context.origin} (${errData.context.line}): Unknown instruction '${errData.context.line}'.`,

            "dupedUUID": () => "[Error] UUID of ENTITY and EVAL_ENTITY cannot be the same."
        };

        const errorMessage = errorMessageList[errData.type];
        if (!errorMessage) throw errData;
            return errorMessage();
        },
        

    compileString: function(sourceString)
    {
        const sourceArray = sourceString.split('\n')
        
        //CREATE OBKECT ARRAY
        let trimmedSourceObjectArray = sourceArray.map((line, index) => {
            return {line: line.trimStart(), origin: index};
        });

        
        
        //CREATE AND ERROR TYPES
        trimmedSourceObjectArray = trimmedSourceObjectArray.map((line, index) => {
            line.type = this.getInstructionType(line.line, line);
            return line
        });

        
        //GET LABELS
        this.labelSourceObject = this.generateLabelSourceObject(trimmedSourceObjectArray);

        //console.log(this.labelSourceObject);
        //CREATE ARUGMENT
        trimmedSourceObjectArray = trimmedSourceObjectArray.map((line, index) => {
            
            return this.getInstructionArgs(line);
        });

        //GET HEADERS
        this.headerSourceObj = this.generateHeaderSourceObject(trimmedSourceObjectArray);
        this.validateHeaderObject(this.headerSourceObj);

        this.header = this.generateExtraHeader(this.generateHeaderObject(this.headerSourceObj));


        //EVAL INJECT
        if (this.header.EVAL_ENTITY) {
            trimmedSourceObjectArray.unshift({type:"command",args:{command:`summon minecraft:text_display ~ ~ ~ {UUID:[I;${this.header.EVAL_ENTITY_INTARR}]}`}});
            trimmedSourceObjectArray.push({type:"command",args:{command:`kill ${this.header.EVAL_ENTITY}`}});
        }

        //CALL INJECT TAIL
        if (trimmedSourceObjectArray.some((lineObj) => lineObj.type === 'call'))
        {
            trimmedSourceObjectArray.push(
                {type: "command", args:{command:`data remove storage ${this.header.STORAGE} ${this.header.STORAGE_PATH}.cs`}} //remove call stack
            );
        }

        //TAIL INJECT
        trimmedSourceObjectArray.push(
            {type: "command", args:{command:"setblock ~ ~1 ~ chain_command_block[facing=up]"}} // exit
        );

    


        
        //TRANSLATE MAIN add {size:} to lineObject
        trimmedSourceObjectArray = this.determineTranslateSize( trimmedSourceObjectArray );

        //TRANSLATE MAIN add {shiftedLine:} to lineObject}
        trimmedSourceObjectArray = this.determineLineShift( trimmedSourceObjectArray );

        //UPDATE LABEL OBJECTS
        this.labelSourceObject = this.generateLabelSourceObject(trimmedSourceObjectArray);

        //SIMPLIFIED LABEL
        this.label = this.generateLabelObject(this.labelSourceObject);

        //MAIN TRANSLATE
        trimmedSourceObjectArray = this.translateFunctions( trimmedSourceObjectArray );

        //FINAL SIZE CHECK
        for (const lineObj of trimmedSourceObjectArray)
        {
            if (lineObj.size !== lineObj.translated.length) throw {type:"desyncTranslateSize", context: lineObj}
        }
    

        let translatedArray = [];
        for (lineObject of trimmedSourceObjectArray) {
            translatedArray.push(...lineObject.translated)
        }

        //return trimmedSourceObjectArray;

        return this.wrapperCommand(translatedArray);
    },

    wrapperCommand: function(instr)
    {
        let maxLength = 32499;

        let header = this.header;
        let wrapper = `summon falling_block ~ ~.5 ~ {BlockState:{Name:glass},Passengers:[{id:armor_stand,Small:1,Health:0,Passengers:[{id:item,Item:{id:stone,count:1},Age:5998,Passengers:[{id:falling_block,BlockState:{Name:redstone_block},Passengers:[{id:falling_block,BlockState:{Name:"activator_rail"},Passengers:[{id:command_block_minecart,Command:"fill ~1 ~-3 ~1 ~2 ~1 ~2 air"},{id:command_block_minecart,Command:\'setblock ~1 ~-3 ~1 chain_command_block[facing=up]{auto:1,Command:"summon minecraft:block_display ~ ~ ~ {UUID:[I;${header.ENTITY_INTARR}]}"}\'},{id:command_block_minecart,Command:\'setblock ~1 ~-3 ~2 chain_command_block{auto:1,Command:"scoreboard players set $${header.SB_PREFIX}pc${header.SB_SUFFIX} ${header.SB_OBJ} -1"}\'},{id:command_block_minecart,Command:\'setblock ~1 ~-2 ~1 chain_command_block[facing=up]{auto:1,Command:"setblock ~1 ~1 ~1 minecraft:chain_command_block[facing=north]"}\'},{id:command_block_minecart,Command:\'setblock ~1 ~-2 ~2 repeating_command_block[facing=east]{Command:"execute store result block ~ ~ ~ auto byte 1 run scoreboard players remove $${header.SB_PREFIX}timer${header.SB_SUFFIX} ${header.SB_OBJ} 1"}\'},{id:command_block_minecart,Command:\'setblock ~1 ~-1 ~1 chain_command_block[facing=south]{auto:1,Command:"scoreboard players add $${header.SB_PREFIX}pc${header.SB_SUFFIX} ${header.SB_OBJ} 1",UpdateLastExecution:0b}\'},{id:command_block_minecart,Command:\'setblock ~1 ~-1 ~2 chain_command_block[facing=up]{auto:1,Command:"data modify block ~1 ~-1 ~-1 front_text.messages[0] set value \\\'[{\\\\"text\\\\":\\\\"data modify block ~ ~-1 ~ Command set from storage ${header.STORAGE} ${header.STORAGE_PATH}.rom[\\\\"},{\\\\"score\\\\":{\\\\"name\\\\":\\\\"$${header.SB_PREFIX}pc${header.SB_SUFFIX}\\\\",\\\\"objective\\\\":\\\\"${header.SB_OBJ}\\\\"}},{\\\\"text\\\\":\\\\"]\\\\"}]\\\'",UpdateLastExecution:0b}\'},{id:command_block_minecart,Command:\'setblock ~1 ~ ~1 chain_command_block[facing=east]{auto:1,Command:"/enchant ${header.ENTITY} lure",UpdateLastExecution:0b}\'},{id:command_block_minecart,Command:\'setblock ~1 ~ ~2 chain_command_block{auto:1,Command:"/data modify entity ${header.ENTITY} CustomName set from block ~1 ~-2 ~-1 front_text.messages[0]",UpdateLastExecution:0b}\'},{id:command_block_minecart,Command:\'setblock ~1 ~1 ~1 chain_command_block[facing=east]{auto:1,Command:"kill ${header.ENTITY}"}\'},{id:command_block_minecart,Command:\'setblock ~1 ~1 ~2 chain_command_block{auto:1,Command:"scoreboard objectives remove ${header.SB_OBJ}"}\'},{id:command_block_minecart,Command:\'setblock ~2 ~-3 ~1 command_block[facing=south]{Command:"scoreboard objectives add ${header.SB_OBJ} dummy"}\'},{id:command_block_minecart,Command:\'setblock ~2 ~-3 ~2 chain_command_block[facing=west]{auto:1,Command:"data modify storage ${header.STORAGE} ${header.STORAGE_PATH}.rom set from block ~ ~4 ~-1 Items[0].components.minecraft:custom_data.rom"}\'},{id:command_block_minecart,Command:"setblock ~2 ~-2 ~1 oak_wall_hanging_sign{}"},{id:command_block_minecart,Command:"setblock ~2 ~-2 ~2 chain_command_block{auto:1,Command:\'execute if score $${header.SB_PREFIX}timer${header.SB_SUFFIX} ${header.SB_OBJ} matches ..0 run setblock ~ ~ ~-1 minecraft:chain_command_block[facing=west]{auto:1b,Command:\\"setblock ~ ~ ~ minecraft:oak_wall_hanging_sign[facing=north]\\"}\'}"},{id:command_block_minecart,Command:"setblock ~2 ~-1 ~1 chain_command_block[facing=west]{auto:1,UpdateLastExecution:0b}"},{id:command_block_minecart,Command:"setblock ~2 ~-1 ~2 chain_command_block{auto:1,UpdateLastExecution:0b}"},{id:command_block_minecart,Command:\'setblock ~2 ~ ~1 chain_command_block[facing=south]{auto:1,Command:"data modify block ~ ~ ~1 Command set string block ~-1 ~ ~ LastOutput 106 -21",UpdateLastExecution:0b}\'},{id:command_block_minecart,Command:"setblock ~2 ~ ~2 chain_command_block[facing=down]{auto:1,UpdateLastExecution:0b}"},{id:command_block_minecart,Command:"setblock ~2 ~1 ~1 barrel{Items:[{Slot:0b,components:{custom_data:{rom:[]}},count:1,id:book}],CustomName:\\"\'ROM\'\\",lock:{items:air,count:2}}"},{id:command_block_minecart,Command:\'setblock ~2 ~1 ~2 chain_command_block[facing=west]{auto:1,Command:"/execute store result storage ${header.STORAGE} ${header.STORAGE_PATH}.rom int 1 run setblock ~ ~-1 ~ minecraft:chain_command_block[facing=down]"}\'},{id:command_block_minecart,Command:"data modify storage ${header.STORAGE} ${header.STORAGE_PATH}.t set value ${JSON.stringify(JSON.stringify(instr)).slice(1, -1)}"},{id:command_block_minecart,Command:"data modify block ~2 ~1 ~1 Items[0].components.minecraft:custom_data.rom append from storage ${header.STORAGE} ${header.STORAGE_PATH}.t[]"},{id:command_block_minecart,Command:"data remove storage ${header.STORAGE} ${header.STORAGE_PATH}.t"},{id:command_block_minecart,Command:"setblock ~ ~1 ~ command_block{Command:\\"fill ~ ~ ~ ~ ~-4 ~ air\\",auto:1}"},{id:command_block_minecart,Command:"kill @e[type=command_block_minecart,distance=..1]"}]}]}]}]}]}`;

        //perfectly fine case
        if (wrapper.length <= maxLength) return [wrapper];

        let executerLength = wrapper.length - JSON.stringify(JSON.stringify(instr)).slice(1, -1).length;

        if (executerLength > maxLength) throw {type:"headerTooLarge"}

        let mergerCommand = `summon falling_block ~ ~.5 ~ {BlockState:{Name:glass},Passengers:[{id:armor_stand,Small:1,Health:0,Passengers:[{id:item,Item:{id:stone,count:1},Age:5998,Passengers:[{id:falling_block,BlockState:{Name:redstone_block},Passengers:[{id:falling_block,BlockState:{Name:"activator_rail"},Passengers:[{id:command_block_minecart,Command:"fill ~ ~-3 ~1 ~ ~-3 ~1 air"},{id:command_block_minecart,Command:"data modify storage ${header.STORAGE} ${header.STORAGE_PATH}.rom set value []"},{id:command_block_minecart,Command:"data modify block ~2 ~1 ~1 Items[0].components.minecraft:custom_data.rom append from storage ${header.STORAGE} ${header.STORAGE_PATH}.rom[]"},{id:command_block_minecart,Command:"data remove storage ${header.STORAGE} ${header.STORAGE_PATH}.rom"},{id:command_block_minecart,Command:"tellraw @p \\"\\\\u00a77cmdASM: \\\\u00a7f1\\\\u00a77 out of \\\\u00a7f2\\\\u00a77 commands pasted!\\""},{id:command_block_minecart,Command:"setblock ~ ~-3 ~ command_block destroy"},{id:command_block_minecart,Command:"setblock ~ ~1 ~ command_block{Command:\\"fill ~ ~ ~ ~ ~-3 ~ air\\",auto:1}"},{id:command_block_minecart,Command:"kill @e[type=command_block_minecart,distance=..1]"}]}]}]}]}]}`;

        console.log("chunk size: ", maxLength - mergerCommand.length);
        let instrChunks = cmdASM.splitByMaxCmdLength(instr, maxLength - mergerCommand.length);

        let commandChunks = [];
        let isLast;
        for (let i = 0; i < instrChunks.length; i++) {
            isLast = (i === instrChunks.length - 1);

            let command = `summon falling_block ~ ~.5 ~ {BlockState:{Name:glass},Passengers:[{id:armor_stand,Small:1,Health:0,Passengers:[{id:item,Item:{id:stone,count:1},Age:5998,Passengers:[{id:falling_block,BlockState:{Name:redstone_block},Passengers:[{id:falling_block,BlockState:{Name:"activator_rail"},Passengers:[{id:command_block_minecart,Command:"fill ~ ~-3 ~1 ~ ~-3 ~1 air"},{id:command_block_minecart,Command:"data modify storage ${header.STORAGE} ${header.STORAGE_PATH}.rom set value ${JSON.stringify(JSON.stringify(instrChunks[i])).slice(1, -1)}"},{id:command_block_minecart,Command:"data modify block ~2 ~1 ~1 Items[0].components.minecraft:custom_data.rom append from storage ${header.STORAGE} ${header.STORAGE_PATH}.rom[]"},{id:command_block_minecart,Command:"data remove storage ${header.STORAGE} ${header.STORAGE_PATH}.rom"},{id:command_block_minecart,Command:"tellraw @p \\"\\\\u00a77cmdASM: \\\\u00a7f${i + 2}\\\\u00a77 out of \\\\u00a7f${instrChunks.length + 1}\\\\u00a77 commands pasted!\\""},{id:command_block_minecart,Command:"setblock ~ ~-3 ~ command_block destroy"},{id:command_block_minecart,Command:"setblock ~ ~1 ~ command_block{Command:\\"fill ~ ~ ~ ~ ~-${isLast?4:3} ~ air\\",auto:1}"},{id:command_block_minecart,Command:"kill @e[type=command_block_minecart,distance=..1]"}]}]}]}]}]}`;

            commandChunks.push(command);
        }

        console.log("instr chunks: ", instrChunks.length + 1);

        wrapper = `summon falling_block ~ ~.5 ~ {BlockState:{Name:glass},Passengers:[{id:armor_stand,Small:1,Health:0,Passengers:[{id:item,Item:{id:stone,count:1},Age:5998,Passengers:[{id:falling_block,BlockState:{Name:redstone_block},Passengers:[{id:falling_block,BlockState:{Name:"activator_rail"},Passengers:[{id:command_block_minecart,Command:"fill ~1 ~-3 ~1 ~2 ~1 ~2 air"},{id:command_block_minecart,Command:\'setblock ~1 ~-3 ~1 chain_command_block[facing=up]{auto:1,Command:"summon minecraft:block_display ~ ~ ~ {UUID:[I;${header.ENTITY_INTARR}]}"}\'},{id:command_block_minecart,Command:\'setblock ~1 ~-3 ~2 chain_command_block{auto:1,Command:"scoreboard players set $${header.SB_PREFIX}pc${header.SB_SUFFIX} ${header.SB_OBJ} -1"}\'},{id:command_block_minecart,Command:\'setblock ~1 ~-2 ~1 chain_command_block[facing=up]{auto:1,Command:"setblock ~1 ~1 ~1 minecraft:chain_command_block[facing=north]"}\'},{id:command_block_minecart,Command:\'setblock ~1 ~-2 ~2 repeating_command_block[facing=east]{Command:"execute store result block ~ ~ ~ auto byte 1 run scoreboard players remove $${header.SB_PREFIX}timer${header.SB_SUFFIX} ${header.SB_OBJ} 1"}\'},{id:command_block_minecart,Command:\'setblock ~1 ~-1 ~1 chain_command_block[facing=south]{auto:1,Command:"scoreboard players add $${header.SB_PREFIX}pc${header.SB_SUFFIX} ${header.SB_OBJ} 1",UpdateLastExecution:0b}\'},{id:command_block_minecart,Command:\'setblock ~1 ~-1 ~2 chain_command_block[facing=up]{auto:1,Command:"data modify block ~1 ~-1 ~-1 front_text.messages[0] set value \\\'[{\\\\"text\\\\":\\\\"data modify block ~ ~-1 ~ Command set from storage ${header.STORAGE} ${header.STORAGE_PATH}.rom[\\\\"},{\\\\"score\\\\":{\\\\"name\\\\":\\\\"$${header.SB_PREFIX}pc${header.SB_SUFFIX}\\\\",\\\\"objective\\\\":\\\\"${header.SB_OBJ}\\\\"}},{\\\\"text\\\\":\\\\"]\\\\"}]\\\'",UpdateLastExecution:0b}\'},{id:command_block_minecart,Command:\'setblock ~1 ~ ~1 chain_command_block[facing=east]{auto:1,Command:"/enchant ${header.ENTITY} lure",UpdateLastExecution:0b}\'},{id:command_block_minecart,Command:\'setblock ~1 ~ ~2 chain_command_block{auto:1,Command:"/data modify entity ${header.ENTITY} CustomName set from block ~1 ~-2 ~-1 front_text.messages[0]",UpdateLastExecution:0b}\'},{id:command_block_minecart,Command:\'setblock ~1 ~1 ~1 chain_command_block[facing=east]{auto:1,Command:"kill ${header.ENTITY}"}\'},{id:command_block_minecart,Command:\'setblock ~1 ~1 ~2 chain_command_block{auto:1,Command:"#scoreboard objectives remove ${header.SB_OBJ}"}\'},{id:command_block_minecart,Command:\'setblock ~2 ~-3 ~1 command_block[facing=south]{Command:"scoreboard objectives add ${header.SB_OBJ} dummy"}\'},{id:command_block_minecart,Command:\'setblock ~2 ~-3 ~2 chain_command_block[facing=west]{auto:1,Command:"data modify storage ${header.STORAGE} ${header.STORAGE_PATH}.rom set from block ~ ~4 ~-1 Items[0].components.minecraft:custom_data.rom"}\'},{id:command_block_minecart,Command:"setblock ~2 ~-2 ~1 oak_wall_hanging_sign{}"},{id:command_block_minecart,Command:"setblock ~2 ~-2 ~2 chain_command_block{auto:1,Command:\'execute if score $${header.SB_PREFIX}timer${header.SB_SUFFIX} ${header.SB_OBJ} matches ..0 run setblock ~ ~ ~-1 minecraft:chain_command_block[facing=west]{auto:1b,Command:\\"setblock ~ ~ ~ minecraft:oak_wall_hanging_sign[facing=north]\\"}\'}"},{id:command_block_minecart,Command:"setblock ~2 ~-1 ~1 chain_command_block[facing=west]{auto:1,UpdateLastExecution:0b}"},{id:command_block_minecart,Command:"setblock ~2 ~-1 ~2 chain_command_block{auto:1,UpdateLastExecution:0b}"},{id:command_block_minecart,Command:\'setblock ~2 ~ ~1 chain_command_block[facing=south]{auto:1,Command:"data modify block ~ ~ ~1 Command set string block ~-1 ~ ~ LastOutput 106 -21",UpdateLastExecution:0b}\'},{id:command_block_minecart,Command:"setblock ~2 ~ ~2 chain_command_block[facing=down]{auto:1,UpdateLastExecution:0b}"},{id:command_block_minecart,Command:"setblock ~2 ~1 ~1 barrel{Items:[{Slot:0b,components:{custom_data:{rom:[]}},count:1,id:book}],CustomName:\\"\'ROM\'\\",lock:{items:air,count:2}}"},{id:command_block_minecart,Command:\'setblock ~2 ~1 ~2 chain_command_block[facing=west]{auto:1,Command:"/execute store result storage ${header.STORAGE} ${header.STORAGE_PATH}.rom int 1 run setblock ~ ~-1 ~ minecraft:chain_command_block[facing=down]"}\'},{id:command_block_minecart,Command:"setblock ~ ~-3 ~ command_block destroy"},{id:command_block_minecart,Command:"tellraw @p \\"\\\\u00a77cmdASM: \\\\u00a7f1\\\\u00a77 out of \\\\u00a7f${instrChunks.length + 1}\\\\u00a77 command pasted!\\""},{id:command_block_minecart,Command:"setblock ~ ~1 ~ command_block{Command:\\"fill ~ ~ ~ ~ ~-3 ~ air\\",auto:1}"},{id:command_block_minecart,Command:"kill @e[type=command_block_minecart,distance=..1]"}]}]}]}]}]}`;

        commandChunks.unshift(wrapper);

        return commandChunks;

        
    },

    splitByMaxCmdLength: function(instr, maxlen)
    {

        const len = instr.length;

        let chunkLength = 0;
        let chunkInstr = [];
        let out = [];

        for (let i = 0; i < len; i++)
        {
            const line = instr[i];
            const lineLen = JSON.stringify(JSON.stringify(line)).length - 1;

            if (chunkLength + lineLen > maxlen)
            {
                out.push(chunkInstr);

                chunkInstr = [line];
                chunkLength = lineLen;
            }
            else
            {
                chunkInstr.push(line);
                chunkLength += lineLen;
            }
        }

        //left overs
        if (chunkInstr.length)
        {
            out.push(chunkInstr)
        }

        return out;
    },

    translateFunctions: function(sourceArray) 
    {
        const header = this.header;
        const labels = this.label;

        const translateData = {
            command(lineObject) {
                return [lineObject.args.command];
            },

            whitespace(lineObject) {
                return []; 
            },

            comment(lineObject) {
                return [];
            },

            label(lineObject) {
                return [];
            },

            head(lineObject) {
                return [];
            },

            jump(lineObject) {

                if (!lineObject.args.conditional)
                {
                    //non conditional
                    return [
                    `scoreboard players set $${header.SB_PREFIX}pc${header.SB_SUFFIX} ${header.SB_OBJ} ${labels[lineObject.args.label] - 1}`
                    ];
                }

                //conditional
                return [
                    `execute ${lineObject.args.condition} run scoreboard players set $${header.SB_PREFIX}pc${header.SB_SUFFIX} ${header.SB_OBJ} ${labels[lineObject.args.label] - 1}`
                ];

            },

            sleep(lineObject) {
                if (lineObject.args.type === "const")
                {
                    return [
                        `scoreboard players set $${header.SB_PREFIX}timer${header.SB_SUFFIX} ${header.SB_OBJ} ${lineObject.args.tick}`,
                        "setblock ~ ~ ~ chain_command_block[facing=south]",
                        "data merge block ~-1 ~-1 ~ {auto:1b}"];
                }
                if (lineObject.args.type === "run")
                {
                    return [
                        `execute store result score $${header.SB_PREFIX}timer${header.SB_SUFFIX} ${header.SB_OBJ} run ${lineObject.args.command}`,
                        "setblock ~ ~ ~ chain_command_block[facing=south]",
                        "data merge block ~-1 ~-1 ~ {auto:1b}"
                    ];
                }
            },

            eval(lineObject) {

                if (!header.EVAL_ENTITY) throw {type:"evalMissingEntity", context: lineObject}

                return [
                    `data merge entity ${header.EVAL_ENTITY} {text:${lineObject.args.json}}`,
                    `data modify entity ${header.EVAL_ENTITY} CustomName set from entity ${header.EVAL_ENTITY} text`,
                    `data modify block ~ ~ ~-1 Command set value "execute if score $${header.SB_PREFIX}pc${header.SB_SUFFIX} ${header.SB_OBJ} matches ${lineObject.shiftedLine + 3} run data modify storage ${header.STORAGE} ${header.STORAGE_PATH}.rom[${lineObject.shiftedLine + 5}] set string block ~ ~ ~1 LastOutput 106 -21"`,
                    `enchant ${header.EVAL_ENTITY} lure`,
                    `data modify block ~ ~ ~-1 Command set value ""`,
                    `say PLACERHOLDEROVERRIDE`
                ];
            },

            exit(lineObject) {
                return [];
            },

            call(lineObject) {
                return [
                    `data modify storage ${header.STORAGE} ${header.STORAGE_PATH}.cs append value ${lineObject.shiftedLine + 1}`,
                    `scoreboard players set $${header.SB_PREFIX}pc${header.SB_SUFFIX} ${header.SB_OBJ} ${labels[lineObject.args.label] - 1}`
                ];
            },

            ret(lineObject) { 
                return [
                    `execute store result score $${header.SB_PREFIX}tempPc${header.SB_SUFFIX} ${header.SB_OBJ} run data get storage ${header.STORAGE} ${header.STORAGE_PATH}.cs[-1]`,
                    `data remove storage ${header.STORAGE} ${header.STORAGE_PATH}.cs[-1]`,
                    `scoreboard players operation $${header.SB_PREFIX}pc${header.SB_SUFFIX} ${header.SB_OBJ} = $${header.SB_PREFIX}tempPc${header.SB_SUFFIX} ${header.SB_OBJ}`
                ];
            }
        };

        sourceArray.map((lineObject, index) => 
        {
            lineObject.translated = translateData[lineObject.type](lineObject);
            return lineObject;
        });

        return sourceArray;
    },

    generateLabelObject: function(labelSource)
    {
        let labelNames = Object.keys(labelSource);
        let labelObject = {};

        for (const labelName of labelNames)
        {
            labelObject[labelName] = labelSource[labelName].shiftedLine;
        }

        return labelObject;
    },

    determineLineShift: function(sourceObjArr)
    {
        let line = 0;
        sourceObjArr.forEach(obj => {
            obj.shiftedLine = line;
            line += obj.size;
        });
        return sourceObjArr;
    },

    determineTranslateSize: function(sourceObjArr)
    {

        const translateData = {
            command(context) {return 1},
            whitespace(context) { return 0; },
            comment(context) { return 0; },
            label(context) { return 0; },
            head(context) { return 0; },
            jump(context) { return 1; },
            sleep(context) { return 3; },
            eval(context) { return 6; },
            exit(context) { return 1; },
            call(context) { return 2; },
            ret(context) { return 3; }
        };

        sourceObjArr.map((lineObject, index) => 
        {
            lineObject.size = translateData[lineObject.type](lineObject);
            return lineObject;
        });

        return sourceObjArr;
    },

    generateExtraHeader: function(headerObject)
    {
        function randomUUID() 
        {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }
        
        function convertUUIDtoIntArr(uuidStr, context)
        {
        
            const hex = uuidStr.replace(/-/g, '');

            if (hex.length !== 32) {
                throw {type: "invalidUUID", uuid: uuidStr, context: context};
            }

            const ints = [];
            for (let i = 0; i < 4; i++) {
                // Grab 8 hex chars (4 bytes) at a time
                const chunk = hex.substring(i * 8, i * 8 + 8);
                // Parse as unsigned 32-bit integer
                const unsignedInt = parseInt(chunk, 16);
                // Convert to signed 32-bit integer
                const signedInt = unsignedInt > 0x7FFFFFFF ? unsignedInt - 0x100000000 : unsignedInt;
                ints.push(signedInt);
            }
            return ints;
        }


        if (headerObject.ENTITY === "RANDOM") headerObject.ENTITY = randomUUID();

        headerObject.ENTITY_INTARR = convertUUIDtoIntArr(headerObject.ENTITY, this.headerSourceObj.ENTITY).join(",");

        if ("EVAL_ENTITY" in headerObject) 
        {
            if (headerObject.EVAL_ENTITY === "RANDOM") headerObject.EVAL_ENTITY = randomUUID();
            headerObject.EVAL_ENTITY_INTARR = convertUUIDtoIntArr(headerObject.EVAL_ENTITY, this.headerSourceObj.EVAL_ENTITY).join(",");
        }

        if (headerObject.ENTITY_INTARR === headerObject.EVAL_ENTITY_INTARR || headerObject.ENTITY === headerObject.EVAL_ENTITY) 
        {
            throw {type:"dupedUUID"}
        }

        //SOME OPTIONAL MISSING HEADER

        if (!("SB_SUFFIX" in headerObject))
        {
            headerObject.SB_SUFFIX = "";
        }

        if (!("SB_PREFIX" in headerObject))
        {
            headerObject.SB_PREFIX = "";
        }

        if (!("STORAGE_PATH" in headerObject))
        {
            headerObject.STORAGE_PATH = "";
        }

        headerObject.STORAGE_PATH = headerObject.STORAGE_PATH.trim()
        headerObject.STORAGE_PATH += ".cmdASM";
        if (headerObject.STORAGE_PATH[0] === ".") headerObject.STORAGE_PATH = headerObject.STORAGE_PATH.slice(1);

        return headerObject;

    },

    validateHeaderObject: function(headerObject)
    {
        const requiredHeaders = ["SB_OBJ", "ENTITY", "STORAGE"];
        for (const key of requiredHeaders)
        {
            if (!(key in headerObject)) throw { type: "missingHeader", head: key }
        }
        return headerObject;
    },

    generateHeaderObject: function(headerSourceObject)
    {
        return Object.keys(headerSourceObject).reduce((acc, key) => {
            acc[key] = headerSourceObject[key].args.value;
            return acc;
        }, {});
    },

    generateHeaderSourceObject: function(sourceObjArr)
    {
        const headerSourceObj = {};

        sourceObjArr.forEach((lineObject, index) => {
            if (lineObject.type !== "head") return;

            const argHeader = lineObject.args.header;
            const argValue = lineObject.args.value;

            if (argHeader in headerSourceObj) throw {type:"headDuplicatedHeader", context: lineObject, with: headerSourceObj[argHeader], header: argHeader}

            headerSourceObj[argHeader] = lineObject;
        });

        return headerSourceObj;
    },


    generateLabelSourceObject: function(sourceObjArr) {
        let labelObj = {};
        
        sourceObjArr.forEach((lineObject, index)=>{
            
            //only on label line
            if (lineObject.type !== "label") return;
            
            let labelString = lineObject.line.replace("@","").trim();
            
            if (labelString.includes(" ")) throw {type:"invalidLabelName",context: lineObject,label: labelString}
            
            if (labelString in labelObj)
            {
                throw {type:"duplicateLabelName",context: lineObject,with: labelObj[labelString]}
            }
            
            labelObj[labelString] = lineObject;
            
            
        })
        
        return labelObj;
    },

    getInstructionArgs: function(lineObject) 
    {
        lineObject.args = {};
        let vaildLabels = this.labelSourceObject;
        let instrTypeObject = {

            "command": function(lineString) {
                return {command: lineString};
            },

            "head": function(lineString) {
                //.head TARGET VALIE
                const args = lineString.split(' ');
                if (args.length <= 2) throw {type:"headMissingArg", context: lineObject, expect: 2, found: args.length - 1}

                const [_, targetHead, headValue] = args;

                const vaildHeads = ['SB_OBJ', 'SB_PREFIX', 'SB_SUFFIX', 'ENTITY', 'STORAGE', 'STORAGE_PATH', 'EVAL_ENTITY'];

                if (!vaildHeads.includes(targetHead)) throw {type:"headUnknownHeader", context: lineObject, arg: targetHead};

                return {header: targetHead, value: headValue}
            },

            "sleep": function(lineString) {


                //.sleep (COMMAND)
                if (lineString === ".sleep") throw {type:"sleepMissingArg", context: lineObject, expect: 1, found: 0} //throw

                let arg = lineString.replace(".sleep ","");

                if (arg.startsWith("("))
                {
                    if (!arg.endsWith(")")) throw {type:"sleepUnclosedParenthesis", context: lineObject, argIndex: 1, argContext: arg}

                    arg = arg.slice(1, -1); //take out start ( and end )

                    return {command: arg, type: "run"};
                }


                if (!/^\d+$/.test(arg)) throw {type:"sleepInvalidTypeArg", context: lineObject, argIndex: 1, argContext: arg};

                let constNum = parseInt(arg);

                if (isNaN(constNum)) throw {type:"sleepInvalidTypeArg", context: lineObject, argIndex: 1, argContext: arg};

                return {tick: constNum, type: "const"};


            },

            "jump": function(lineString)
            {
                //.jump TARGET [optional condition]

                lineString = lineString.trim();
                if (lineString === ".jump") throw {type:"jumpMissingArg", context: lineObject};

                let args = lineString.split(' ');
                let argLabel = args[1];
                let argCondition = args.slice(2).join(' ');

                //labelCheck

                if (!(argLabel in vaildLabels)) throw {type:"jumpUndefinedLabel", context: lineObject, arg: argLabel}

                if (argCondition) return {label: argLabel, condition: argCondition, conditional: true};
                return {label: argLabel, conditional: false};
                
            },

            "eval": function(lineString)
            {
                //.eval jsonString
                let arg = lineString.replace(".eval","").trim();

                if (arg === "") throw {type:"evalMissingArg", context: lineObject};

                function isJSONStringLoose(str) {
                    try {
                        // If it starts and ends with single quotes, convert to double quotes
                        if (str.startsWith("'") && str.endsWith("'")) {
                            str = `"${str.slice(1, -1).replace(/"/g, '\\"')}"`;
                        }

                        let outer = JSON.parse(str);
                        if (typeof outer !== "string") return false;

                        JSON.parse(outer); // inner JSON
                        return true;
                    } catch {
                        return false;
                    }
                }

                if (/*!isJSONStringLoose(arg)*/ false) throw {type:"evalInvalidJson", context: lineObject, arg: arg};

                return {json: arg}
            },

            "exit": function(lineString)
            {
                let args = lineString.trim().split(' ');
                if (args[1]) throw {type:"ExitTooManyArg", context: lineObject, expect: 0, found: args.length - 1};
                return {}
            },

            "call": function(lineString)
            {
                let args = lineString.trim().split(' ');
                if (args.length >= 3) throw {type: "callTooManyArg", context: lineObject, expect: 1, found: args.length - 1}
                if (args.length === 1) throw {type:"callMissingArg", context: lineObject, expect: 1, found: 0}

                let labelArg = args[1];

                if (!(labelArg in vaildLabels)) throw {type:"callUndefinedLabel", context: lineObject, arg: labelArg}

                return {label: labelArg}
            },

            "ret": function(lineString)
            {
                let args = lineString.trim().split(' ');
                if (args[1]) throw {type:"RetTooManyArg", context: lineObject, expect: 0, found: args.length - 1};
                return {}
            }
        };
        
        if (!(lineObject.type in instrTypeObject)) return lineObject;
        
        lineObject.args = instrTypeObject[lineObject.type](lineObject.line);
        
        return lineObject;
    },
    
    getInstructionType: function(lineString, lineObject)
    {
        
        if (lineString === "") return "whitespace";
        if (lineString.startsWith("#")) return "comment";
        if (lineString.startsWith("@")) return "label";
        if (lineString.startsWith(".")) 
        {
            let instruction = lineString.split(" ", 1);
            
            let instructionObject =
            {
                ".head": "head",
                ".jump": "jump",
                ".sleep": "sleep",
                ".eval": "eval",
                /*".exit": "exit",*/
                ".call": "call",
                ".ret": "ret"
            }
            
            let type = instructionObject[instruction];
            
            if (!type) throw {type:"unknownInstruction", context: lineObject}
            
            return type;
        }
        
        return "command";
    }
}

/*
console.log(cmdASM.tryCompileString(
    `
    .head SB_OBJ test
    .head ENTITY RANDOM
    #.head EVAL_ENTITY RANDOM
    .head STORAGE test
    
    .eval '{"text":"test"}'
    `
));
*/
