;; compare: no
;; timeout: 8
; Experiment (not compared): in fast mode, how many loop turns run before the
; timer reaches COMP = 3? Tells whether the timer's clock is real time.
        ORG 1000H
VUELTAS DW 0
        ORG 44H
        DW RUT
        ORG 3000H
RUT:    MOV VUELTAS, DX
        MOV AL, 20H
        OUT 20H, AL
        INT 0
        ORG 2000H
        CLI
        MOV AL, 11H
        OUT 25H, AL
        MOV AL, 0FDH
        OUT 21H, AL
        MOV AL, 3
        OUT 11H, AL
        MOV AL, 0
        OUT 10H, AL
        MOV DX, 0
        STI
LAZO:   INC DX
        JMP LAZO
        END
