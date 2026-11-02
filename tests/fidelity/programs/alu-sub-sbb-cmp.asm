; SUB, SBB and CMP on 8 and 16 bits: borrow, overflow and aux carry.
        ORG 1000H
B1      DB 10H
W1      DW 8000H
        ORG 2000H
        MOV AL, 0
        SUB AL, 1          ; FFh: C, S, A, P
        PUSHF
        PUSH AX
        MOV AL, 80H
        SUB AL, 1          ; 7Fh: O, A
        PUSHF
        PUSH AX
        MOV AL, 7FH
        SUB AL, 0FFH       ; 80h: C, O, S
        PUSHF
        PUSH AX
        MOV AL, 5
        SUB AL, 5          ; 00h: Z, P
        PUSHF
        PUSH AX
        MOV AL, 10H
        SUB AL, B1         ; memory operand: 00h
        PUSHF
        PUSH AX
        SUB B1, 11H        ; memory destination: FFh
        PUSHF
        MOV AL, 0
        SUB AL, 1          ; sets C
        MOV AL, 10H
        SBB AL, 0          ; 10h - 0 - 1 = 0Fh: A
        PUSHF
        PUSH AX
        MOV AX, 0
        SUB AX, 1          ; FFFFh: C, S, A, P
        PUSHF
        PUSH AX
        MOV BX, 8000H
        SUB BX, 1          ; 7FFFh: O, A, P
        PUSHF
        PUSH BX
        SBB W1, 1          ; C was 0: 7FFFh, O
        PUSHF
        MOV AL, 3
        CMP AL, 5          ; flags of 3 - 5, AL unchanged
        PUSHF
        PUSH AX
        MOV CX, 8000H
        CMP CX, 1          ; O
        PUSHF
        PUSH CX
        CMP B1, 0FFH       ; Z
        PUSHF
        INT 0
        END
