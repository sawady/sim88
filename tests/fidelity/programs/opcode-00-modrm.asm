;; timeout: 4
; 00 07 is ADD [BX], AL: does MSX88 run it when written as bytes?
        ORG 1000H
B1      DB 1
        ORG 2000H
        MOV BX, OFFSET B1
        MOV AL, 2
        DB 0, 7
        INT 0
        END
