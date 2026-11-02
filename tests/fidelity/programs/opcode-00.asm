;; timeout: 4
; Running the byte 00h (on an 8086, ADD [BX+SI], AL).
        ORG 2000H
        MOV AX, 1
        DB 0, 0
        MOV AX, 2
        INT 0
        END
