;; timeout: 4
; 8A 04 is MOV AL, [SI] on an 8086 (the SX88 has no SI): does MSX88 run it?
        ORG 2000H
        MOV AL, 5
        DB 8AH, 04H
        INT 0
        END
