; conexionado: 0
; PIO: las llaves (microconmutadores, en PA) se copian a las luces (LEDs, en PB).
; Pruebe cambiar las llaves con el mouse o con las teclas 0 a 7.

PA      EQU 30H
PB      EQU 31H
CA      EQU 32H
CB      EQU 33H

        ORG 2000H
        MOV AL, 0FFH     ; PA: todas entradas
        OUT CA, AL
        MOV AL, 0        ; PB: todas salidas
        OUT CB, AL
LAZO:   IN AL, PA
        OUT PB, AL
        JMP LAZO
        END
