; CALL and RET with nested subroutines in another ORG; parameters in
; registers and through the stack.
        ORG 1000H
RES     DW ?
        ORG 3000H
DOBLE:  ADD AX, AX          ; AX = 2 * AX
        RET
CUAD:   PUSH AX
        CALL DOBLE
        CALL DOBLE          ; AX = 4 * AX
        POP BX              ; original AX
        RET
SUMA:   MOV BX, SP
        MOV AX, [BX]        ; return address
        RET
        ORG 2000H
        MOV AX, 5
        CALL CUAD
        MOV RES, AX
        CALL SUMA
        MOV CX, SP
        INT 0
        END
