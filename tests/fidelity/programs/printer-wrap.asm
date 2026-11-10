;; config: 2
;; paper: yes
;; timeout: 75
; More characters than the 20 columns of the paper.
        ORG 1000H
MSG     DB "ABCDEFGHIJKLMNOPQRSTUVWXY"
FIN     DB ?
        ORG 2000H
        IN AL, 41H
        AND AL, 7FH
        OUT 41H, AL
        MOV BX, OFFSET MSG
        MOV CL, OFFSET FIN - OFFSET MSG
POLL:   IN AL, 41H
        AND AL, 1
        JNZ POLL
        MOV AL, [BX]
        OUT 40H, AL
        INC BX
        DEC CL
        JNZ POLL
        HLT
        END
