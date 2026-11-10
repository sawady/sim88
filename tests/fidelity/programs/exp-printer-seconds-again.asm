;; compare: no
;; config: 2
;; timeout: 90
; Experiment (not compared), a second run of exp-printer-seconds: exp-printer-speed with the timer at 1 Hz counting
; seconds (SEG). Fill the printer's buffer, then 8 times wait for BUSY = 0
; (counting loop turns in T) and send one more character. SEG over 8 is the
; time to print one character; T is how many instructions run meanwhile.
        ORG 1000H
T       DW 8 DUP (0)
SEG     DW 0
        ORG 44H
        DW RUT
        ORG 3000H
RUT:    PUSH AX
        MOV AX, SEG
        ADD AX, 1
        MOV SEG, AX
        MOV AL, 0
        OUT 10H, AL
        MOV AL, 20H
        OUT 20H, AL
        POP AX
        IRET
        ORG 2000H
        CLI
        MOV AL, 11H
        OUT 25H, AL
        MOV AL, 0FDH
        OUT 21H, AL
        MOV AL, 1
        OUT 11H, AL
        MOV AL, 0
        OUT 41H, AL
        MOV AL, 41H
        OUT 40H, AL
        OUT 40H, AL
        OUT 40H, AL
        OUT 40H, AL
        MOV AL, 0
        OUT 10H, AL
        MOV BX, OFFSET T
        MOV CL, 8
        STI
OTRO:   MOV DX, 0
ESPERA: INC DX
        IN AL, 41H
        AND AL, 1
        JNZ ESPERA
        MOV [BX], DX
        ADD BX, 2
        MOV AL, 42H
        OUT 40H, AL
        DEC CL
        JNZ OTRO
        CLI
        INT 0
        END
