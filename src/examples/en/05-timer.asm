; Timer: every 5 seconds it interrupts through INT1 and the routine writes a message.

PIC     EQU 20H
EOI     EQU 20H
IMR     EQU 21H
INT1    EQU 25H
CONT    EQU 10H
COMP    EQU 11H
ID_TIMER EQU 13          ; its vector is at 4 * 13 = 52

        ORG 52
        DW TIMER_ISR

        ORG 1000H
MSG     DB "5 seconds went by. "
MSG_END DB ?

        ORG 3000H
TIMER_ISR: MOV BX, OFFSET MSG
        MOV AL, OFFSET MSG_END - OFFSET MSG
        INT 7
        MOV AL, 0        ; the timer does not go back to 0 by itself
        OUT CONT, AL
        MOV AL, EOI
        OUT PIC, AL
        IRET

        ORG 2000H
        CLI
        MOV AL, 11111101B  ; only INT1 (timer)
        OUT IMR, AL
        MOV AL, ID_TIMER
        OUT INT1, AL
        MOV AL, 5
        OUT COMP, AL
        MOV AL, 0
        OUT CONT, AL
        STI
IDLE:   JMP IDLE
        END
