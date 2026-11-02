;; timeout: 4
; 8A 47 02 is MOV AL, [BX+2] on an 8086: does MSX88 run it?
        ORG 1000H
T       DB 1, 2, 3
        ORG 2000H
        MOV BX, OFFSET T
        DB 8AH, 47H, 02H
        INT 0
        END
