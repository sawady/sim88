; INT 7 with 70 characters: where the command window wraps the line.
        ORG 1000H
TXT     DB "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwx"
FIN     DB ?
        ORG 2000H
        MOV BX, OFFSET TXT
        MOV AL, OFFSET FIN - OFFSET TXT
        INT 7
        INT 0
        END
