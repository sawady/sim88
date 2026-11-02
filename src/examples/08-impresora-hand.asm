; conexionado: 2
; Impresora por el HAND, con interrupciones: el HAND pide INT2 cada vez que
; la impresora puede recibir un carácter.

PIC     EQU 20H
EOI     EQU 20H
IMR     EQU 21H
INT2    EQU 26H
DATO    EQU 40H
ESTADO  EQU 41H
ID_HAND EQU 10

        ORG 40
        DW IMPRIMIR

        ORG 1000H
MSJ     DB "HOLA MUNDO"
FIN     DB ?

        ORG 3000H
IMPRIMIR: MOV AL, [BX]
        OUT DATO, AL
        INC BX
        CMP BX, OFFSET FIN
        JNZ SEGUIR
        IN AL, ESTADO    ; último carácter: sin más interrupciones
        AND AL, 7FH
        OUT ESTADO, AL
        MOV CL, 1
SEGUIR: MOV AL, EOI
        OUT PIC, AL
        IRET

        ORG 2000H
        CLI
        MOV AL, 11111011B  ; sólo INT2
        OUT IMR, AL
        MOV AL, ID_HAND
        OUT INT2, AL
        MOV BX, OFFSET MSJ
        MOV CL, 0
        IN AL, ESTADO
        OR AL, 80H         ; el HAND interrumpe
        OUT ESTADO, AL
        STI
ESPERA: CMP CL, 1
        JNZ ESPERA
        INT 0
        END
