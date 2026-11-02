;; timeout: 6
; A program that overwrites the vector of INT 7 with its own routine: does
; INT 7 still write on the screen, or does it run the routine?
        ORG 1000H
TXT     DB "SISTEMA"
        ORG 1CH
        DW PROPIA
        ORG 3000H
PROPIA: MOV DX, 7777H
        IRET
        ORG 2000H
        MOV BX, OFFSET TXT
        MOV AL, 7
        INT 7
        INT 0
        END
