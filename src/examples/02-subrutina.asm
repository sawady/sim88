; Subrutinas: CALL y RET, con parámetros por registro y por pila.
; MAYOR deja en AL el mayor de AL y AH.
; SUMAR suma dos números que se pasan por la pila y deja el resultado en AX.

        ORG 1000H
NUM1    DB 7
NUM2    DB 12
RES     DB ?
SUMA    DW ?

        ORG 3000H
MAYOR:  CMP AL, AH
        JNC LISTO        ; AL >= AH
        MOV AL, AH
LISTO:  RET

SUMAR:  PUSH BX
        MOV BX, SP
        ADD BX, 4        ; salteo BX y la dirección de retorno
        MOV AX, [BX]     ; segundo parámetro
        ADD BX, 2
        ADD AX, [BX]     ; primer parámetro
        POP BX
        RET

        ORG 2000H
        MOV AL, NUM1
        MOV AH, NUM2
        CALL MAYOR
        MOV RES, AL

        MOV AX, 1000
        PUSH AX
        MOV AX, 234
        PUSH AX
        CALL SUMAR
        POP CX           ; saco los parámetros
        POP CX
        MOV SUMA, AX
        HLT
        END
