;; run: no
; DUP without a count.
        ORG 1000H
T       DB DUP (2, 4)
        ORG 2000H
        INT 0
        END
