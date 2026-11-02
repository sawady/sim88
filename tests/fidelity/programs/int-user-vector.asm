; A software interrupt through the vector table: INT 10h with the routine
; address at 40h. INT pushes the flags and IP and clears I; IRET restores them.
        ORG 40H
        DW RUTINA
        ORG 3000H
RUTINA: MOV BX, SP
        MOV CX, [BX]        ; return IP
        PUSHF
        POP DX              ; flags inside the routine (I cleared?)
        MOV AX, 5555H
        IRET
        ORG 2000H
        MOV AL, 0FFH
        ADD AL, 1          ; C, Z, A, P
        INT 10H
        PUSHF
        INT 0
        END
