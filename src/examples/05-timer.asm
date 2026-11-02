; Timer: cada 5 segundos interrumpe por INT1 y la rutina escribe un mensaje.

PIC     EQU 20H
EOI     EQU 20H
IMR     EQU 21H
INT1    EQU 25H
CONT    EQU 10H
COMP    EQU 11H
ID_TIMER EQU 13          ; su vector está en 4 * 13 = 52

        ORG 52
        DW RUT_TIMER

        ORG 1000H
MSJ     DB "Pasaron 5 segundos. "
FIN_MSJ DB ?

        ORG 3000H
RUT_TIMER: MOV BX, OFFSET MSJ
        MOV AL, OFFSET FIN_MSJ - OFFSET MSJ
        INT 7
        MOV AL, 0        ; el timer no vuelve a 0 solo
        OUT CONT, AL
        MOV AL, EOI
        OUT PIC, AL
        IRET

        ORG 2000H
        CLI
        MOV AL, 11111101B  ; sólo INT1 (timer)
        OUT IMR, AL
        MOV AL, ID_TIMER
        OUT INT1, AL
        MOV AL, 5
        OUT COMP, AL
        MOV AL, 0
        OUT CONT, AL
        STI
LAZO:   JMP LAZO
        END
