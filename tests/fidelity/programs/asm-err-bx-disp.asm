;; run: no
; [BX + displacement] is not an MSX88 addressing mode.
        ORG 2000H
        MOV AL, [BX + 2]
        END
