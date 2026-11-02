; DB, DW, DUP, ?, EQU, ORG, OFFSET and number formats.
CANT    EQU 3
BASE    EQU 1000H
        ORG BASE
NUMS    DB 1, 0AH, 0FFH, 11110000B, -1, -128, 127
PALS    DW 1, 1234H, -1, 0FFFFH
MSG     DB "Hola", 0DH, 0AH, "$"
RES     DB CANT DUP (5)
MAS     DW 2 DUP (0AA55H)
HUECO   DB 4 DUP (?)
DIR     DW MSG
TAM     DB OFFSET RES - OFFSET MSG
        ORG 1040H
OTRA    DB CANT + 2, CANT - 1
        ORG 2000H
        MOV AX, OFFSET PALS
        MOV BX, BASE + 10H
        MOV CL, CANT
        MOV CH, OFFSET HUECO - OFFSET RES
        MOV DX, DIR
        INT 0
        END
