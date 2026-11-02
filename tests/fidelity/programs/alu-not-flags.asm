; NOT with the flags all clear and all set before, on registers and memory:
; which flags does MSX88's NOT change? (each PUSHF keeps them)
        ORG 1000H
M8      DB 0
        ORG 2000H
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV BL, 000H
        NOT BL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV BL, 0FFH
        NOT BL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV BL, 00FH
        NOT BL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV BL, 0F0H
        NOT BL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV BL, 080H
        NOT BL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV BL, 001H
        NOT BL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV BX, 00000H
        NOT BX
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV BX, 0FFFFH
        NOT BX
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV BX, 01234H
        NOT BX
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV BX, 08000H
        NOT BX
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV M8, 000H
        NOT M8
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV M8, 0F0H
        NOT M8
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV BL, 000H
        NOT BL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV BL, 0FFH
        NOT BL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV BL, 00FH
        NOT BL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV BL, 0F0H
        NOT BL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV BL, 080H
        NOT BL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV BL, 001H
        NOT BL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV BX, 00000H
        NOT BX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV BX, 0FFFFH
        NOT BX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV BX, 01234H
        NOT BX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV BX, 08000H
        NOT BX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV M8, 000H
        NOT M8
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV M8, 0F0H
        NOT M8
        PUSHF
        INT 0
        END
