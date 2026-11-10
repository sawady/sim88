;; config: 1
;; paper: yes
;; timeout: 6
; Which edge of STROBE takes the character: PB changes while STROBE is 1, and
; again after it falls. The paper shows "A" for the rising edge, "B" for the
; falling one.
        ORG 2000H
        MOV AL, 11111101B
        OUT 32H, AL
        MOV AL, 0
        OUT 33H, AL
        OUT 30H, AL
        MOV AL, 41H
        OUT 31H, AL
        MOV AL, 2
        OUT 30H, AL
        MOV AL, 42H
        OUT 31H, AL
        MOV AL, 0
        OUT 30H, AL
        MOV AL, 43H
        OUT 31H, AL
        HLT
        END
