; INT 7 with AL = 0 writes nothing; registers and flags survive INT 7.
        ORG 1000H
TXT     DB "NO"
        ORG 2000H
        MOV AL, 0FFH
        ADD AL, 1          ; C, Z, A, P
        MOV BX, OFFSET TXT
        MOV AL, 0
        MOV CX, 1234H
        INT 7
        PUSHF
        INT 0
        END
