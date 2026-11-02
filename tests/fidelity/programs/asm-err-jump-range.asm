;; run: no
; A conditional jump farther than 127 bytes.
        ORG 2000H
        JZ LEJOS
        ORG 2100H
LEJOS:  INT 0
        END
