;; sim88: f10@1000
;; keys: 2:f10
;; timeout: 8
; A hardware interrupt with type 7 (INT0 of the PIC -> vector 7, the one of
; INT 7): does the monitor write AL bytes from BX, or only run the vector?
        ORG 1000H
TXT     DB "HW7"
        ORG 2000H
        CLI
        MOV AL, 7
        OUT 24H, AL
        MOV AL, 0FEH
        OUT 21H, AL
        MOV BX, OFFSET TXT
        MOV AL, 3
        STI
LAZO:   JMP LAZO
        END
