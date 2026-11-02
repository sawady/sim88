; Interrupciones por hardware: cada vez que se pulsa F10, el PIC pide INT0
; y la rutina RUT_F10 cuenta las pulsaciones en DX.

PIC     EQU 20H
EOI     EQU 20H
IMR     EQU 21H
INT0    EQU 24H
ID_F10  EQU 10           ; tipo de interrupción: su vector está en 4 * 10 = 40

        ORG 40
        DW RUT_F10

        ORG 3000H
RUT_F10: INC DX
        MOV AL, EOI      ; fin de interrupción
        OUT PIC, AL
        IRET

        ORG 2000H
        CLI
        MOV AL, 11111110B  ; sólo INT0 habilitada
        OUT IMR, AL
        MOV AL, ID_F10
        OUT INT0, AL
        MOV DX, 0
        STI
LAZO:   JMP LAZO
        END
