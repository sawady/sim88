;; config: 2
;; paper: yes
;; timeout: 60
; Ten lines: more than the 8 the paper window shows.
        ORG 1000H
MSG     DB "1", 10, "2", 10, "3", 10, "4", 10, "5", 10
        DB "6", 10, "7", 10, "8", 10, "9", 10, "A"
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
