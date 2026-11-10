;; config: 2
;; paper: yes
;; timeout: 30
; The printer through the HAND, by interrupts: the HAND asks for INT2 while
; the printer can take a character (level triggered: the next request comes
; after the EOI), and the program stops asking at the last character.
        ORG 40
        DW RUT
        ORG 1000H
MSG     DB "HOLA MUNDO"
FIN     DB ?
        ORG 3000H
RUT:    MOV AL, [BX]
        OUT 40H, AL
        INC BX
        CMP BX, OFFSET FIN
        JNZ SIGUE
        IN AL, 41H
        AND AL, 7FH
        OUT 41H, AL
        MOV CL, 1
SIGUE:  MOV AL, 20H
        OUT 20H, AL
        IRET
        ORG 2000H
        CLI
        MOV AL, 11111011B
        OUT 21H, AL
        MOV AL, 10
        OUT 26H, AL
        MOV BX, OFFSET MSG
        MOV CL, 0
        IN AL, 41H
        OR AL, 80H
        OUT 41H, AL
        STI
ESPERA: CMP CL, 1
        JNZ ESPERA
        ; what the interrupts left in the stack depends on when they came
        MOV BX, 7FFEH
        MOV WORD PTR [BX], 0
        MOV BX, 7FFCH
        MOV WORD PTR [BX], 0
        HLT
        END
