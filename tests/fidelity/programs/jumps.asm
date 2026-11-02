; JMP and every conditional jump, taken and not taken. Each taken jump adds
; a bit to DX; the not taken ones fall through to INC CX.
        ORG 2000H
        MOV DX, 0
        MOV CX, 0
        MOV AL, 0
        ADD AL, 0          ; Z, P
        JZ T1
        INC CX
T1:     OR DX, 1
        JNZ N1             ; Z is still 0 after OR: taken
        INC CX
N1:     MOV AL, 1
        ADD AL, 0          ; NZ
        JZ T2              ; not taken
        INC CX
T2:     JNZ T3
        INC CX
T3:     OR DX, 2
        MOV AL, 80H
        ADD AL, 0          ; S
        JS T4
        INC CX
T4:     JNS T5             ; not taken
        OR DX, 4
T5:     MOV AL, 0FFH
        ADD AL, 1          ; C
        JC T6
        INC CX
T6:     JNC T7             ; not taken
        OR DX, 8
T7:     MOV AL, 7FH
        ADD AL, 1          ; O
        JO T8
        INC CX
T8:     JNO T9             ; not taken
        OR DX, 10H
T9:     MOV AL, 1
        ADD AL, 1          ; no O, no C, no S
        JNO T10
        INC CX
T10:    JNC T11
        INC CX
T11:    JNS T12
        INC CX
T12:    JMP FIN
        INC CX
        INC CX
FIN:    INT 0
        END
