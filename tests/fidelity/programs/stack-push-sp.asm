; PUSH SP: which value goes to the stack (the 8086 pushes SP after the
; decrement, the 80286 before).
        ORG 2000H
        MOV AX, 1234H
        MOV SP, 7000H
        PUSH SP
        POP BX
        MOV SP, 8000H
        INT 0
        END
