; ALU operations with a memory destination and a register source (opcodes
; 00h-3Bh with ModRM), directly and through BX.
        ORG 1000H
B1      DB 10H
W1      DW 1000H
        ORG 2000H
        MOV AL, 5
        ADD B1, AL          ; 00 06 lo hi
        MOV BX, OFFSET B1
        ADD [BX], AL        ; 00 07
        MOV AX, 0F000H
        ADD W1, AX          ; 01 06 lo hi
        SUB B1, AL
        AND W1, AX
        OR B1, AL
        XOR W1, AX
        CMP B1, AL
        ADC B1, AL
        SBB W1, AX
        PUSHF
        INT 0
        END
