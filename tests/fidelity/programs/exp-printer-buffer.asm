;; compare: no
;; config: 2
; Experiment (not compared): send 7 characters to the HAND without waiting
; and read its status after each one: when does BUSY go to 1?
        ORG 1000H
EST     DB 7 DUP (0)
        ORG 2000H
        MOV AL, 0
        OUT 41H, AL
        MOV BX, OFFSET EST
        MOV AL, 41H
        OUT 40H, AL
        IN AL, 41H
        MOV [BX], AL
        INC BX
        MOV AL, 42H
        OUT 40H, AL
        IN AL, 41H
        MOV [BX], AL
        INC BX
        MOV AL, 43H
        OUT 40H, AL
        IN AL, 41H
        MOV [BX], AL
        INC BX
        MOV AL, 44H
        OUT 40H, AL
        IN AL, 41H
        MOV [BX], AL
        INC BX
        MOV AL, 45H
        OUT 40H, AL
        IN AL, 41H
        MOV [BX], AL
        INC BX
        MOV AL, 46H
        OUT 40H, AL
        IN AL, 41H
        MOV [BX], AL
        INC BX
        MOV AL, 47H
        OUT 40H, AL
        IN AL, 41H
        MOV [BX], AL
        INC BX
        INT 0
        END
