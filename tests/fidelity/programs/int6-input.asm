;; keys: 1.5:shift-a 1.5:b 1.5:ret
; INT 6 reads one key into [BX]: is it echoed? Three keys: 'A', 'b', Enter.
        ORG 1000H
TECLAS  DB 3 DUP (0)
        ORG 2000H
        MOV BX, OFFSET TECLAS
        INT 6
        INC BX
        INT 6
        INC BX
        INT 6
        MOV CX, BX
        INT 0
        END
