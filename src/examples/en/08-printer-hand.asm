; configuration: 2
; Printer through the HAND, with interrupts: the HAND requests INT2 every time
; the printer can take a character.

PIC     EQU 20H
EOI     EQU 20H
IMR     EQU 21H
INT2    EQU 26H
DATA    EQU 40H
STATE   EQU 41H
ID_HAND EQU 10

        ORG 40
        DW PRINT

        ORG 1000H
MSG     DB "HELLO WORLD"
MSG_END DB ?

        ORG 3000H
PRINT:  MOV AL, [BX]
        OUT DATA, AL
        INC BX
        CMP BX, OFFSET MSG_END
        JNZ GO_ON
        IN AL, STATE     ; last character: no more interrupts
        AND AL, 7FH
        OUT STATE, AL
        MOV CL, 1
GO_ON:  MOV AL, EOI
        OUT PIC, AL
        IRET

        ORG 2000H
        CLI
        MOV AL, 11111011B  ; only INT2
        OUT IMR, AL
        MOV AL, ID_HAND
        OUT INT2, AL
        MOV BX, OFFSET MSG
        MOV CL, 0
        IN AL, STATE
        OR AL, 80H         ; the HAND interrupts
        OUT STATE, AL
        STI
WAIT:   CMP CL, 1
        JNZ WAIT
        INT 0
        END
