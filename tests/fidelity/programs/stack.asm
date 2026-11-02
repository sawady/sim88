; PUSH, POP, PUSHF and POPF: SP moves by 2, words are little endian, POPF
; loads every flag bit from the stack.
        ORG 2000H
        MOV AX, 1122H
        MOV BX, 3344H
        MOV CX, 5566H
        MOV DX, 7788H
        PUSH AX
        PUSH BX
        PUSH CX
        PUSH DX
        POP AX
        POP BX
        POP CX
        POP DX
        MOV AX, 0FFFFH
        PUSH AX
        POPF               ; every flag bit set
        PUSHF
        POP CX             ; how much of FFFFh MSX88 keeps
        MOV AX, 0
        PUSH AX
        POPF               ; every flag cleared (I too)
        PUSHF
        POP DX
        PUSH SP
        POP AX
        INT 0
        END
