;; run: no
; Memory to memory moves do not exist.
        ORG 1000H
B1      DB 1
B2      DB 2
        ORG 2000H
        MOV B1, B2
        END
