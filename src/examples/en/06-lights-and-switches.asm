; configuration: 0
; PIO: the switches (microswitches, on PA) are copied to the lights (LEDs, on PB).
; Try changing the switches with the mouse or with the keys 0 to 7.

PA      EQU 30H
PB      EQU 31H
CA      EQU 32H
CB      EQU 33H

        ORG 2000H
        MOV AL, 0FFH     ; PA: all inputs
        OUT CA, AL
        MOV AL, 0        ; PB: all outputs
        OUT CB, AL
AGAIN:  IN AL, PA
        OUT PB, AL
        JMP AGAIN
        END
