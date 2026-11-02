; ADD and ADC on 16 bits (registers and memory) at the flag edges.
        ORG 1000H
W1      DW 7FFFH
W2      DW 0FFFFH
W3      DW 1234H
        ORG 2000H
        MOV AX, 7FFFH
        ADD AX, 1          ; 8000h: O, S, A
        PUSHF
        PUSH AX
        MOV AX, 0FFFFH
        ADD AX, 1          ; 0000h: C, Z, A, P
        PUSHF
        PUSH AX
        MOV BX, 8000H
        MOV CX, 8000H
        ADD BX, CX         ; 0000h: C, O, Z, P
        PUSHF
        PUSH BX
        MOV DX, 00FFH
        ADD DX, 1          ; 0100h: A, P (low byte 00h)
        PUSHF
        PUSH DX
        ADD W1, 1          ; memory: 8000h
        PUSHF
        MOV AX, W2
        ADD AX, W3         ; FFFFh + 1234h = 1233h, C
        PUSHF
        PUSH AX
        ADC W3, 0          ; 1234h + C = 1235h
        PUSHF
        MOV CX, 0FFFFH
        ADD CX, 1          ; sets C
        MOV CX, 7FFFH
        ADC CX, 0          ; 8000h: O, S
        PUSHF
        PUSH CX
        INT 0
        END
