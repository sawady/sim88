; Pantalla y teclado: INT 7 escribe AL caracteres desde BX,
; INT 6 espera una tecla y la guarda en la dirección de BX.

        ORG 1000H
MSJ     DB "Escriba una letra: "
FIN_MSJ DB ?
LETRA   DB ?

        ORG 2000H
        MOV BX, OFFSET MSJ
        MOV AL, OFFSET FIN_MSJ - OFFSET MSJ
        INT 7
        MOV BX, OFFSET LETRA
        INT 6            ; espera la tecla (no la muestra)
        MOV AL, 1
        INT 7            ; la muestra
        INT 0
        END
