;; timeout: 4
; The typical first program: add the bytes of a table with a counted loop.
        ORG 1000H
TABLA   DB 2, 4, 6, 8, 10, 12, 14, 16, 18, 20
FIN     DB ?
TOTAL   DB ?
        ORG 2000H
        MOV AL, 0
        MOV CL, OFFSET FIN - OFFSET TABLA
        MOV BX, OFFSET TABLA
LAZO:   ADD AL, [BX]
        INC BX
        DEC CL
        JNZ LAZO
        MOV TOTAL, AL
        HLT
        END
