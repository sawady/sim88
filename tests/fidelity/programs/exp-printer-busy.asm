;; compare: no
;; config: 2
; Experiment (not compared): BUSY of the HAND after sending one character,
; read 16 times in a row (one IN per few instructions).
        ORG 1000H
EST     DB 16 DUP (0)
        ORG 2000H
        MOV AL, 0
        OUT 41H, AL
        MOV AL, 41H
        OUT 40H, AL
        MOV BX, OFFSET EST
        MOV CL, 16
LAZO:   IN AL, 41H
        MOV [BX], AL
        INC BX
        DEC CL
        JNZ LAZO
        INT 0
        END
