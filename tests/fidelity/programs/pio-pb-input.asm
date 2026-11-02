; Configuration 0: what IN returns for PB bits configured as inputs (the
; LEDs are outputs only): write 0Fh with CB = F0h (high nibble input).
        ORG 2000H
        MOV AL, 0F0H
        OUT 33H, AL
        MOV AL, 0FH
        OUT 31H, AL
        IN AL, 31H
        MOV BL, AL
        MOV AL, 0
        OUT 31H, AL
        IN AL, 31H
        MOV BH, AL
        MOV AL, 0FFH
        OUT 32H, AL
        MOV AL, 0AAH
        OUT 30H, AL         ; PA all input: the switches win?
        IN AL, 30H
        MOV CL, AL
        INT 0
        END
