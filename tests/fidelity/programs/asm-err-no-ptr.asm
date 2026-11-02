;; run: no
; Immediate to memory through BX needs PTR.
        ORG 2000H
        MOV [BX], 5
        END
