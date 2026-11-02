;; sim88: pulse/2000
;; ignore: IP
;; timeout: 14
; Timer with COMP = 2 and INT1 -> vector 11h. The routine keeps the value of
; CONT it sees and does not write CONT: does the timer start again by itself?
        ORG 1000H
VALORES DB 4 DUP (0)
N       DB 0
        ORG 44H
        DW RUT
        ORG 3000H
RUT:    PUSH AX
        PUSH BX
        IN AL, 10H
        MOV BX, OFFSET VALORES
        ADD BL, N
        MOV [BX], AL
        INC N
        MOV AL, 20H
        OUT 20H, AL
        POP BX
        POP AX
        IRET
        ORG 2000H
        CLI
        MOV AL, 11H
        OUT 25H, AL         ; INT1 -> vector 11h
        MOV AL, 0FDH
        OUT 21H, AL         ; only INT1
        MOV AL, 2
        OUT 11H, AL         ; COMP
        MOV AL, 0
        OUT 10H, AL         ; CONT
        STI
LAZO:   CMP N, 2
        JNZ LAZO
        IN AL, 10H
        MOV CL, AL
        INT 0
        END
