; configuration: 3
; CDMA: copies a block of memory to memory without the CPU, and signals the
; end with INT3 of the PIC.

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
START   EQU 57H
ID_DMA  EQU 20

        ORG 80
        DW DMA_ISR

        ORG 1000H
SOURCE  DB "COPIED WITH DMA"
SRC_END DB ?

        ORG 1100H
TARGET  DB 15 DUP (0)

        ORG 3000H
DMA_ISR: MOV DL, 1
        MOV AL, EOI
        OUT PIC, AL
        IRET

        ORG 2000H
        CLI
        MOV AL, 11110111B  ; only INT3
        OUT IMR, AL
        MOV AL, ID_DMA
        OUT INT3, AL
        MOV AX, OFFSET SOURCE
        OUT RFL, AL
        MOV AL, AH
        OUT RFH, AL
        MOV AX, OFFSET TARGET
        OUT RDL, AL
        MOV AL, AH
        OUT RDH, AL
        MOV AL, OFFSET SRC_END - OFFSET SOURCE
        OUT CONTL, AL
        MOV AL, 0
        OUT CONTH, AL
        MOV AL, 00001010B  ; block, memory to memory
        OUT CTRL, AL
        MOV DL, 0
        STI
        OUT START, AL
WAIT:   CMP DL, 1
        JNZ WAIT
        MOV BX, OFFSET TARGET
        MOV AL, OFFSET SRC_END - OFFSET SOURCE
        INT 7
        INT 0
        END
