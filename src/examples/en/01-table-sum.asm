; Adds up the elements of a table (a typical MSX88 program)
; Data at 1000h, code at 2000h.

        ORG 1000H
TABLE   DB 1, 2, 3, 4, 5
COUNT   DB 5
TOTAL   DB ?

        ORG 2000H
        MOV AL, 0
        MOV CL, COUNT
        MOV BX, OFFSET TABLE
AGAIN:  ADD AL, [BX]
        INC BX
        DEC CL
        JNZ AGAIN
        MOV TOTAL, AL
        HLT
        END
