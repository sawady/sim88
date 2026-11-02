;; config: 3
; Configuration 3: HAND and CDMA registers after a reset (57h is not read,
; it may start a transfer).
        ORG 1000H
TABLA   DB 12 DUP (0)
        ORG 2000H
        MOV BX, OFFSET TABLA
        IN AL, 40H
        MOV [BX], AL
        INC BX
        IN AL, 41H
        MOV [BX], AL
        INC BX
        IN AL, 50H
        MOV [BX], AL
        INC BX
        IN AL, 51H
        MOV [BX], AL
        INC BX
        IN AL, 52H
        MOV [BX], AL
        INC BX
        IN AL, 53H
        MOV [BX], AL
        INC BX
        IN AL, 54H
        MOV [BX], AL
        INC BX
        IN AL, 55H
        MOV [BX], AL
        INC BX
        IN AL, 56H
        MOV [BX], AL
        INC BX
        IN AL, 30H          ; PIO: not connected in configuration 3
        MOV [BX], AL
        INT 0
        END
