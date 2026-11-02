; Configuration 0: the value of every port after a reset (timer, PIC, PIO)
; and of ports with nothing connected. Each IN goes to a table.
        ORG 1000H
TABLA   DB 24 DUP (0)
        ORG 2000H
        MOV BX, OFFSET TABLA
        IN AL, 10H
        MOV [BX], AL
        INC BX
        IN AL, 11H
        MOV [BX], AL
        INC BX
        IN AL, 21H
        MOV [BX], AL
        INC BX
        IN AL, 22H
        MOV [BX], AL
        INC BX
        IN AL, 23H
        MOV [BX], AL
        INC BX
        IN AL, 24H
        MOV [BX], AL
        INC BX
        IN AL, 25H
        MOV [BX], AL
        INC BX
        IN AL, 26H
        MOV [BX], AL
        INC BX
        IN AL, 27H
        MOV [BX], AL
        INC BX
        IN AL, 28H
        MOV [BX], AL
        INC BX
        IN AL, 2BH
        MOV [BX], AL
        INC BX
        IN AL, 30H
        MOV [BX], AL
        INC BX
        IN AL, 31H
        MOV [BX], AL
        INC BX
        IN AL, 32H
        MOV [BX], AL
        INC BX
        IN AL, 33H
        MOV [BX], AL
        INC BX
        IN AL, 40H          ; HAND: not connected in configuration 0
        MOV [BX], AL
        INC BX
        IN AL, 50H          ; CDMA: not connected in configuration 0
        MOV [BX], AL
        INC BX
        IN AL, 0F0H         ; nothing
        MOV [BX], AL
        INC BX
        IN AX, 30H          ; 16 bit IN: PA and PB
        MOV [BX], AX
        INT 0
        END
