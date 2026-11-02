;; keys: 2:f10
;; timeout: 8
;; sim88: f10@1000
; A hardware interrupt with type 0: does it end the program like INT 0?
        ORG 2000H
        CLI
        MOV AL, 0
        OUT 24H, AL
        MOV AL, 0FEH
        OUT 21H, AL
        MOV DX, 1234H
        STI
LAZO:   JMP LAZO
        END
