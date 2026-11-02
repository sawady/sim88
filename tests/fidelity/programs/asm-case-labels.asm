;; run: no
; Are names case sensitive? The label is defined in lower case.
        ORG 1000H
dato    DB 5
        ORG 2000H
lazo:   MOV AL, DATO
        DEC AL
        JNZ LAZO
        INT 0
        END
