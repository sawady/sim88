; SP at 0: PUSH wraps around to FFFEh (the monitor area).
        ORG 2000H
        MOV SP, 0
        MOV AX, 1234H
        PUSH AX
        MOV BX, SP
        POP CX
        MOV SP, 8000H
        INT 0
        END
