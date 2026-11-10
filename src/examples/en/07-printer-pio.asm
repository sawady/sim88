; configuration: 1
; Printer through the PIO, by polling its status:
; PA0 = BUSY (input), PA1 = STROBE (output), PB = data.

PA      EQU 30H
PB      EQU 31H
CA      EQU 32H
CB      EQU 33H

        ORG 1000H
MSG     DB "ARCHITECTURE"
MSG_END DB ?

        ORG 2000H
        MOV AL, 11111101B  ; PA1 (strobe) output, the others inputs
        OUT CA, AL
        MOV AL, 0          ; PB: outputs
        OUT CB, AL
        IN AL, PA
        AND AL, 11111101B  ; strobe = 0
        OUT PA, AL
        MOV BX, OFFSET MSG
        MOV CL, OFFSET MSG_END - OFFSET MSG
POLL:   IN AL, PA
        AND AL, 1          ; is the printer busy?
        JNZ POLL
        MOV AL, [BX]
        OUT PB, AL
        IN AL, PA
        OR AL, 00000010B   ; strobe = 1: the printer takes the data
        OUT PA, AL
        IN AL, PA
        AND AL, 11111101B  ; strobe = 0
        OUT PA, AL
        INC BX
        DEC CL
        JNZ POLL
        INT 0
        END
