;; config: 3
; Configuration 3: CDMA memory to memory in block mode, started with OUT 57h.
; The PIC is masked so TC does not interrupt.
        ORG 1000H
SRC     DB "ABCDEFGH"
DST     DB 8 DUP (0)
        ORG 2000H
        MOV AL, 0FFH
        OUT 21H, AL
        MOV AX, OFFSET SRC
        OUT 50H, AL
        MOV AL, AH
        OUT 51H, AL
        MOV AX, OFFSET DST
        OUT 54H, AL
        MOV AL, AH
        OUT 55H, AL
        MOV AL, 8
        OUT 52H, AL
        MOV AL, 0
        OUT 53H, AL
        MOV AL, 0AH         ; TT = 1 (memory to memory), MT = 1 (block)
        OUT 56H, AL
        OUT 57H, AL
        IN AL, 56H
        MOV CL, AL          ; CTRL right after starting
        NOP
        NOP
        NOP
        NOP
        NOP
        NOP
        NOP
        NOP
        NOP
        NOP
        IN AL, 56H
        MOV CH, AL          ; CTRL later (TC?)
        IN AL, 52H
        MOV DL, AL          ; CONT
        IN AL, 50H
        MOV DH, AL          ; RF low
        INT 0
        END
