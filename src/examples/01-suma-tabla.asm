; Suma los elementos de una tabla (programa típico de MSX88)
; Datos en 1000h, código en 2000h.

        ORG 1000H
TABLA   DB 1, 2, 3, 4, 5
CANT    DB 5
TOTAL   DB ?

        ORG 2000H
        MOV AL, 0
        MOV CL, CANT
        MOV BX, OFFSET TABLA
LAZO:   ADD AL, [BX]
        INC BX
        DEC CL
        JNZ LAZO
        MOV TOTAL, AL
        HLT
        END
