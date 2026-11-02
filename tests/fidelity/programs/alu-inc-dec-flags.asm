; INC and DEC with the flags all clear and all set before: what happens
; to C (the 8086 keeps it) and to the other flags.
        ORG 2000H
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 000H
        INC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 07FH
        INC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 080H
        INC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 0FFH
        INC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 00FH
        INC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 010H
        INC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CX, 00000H
        INC CX
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CX, 07FFFH
        INC CX
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CX, 0FFFFH
        INC CX
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CX, 000FFH
        INC CX
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 000H
        DEC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 07FH
        DEC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 080H
        DEC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 0FFH
        DEC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 00FH
        DEC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CL, 010H
        DEC CL
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CX, 00000H
        DEC CX
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CX, 07FFFH
        DEC CX
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CX, 0FFFFH
        DEC CX
        PUSHF
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV CX, 000FFH
        DEC CX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 000H
        INC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 07FH
        INC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 080H
        INC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 0FFH
        INC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 00FH
        INC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 010H
        INC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CX, 00000H
        INC CX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CX, 07FFFH
        INC CX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CX, 0FFFFH
        INC CX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CX, 000FFH
        INC CX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 000H
        DEC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 07FH
        DEC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 080H
        DEC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 0FFH
        DEC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 00FH
        DEC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CL, 010H
        DEC CL
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CX, 00000H
        DEC CX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CX, 07FFFH
        DEC CX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CX, 0FFFFH
        DEC CX
        PUSHF
        MOV AX, 008D5H
        PUSH AX
        POPF
        MOV CX, 000FFH
        DEC CX
        PUSHF
        INT 0
        END
