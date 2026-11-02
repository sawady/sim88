; INT 0 after changing SP and the flags: what INT 0 leaves on the stack.
        ORG 2000H
        MOV SP, 6000H
        MOV AL, 7FH
        ADD AL, 1          ; O, S, A
        MOV DX, 0ABCDH
        INT 0
        MOV DX, 0           ; never runs
        END
