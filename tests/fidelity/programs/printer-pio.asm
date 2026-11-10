;; config: 1
;; paper: yes
;; timeout: 36
;; ignore: AX
; The printer through the PIO: PA0 is BUSY, PA1 STROBE, PB the data.
        ORG 1000H
MSG     DB "ARQUITECTURA"
FIN     DB ?
        ORG 2000H
        MOV AL, 11111101B
        OUT 32H, AL
        MOV AL, 0
        OUT 33H, AL
        IN AL, 30H
        AND AL, 11111101B
        OUT 30H, AL
        MOV BX, OFFSET MSG
        MOV CL, OFFSET FIN - OFFSET MSG
POLL:   IN AL, 30H
        AND AL, 1
        JNZ POLL
        MOV AL, [BX]
        OUT 31H, AL
        IN AL, 30H
        OR AL, 00000010B
        OUT 30H, AL
        IN AL, 30H
        AND AL, 11111101B
        OUT 30H, AL
        INC BX
        DEC CL
        JNZ POLL
        HLT
        END
