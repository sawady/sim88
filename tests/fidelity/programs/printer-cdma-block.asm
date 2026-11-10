;; config: 3
;; paper: yes
;; timeout: 24
; The CDMA sends a block of memory to the printer through the HAND (DREQ is
; the HAND's INT line); TC asks for INT3 at the end.
        ORG 80
        DW FINDMA
        ORG 1000H
MSG     DB "POR DMA"
FIN     DB ?
        ORG 3000H
FINDMA: MOV DL, 1
        MOV AL, 20H
        OUT 20H, AL
        IRET
        ORG 2000H
        CLI
        MOV AL, 11110111B
        OUT 21H, AL
        MOV AL, 20
        OUT 27H, AL
        MOV AX, OFFSET MSG
        OUT 50H, AL
        MOV AL, AH
        OUT 51H, AL
        MOV AL, OFFSET FIN - OFFSET MSG
        OUT 52H, AL
        MOV AL, 0
        OUT 53H, AL
        MOV AL, 00001100B
        OUT 56H, AL
        IN AL, 41H
        OR AL, 80H
        OUT 41H, AL
        MOV DL, 0
        STI
        OUT 57H, AL
ESPERA: CMP DL, 1
        JNZ ESPERA
        ; what the interrupts left in the stack depends on when they came
        MOV BX, 7FFEH
        MOV WORD PTR [BX], 0
        MOV BX, 7FFCH
        MOV WORD PTR [BX], 0
        HLT
        END
