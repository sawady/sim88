; Subroutines: CALL and RET, with parameters in registers and on the stack.
; LARGER leaves in AL the larger of AL and AH.
; ADDUP adds two numbers passed on the stack and leaves the result in AX.

        ORG 1000H
NUM1    DB 7
NUM2    DB 12
RES     DB ?
SUM     DW ?

        ORG 3000H
LARGER: CMP AL, AH
        JNC DONE         ; AL >= AH
        MOV AL, AH
DONE:   RET

ADDUP:  PUSH BX
        MOV BX, SP
        ADD BX, 4        ; skip BX and the return address
        MOV AX, [BX]     ; second parameter
        ADD BX, 2
        ADD AX, [BX]     ; first parameter
        POP BX
        RET

        ORG 2000H
        MOV AL, NUM1
        MOV AH, NUM2
        CALL LARGER
        MOV RES, AL

        MOV AX, 1000
        PUSH AX
        MOV AX, 234
        PUSH AX
        CALL ADDUP
        POP CX           ; take the parameters off the stack
        POP CX
        MOV SUM, AX
        HLT
        END
