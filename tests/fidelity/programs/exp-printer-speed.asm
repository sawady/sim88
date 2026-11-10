;; compare: no
;; config: 2
;; timeout: 60
; Experiment (not compared): fill the HAND printer's buffer (BUSY = 1), then
; count loop turns (4 instructions each) until BUSY goes to 0, send one more
; character to fill it again, and repeat 8 times. The counts tell how fast
; MSX88 prints, in instructions, and whether it is always the same.
        ORG 1000H
T       DW 8 DUP (0)
        ORG 2000H
        MOV AL, 0
        OUT 41H, AL
        MOV AL, 41H
        OUT 40H, AL
        OUT 40H, AL
        OUT 40H, AL
        OUT 40H, AL
        MOV BX, OFFSET T
        MOV CL, 8
OTRO:   MOV DX, 0
ESPERA: INC DX
        IN AL, 41H
        AND AL, 1
        JNZ ESPERA
        MOV [BX], DX
        ADD BX, 2
        MOV AL, 42H
        OUT 40H, AL
        DEC CL
        JNZ OTRO
        INT 0
        END
