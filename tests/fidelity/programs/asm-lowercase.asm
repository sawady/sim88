;; run: no
; Lower case mnemonics, registers and directives.
        org 1000h
var     db 0ah
        org 2000h
        mov al, var
        mov bx, offset var
        add al, [bx]
        int 0
        end
