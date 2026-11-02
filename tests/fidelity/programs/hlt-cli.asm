;; timeout: 4
; HLT with interrupts disabled (I = 0): no interrupt can wake the CPU.
        ORG 2000H
        MOV AX, 1
        CLI
        HLT
        MOV AX, 2
        INT 0
        END
