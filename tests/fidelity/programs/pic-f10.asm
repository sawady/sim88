;; sim88: f10@2000 f10@4000
;; keys: 2:f10 2:f10
;; timeout: 12
; Configuration 0: F10 interrupts through INT0 of the PIC with vector 10h.
; The routine counts and keeps the PIC registers it sees.
        ORG 1000H
CUENTA  DB 0
EN_RUT  DB 0, 0, 0
        ORG 40H
        DW RUT
        ORG 3000H
RUT:    PUSH AX
        IN AL, 23H          ; ISR inside the routine
        MOV EN_RUT, AL
        IN AL, 22H          ; IRR
        MOV EN_RUT + 1, AL
        PUSHF
        POP AX
        MOV EN_RUT + 2, AH  ; flags inside (I?)
        INC CUENTA
        MOV AL, 20H
        OUT 20H, AL         ; EOI
        POP AX
        IRET
        ORG 2000H
        CLI
        MOV AL, 10H
        OUT 24H, AL         ; INT0 -> vector 10h
        MOV AL, 0FEH
        OUT 21H, AL         ; only INT0 unmasked
        STI
LAZO:   CMP CUENTA, 2
        JNZ LAZO
        IN AL, 21H
        MOV BL, AL
        IN AL, 22H
        MOV BH, AL
        IN AL, 23H
        MOV CL, AL
        INT 0
        END
