; conexionado: 1
; Impresora por el PIO, por consulta de estado:
; PA0 = BUSY (entrada), PA1 = STROBE (salida), PB = dato.

PA      EQU 30H
PB      EQU 31H
CA      EQU 32H
CB      EQU 33H

        ORG 1000H
MSJ     DB "ARQUITECTURA"
FIN     DB ?

        ORG 2000H
        MOV AL, 11111101B  ; PA1 (strobe) salida, el resto entradas
        OUT CA, AL
        MOV AL, 0          ; PB: salidas
        OUT CB, AL
        IN AL, PA
        AND AL, 11111101B  ; strobe = 0
        OUT PA, AL
        MOV BX, OFFSET MSJ
        MOV CL, OFFSET FIN - OFFSET MSJ
POLL:   IN AL, PA
        AND AL, 1          ; ¿impresora ocupada?
        JNZ POLL
        MOV AL, [BX]
        OUT PB, AL
        IN AL, PA
        OR AL, 00000010B   ; strobe = 1: la impresora toma el dato
        OUT PA, AL
        IN AL, PA
        AND AL, 11111101B  ; strobe = 0
        OUT PA, AL
        INC BX
        DEC CL
        JNZ POLL
        INT 0
        END
