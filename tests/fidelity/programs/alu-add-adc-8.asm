; ADD and ADC on 8 bits at the flag edges. After each operation the flags
; and AX are pushed, so the stack keeps a trace of every result.
        ORG 2000H
        MOV AL, 7FH
        ADD AL, 1          ; 80h: O, S, A
        PUSHF
        PUSH AX
        MOV AL, 0FFH
        ADD AL, 1          ; 00h: C, Z, A, P
        PUSHF
        PUSH AX
        MOV AL, 80H
        ADD AL, 80H        ; 00h: C, O, Z, P
        PUSHF
        PUSH AX
        MOV AL, 0FH
        ADD AL, 1          ; 10h: A
        PUSHF
        PUSH AX
        MOV AL, 1
        ADD AL, 2          ; 03h: P
        PUSHF
        PUSH AX
        MOV BL, 0F0H
        MOV AL, 0FH
        ADD AL, BL         ; FFh: S, P
        PUSHF
        PUSH AX
        MOV AL, 0FFH
        ADD AL, 0FFH       ; FEh: C, S, A
        PUSHF
        PUSH AX
        MOV AL, 0
        ADD AL, 0FFH       ; C = 0 here
        ADC AL, 1          ; FFh + 1 + C(0)
        PUSHF
        PUSH AX
        MOV AL, 0FFH
        ADD AL, 1          ; sets C
        MOV AL, 7EH
        ADC AL, 1          ; 7Eh + 1 + 1 = 80h: O, S
        PUSHF
        PUSH AX
        MOV AL, 0FFH
        ADD AL, 1          ; sets C
        MOV AL, 0FFH
        ADC AL, 0          ; FFh + 0 + 1 = 00h: C, Z, A
        PUSHF
        PUSH AX
        INT 0
        END
