;; run: no
; How the listing shows DUP counts of 10 and 16.
        ORG 1000H
A       DB 10 DUP (1)
B       DB 16 DUP (2)
C       DW 3 DUP (1234H)
        ORG 2000H
        INT 0
        END
