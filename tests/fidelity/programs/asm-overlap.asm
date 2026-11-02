;; run: no
; Two ORG blocks that overlap.
        ORG 2000H
        MOV AX, 1
        MOV BX, 2
        ORG 2002H
        INT 0
        END
