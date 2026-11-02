;; run: no
; Instructions of the 8086 that the SX88 does not have.
        ORG 2000H
        MUL BL
        SHL AL, 1
        LOOP 2000H
        XCHG AX, BX
        END
