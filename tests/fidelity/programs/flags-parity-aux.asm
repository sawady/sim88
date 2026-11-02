; Parity looks at the low byte only; aux carry is the carry out of bit 3,
; also on 16 bit operations.
        ORG 2000H
        MOV AX, 0
        ADD AX, 0103H      ; low byte 03h: even
        PUSHF
        MOV AX, 0
        ADD AX, 0107H      ; low byte 07h: odd
        PUSHF
        MOV AX, 0
        ADD AX, 0FF00H     ; low byte 00h: even, S
        PUSHF
        MOV AX, 0008H
        ADD AX, 0008H      ; 0010h: A
        PUSHF
        MOV AX, 0800H
        ADD AX, 0800H      ; 1000h: no A (carry out of bit 11)
        PUSHF
        MOV AL, 10H
        SUB AL, 1          ; 0Fh: A (borrow into bit 4)
        PUSHF
        MOV AL, 0FH
        AND AL, 0FH        ; logic: A?
        PUSHF
        MOV AL, 0FFH
        INC AL             ; 00h: A, Z, P
        PUSHF
        MOV AL, 0
        DEC AL             ; FFh: A, S, P
        PUSHF
        MOV BL, 3
        OR BL, 0           ; 03h: P
        PUSHF
        MOV BL, 1
        XOR BL, 0          ; 01h: odd
        PUSHF
        INT 0
        END
