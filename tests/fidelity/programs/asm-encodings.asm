;; run: no
; Encodings: one line per instruction form, to compare bytes with ASM88.
        ORG 1000H
B       DB 0
W       DW 0
P       EQU 30H
        ORG 2000H
        MOV AL, 5
        MOV AX, 5
        MOV BL, CH
        MOV SP, AX
        MOV AL, B
        MOV B, AL
        MOV AX, W
        MOV W, AX
        MOV AL, [BX]
        MOV [BX], AX
        MOV B, 5
        MOV W, 5
        ADD AL, 5
        ADD AX, 5
        ADD AX, 500H
        ADD B, 5
        ADD W, 500H
        ADD AL, B
        ADD W, AX
        ADD AL, [BX]
        ADC CL, 1
        SUB DX, CX
        SBB AH, AL
        CMP AL, 5
        CMP AX, 5
        CMP B, 5
        AND AL, 7FH
        OR AX, 8000H
        XOR BL, BL
        NOT AL
        NOT W
        NEG BX
        NEG B
        INC AL
        INC AX
        INC B
        INC W
        DEC CL
        DEC SP
        PUSH AX
        PUSH SP
        POP DX
        PUSHF
        POPF
        IN AL, P
        IN AX, 30H
        IN AL, DX
        IN AX, DX
        OUT P, AL
        OUT 31H, AX
        OUT DX, AL
        OUT DX, AX
        INT 3
        INT 7
        IRET
        CLI
        STI
        NOP
        HLT
        RET
        CALL 3000H
        JMP 2000H
        JZ AQUI
        JNZ AQUI
        JS AQUI
        JNS AQUI
        JC AQUI
        JNC AQUI
        JO AQUI
        JNO AQUI
AQUI:   INT 0
        ORG 3000H
        RET
        END
