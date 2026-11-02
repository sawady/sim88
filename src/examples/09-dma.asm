; conexionado: 3
; CDMA: copia un bloque de memoria a memoria sin la CPU, y avisa al
; terminar con INT3 del PIC.

PIC     EQU 20H
EOI     EQU 20H
IMR     EQU 21H
INT3    EQU 27H
RFL     EQU 50H
RFH     EQU 51H
CONTL   EQU 52H
CONTH   EQU 53H
RDL     EQU 54H
RDH     EQU 55H
CTRL    EQU 56H
ARRANQUE EQU 57H
ID_DMA  EQU 20

        ORG 80
        DW FIN_DMA

        ORG 1000H
ORIGEN  DB "COPIADO POR DMA"
FIN     DB ?

        ORG 1100H
DESTINO DB 15 DUP (0)

        ORG 3000H
FIN_DMA: MOV DL, 1
        MOV AL, EOI
        OUT PIC, AL
        IRET

        ORG 2000H
        CLI
        MOV AL, 11110111B  ; sólo INT3
        OUT IMR, AL
        MOV AL, ID_DMA
        OUT INT3, AL
        MOV AX, OFFSET ORIGEN
        OUT RFL, AL
        MOV AL, AH
        OUT RFH, AL
        MOV AX, OFFSET DESTINO
        OUT RDL, AL
        MOV AL, AH
        OUT RDH, AL
        MOV AL, OFFSET FIN - OFFSET ORIGEN
        OUT CONTL, AL
        MOV AL, 0
        OUT CONTH, AL
        MOV AL, 00001010B  ; bloque, memoria a memoria
        OUT CTRL, AL
        MOV DL, 0
        STI
        OUT ARRANQUE, AL
ESPERA: CMP DL, 1
        JNZ ESPERA
        MOV BX, OFFSET DESTINO
        MOV AL, OFFSET FIN - OFFSET ORIGEN
        INT 7
        INT 0
        END
