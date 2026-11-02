; INT 7 writes AL bytes from the address in BX; two calls in a row.
        ORG 1000H
UNO     DB "ABC"
DOS     DB "xyz 123"
        ORG 2000H
        MOV BX, OFFSET UNO
        MOV AL, 3
        INT 7
        MOV BX, OFFSET DOS
        MOV AL, 7
        INT 7
        INT 0
        END
