# cmdASM

https://mctcrs.github.io/cmdASM/

Execute Minecraft commands with structured control flow using only 20 command blocks.  
Supports **jumps**, **calls**, **sleeps**, and **JSON evaluation**.  

Tested on **Minecraft 1.21.4**.

> ⚠️ **Disclaimer:** This system is very performance-heavy. Use with caution on large command sequences or multiplayer servers.

---

## Features

- Jump to labels with optional conditions  
- Call subroutines with `.call` and return using `.ret`  
- Sleep for a set number of ticks or return of command 
- Evaluate and flatten JSON text with `.eval`  

---

## Snippet

```mcfunction
@start
.jump playerFound if entity @p
    say No player found.
    .jump end

@playerFound
    .call sleepFunc
    say Found player.
    .jump end

@sleepFunc
    .sleep 20
    .ret

@end
