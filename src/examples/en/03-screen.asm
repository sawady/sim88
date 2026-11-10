; Screen and keyboard: INT 7 writes AL characters starting at BX,
; INT 6 waits for a key and stores it at the address in BX.

        ORG 1000H
MSG     DB "Type a letter: "
MSG_END DB ?
LETTER  DB ?

        ORG 2000H
        MOV BX, OFFSET MSG
        MOV AL, OFFSET MSG_END - OFFSET MSG
        INT 7
        MOV BX, OFFSET LETTER
        INT 6            ; waits for the key (does not show it)
        MOV AL, 1
        INT 7            ; shows it
        INT 0
        END
