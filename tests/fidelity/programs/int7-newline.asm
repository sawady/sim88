; INT 7 with CR and LF in the data: does the console start a new line?
        ORG 1000H
TXT     DB "UNO", 0DH, 0AH, "DOS", 0AH, "TRES", 0DH, "CUATRO"
FIN     DB ?
        ORG 2000H
        MOV BX, OFFSET TXT
        MOV AL, OFFSET FIN - OFFSET TXT
        INT 7
        INT 0
        END
