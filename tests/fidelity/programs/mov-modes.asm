; MOV with every MSX88 addressing mode: immediate, register, direct,
; indirect through BX, and immediate to memory (with and without PTR).
        ORG 1000H
B1      DB 12H
B2      DB ?
W1      DW 3456H
W2      DW ?
TABLA   DB 1, 2, 3, 4
        ORG 2000H
        MOV AL, 0AH
        MOV AH, 0BH
        MOV BX, 1234H
        MOV CX, BX
        MOV DL, AL
        MOV DH, AH
        MOV AL, B1          ; direct, byte
        MOV B2, AL
        MOV CX, W1          ; direct, word
        MOV W2, CX
        MOV BX, OFFSET TABLA
        MOV AL, [BX]        ; indirect, byte
        MOV AH, AL
        MOV [BX], AH
        MOV DX, [BX]        ; indirect, word
        MOV BX, OFFSET W2
        MOV [BX], DX
        MOV B1, 77H         ; immediate to a variable
        MOV W1, 0ABCDH
        MOV BX, OFFSET TABLA
        MOV BYTE PTR [BX], 99H
        MOV BX, OFFSET B2
        MOV WORD PTR [BX], 0BEEFH
        MOV SP, 7000H
        MOV AX, SP
        INT 0
        END
