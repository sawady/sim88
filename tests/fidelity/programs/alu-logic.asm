; AND, OR, XOR and NOT: C and O cleared, Z S P from the result; NOT changes
; no flag. A first ADD leaves C, O and A set to see what the logic ops do to them.
        ORG 1000H
B1      DB 0F0H
W1      DW 0FF00H
        ORG 2000H
        MOV AL, 0FFH
        ADD AL, 81H        ; C, O? (FFh+81h = 80h): C, S, A
        MOV AL, 0F0H
        AND AL, 0FH        ; 00h
        PUSHF
        PUSH AX
        MOV AL, 7FH
        ADD AL, 1          ; O, S, A
        MOV AL, 0F0H
        OR AL, 0FH         ; FFh
        PUSHF
        PUSH AX
        MOV AL, 0AAH
        XOR AL, 0FFH       ; 55h
        PUSHF
        PUSH AX
        MOV AL, 81H
        XOR AL, 81H        ; 00h
        PUSHF
        PUSH AX
        MOV AX, 1234H
        NOT AX             ; EDCBh, flags unchanged
        PUSHF
        PUSH AX
        NOT B1             ; 0Fh
        PUSHF
        AND W1, 0F0FH      ; 0F00h
        PUSHF
        MOV BX, 0F000H
        OR BX, W1          ; FF00h
        PUSHF
        PUSH BX
        MOV CL, 3
        XOR CL, B1         ; 0Ch
        PUSHF
        PUSH CX
        INT 0
        END
