; NOP: its encoding (the MSX88 manual gives 10011000) and that it runs.
        ORG 2000H
        MOV AX, 1
        NOP
        NOP
        MOV BX, 2
        INT 0
        END
