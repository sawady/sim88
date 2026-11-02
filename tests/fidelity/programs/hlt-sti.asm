;; timeout: 4
; HLT with I = 1 and nothing pressed: the CPU waits for an interrupt.
        ORG 2000H
        MOV AX, 1
        STI
        HLT
        MOV AX, 2
        INT 0
        END
