;; monitor: M 5A
; Configuration 0: switches (set to 5Ah from the monitor) on PA, LEDs on PB.
; Registers written and read back.
        ORG 2000H
        MOV AL, 0FFH
        OUT 32H, AL         ; CA: PA all input
        MOV AL, 0
        OUT 33H, AL         ; CB: PB all output
        IN AL, 30H          ; switches
        MOV BL, AL
        MOV AL, 0A5H
        OUT 31H, AL         ; LEDs
        IN AL, 31H
        MOV BH, AL
        IN AL, 32H
        MOV CL, AL
        IN AL, 33H
        MOV CH, AL
        MOV AL, 0F0H
        OUT 33H, AL         ; PB high nibble input, low nibble output
        MOV AL, 0FFH
        OUT 31H, AL
        IN AL, 31H
        MOV DL, AL
        INT 0
        END
