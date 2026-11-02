; INT 3 is a breakpoint: where the program stops and what is on the stack.
        ORG 2000H
        MOV AX, 1
        INT 3
        MOV AX, 2
        INT 0
        END
