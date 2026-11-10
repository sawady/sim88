; Hardware interrupts: every time F10 is pressed, the PIC requests INT0
; and the routine F10_ISR counts the presses in DX.

PIC     EQU 20H
EOI     EQU 20H
IMR     EQU 21H
INT0    EQU 24H
ID_F10  EQU 10           ; interrupt type: its vector is at 4 * 10 = 40

        ORG 40
        DW F10_ISR

        ORG 3000H
F10_ISR: INC DX
        MOV AL, EOI      ; end of interrupt
        OUT PIC, AL
        IRET

        ORG 2000H
        CLI
        MOV AL, 11111110B  ; only INT0 enabled
        OUT IMR, AL
        MOV AL, ID_F10
        OUT INT0, AL
        MOV DX, 0
        STI
IDLE:   JMP IDLE
        END
