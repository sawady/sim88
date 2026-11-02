; ADC and SBB with C = 0 and C = 1 at the edges: result and flags of each
; case on the stack.
        ORG 2000H
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 0FFH
        ADC DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 0FFH
        ADC DL, 001H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 07FH
        ADC DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 000H
        ADC DL, 0FFH
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 080H
        ADC DL, 07FH
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 00FH
        ADC DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 0F0H
        ADC DL, 020H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 000H
        ADC DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DX, 0FFFFH
        ADC DX, 00000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DX, 07FFFH
        ADC DX, 00000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DX, 00000H
        ADC DX, 0FFFFH
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DX, 00000H
        ADC DX, 00000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 0FFH
        SBB DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 0FFH
        SBB DL, 001H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 07FH
        SBB DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 000H
        SBB DL, 0FFH
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 080H
        SBB DL, 07FH
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 00FH
        SBB DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 0F0H
        SBB DL, 020H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DL, 000H
        SBB DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DX, 0FFFFH
        SBB DX, 00000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DX, 07FFFH
        SBB DX, 00000H
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DX, 00000H
        SBB DX, 0FFFFH
        PUSHF
        PUSH DX
        MOV AX, 00000H
        PUSH AX
        POPF
        MOV DX, 00000H
        SBB DX, 00000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 0FFH
        ADC DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 0FFH
        ADC DL, 001H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 07FH
        ADC DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 000H
        ADC DL, 0FFH
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 080H
        ADC DL, 07FH
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 00FH
        ADC DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 0F0H
        ADC DL, 020H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 000H
        ADC DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DX, 0FFFFH
        ADC DX, 00000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DX, 07FFFH
        ADC DX, 00000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DX, 00000H
        ADC DX, 0FFFFH
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DX, 00000H
        ADC DX, 00000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 0FFH
        SBB DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 0FFH
        SBB DL, 001H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 07FH
        SBB DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 000H
        SBB DL, 0FFH
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 080H
        SBB DL, 07FH
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 00FH
        SBB DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 0F0H
        SBB DL, 020H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DL, 000H
        SBB DL, 000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DX, 0FFFFH
        SBB DX, 00000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DX, 07FFFH
        SBB DX, 00000H
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DX, 00000H
        SBB DX, 0FFFFH
        PUSHF
        PUSH DX
        MOV AX, 00001H
        PUSH AX
        POPF
        MOV DX, 00000H
        SBB DX, 00000H
        PUSHF
        PUSH DX
        INT 0
        END
