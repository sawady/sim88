; INC and DEC keep C; NEG sets C unless the operand is 0; NEG 80h overflows.
        ORG 1000H
B1      DB 0FFH
W1      DW 7FFFH
        ORG 2000H
        MOV AL, 0FFH
        ADD AL, 1          ; sets C
        MOV AL, 7FH
        INC AL             ; 80h: O, S, A, C kept
        PUSHF
        PUSH AX
        MOV AL, 0
        SUB AL, 1          ; sets C
        MOV AL, 0
        ADD AL, 0          ; clears C
        MOV AL, 80H
        DEC AL             ; 7Fh: O, A
        PUSHF
        PUSH AX
        INC B1             ; 00h: Z, A, P
        PUSHF
        DEC W1             ; 7FFEh
        PUSHF
        INC W1             ; 7FFFh
        PUSHF
        INC W1             ; 8000h: O
        PUSHF
        MOV AL, 1
        NEG AL             ; FFh: C, S, A, P
        PUSHF
        PUSH AX
        MOV AL, 0
        NEG AL             ; 00h: no C
        PUSHF
        PUSH AX
        MOV AL, 80H
        NEG AL             ; 80h: C, O
        PUSHF
        PUSH AX
        MOV BX, 1
        NEG BX             ; FFFFh
        PUSHF
        PUSH BX
        NEG B1             ; 00h
        PUSHF
        MOV DX, 0
        DEC DX             ; FFFFh
        PUSHF
        PUSH DX
        INT 0
        END
