;; config: 2
; Configuration 2: print "HOLA" through the HAND, polling BUSY.
        ORG 1000H
MSG     DB "HOLA"
        ORG 2000H
        IN AL, 41H
        AND AL, 7FH
        OUT 41H, AL         ; no interrupts
        MOV BX, OFFSET MSG
        MOV CL, 4
LAZO:   IN AL, 41H
        AND AL, 1
        JNZ LAZO
        MOV AL, [BX]
        OUT 40H, AL
        INC BX
        DEC CL
        JNZ LAZO
        IN AL, 41H
        MOV DL, AL
        INT 0
        END
