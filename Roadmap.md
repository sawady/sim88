GENERAL
---

- registros de 8 bits (AH, AL, BH, BL...)
- ALU de 16 bits capaz de ejecutar las operaciones: ADC, SUB, AND, OR, XOR, NOT, INC y DEC
- Registro de indicadores con los flags de: Cero, Paridad, Paridad Auxiliar, Signo, Overflow, e indicador de interrupciones
- Registros contador de programa (IP, requiere programa cargado en memoria) y puntero de pila (SP) de 16 bits
- periféricos PIC y Timer
- impresora con Interfaz Centronics
- dispositivo que hace handshaking
- CDMA conectado al Hand y a los buses del sistema
- Modos de direccionamiento Dato Inmediato, Registro, Relativo a contador de programa, Relativo a pila, Directo e Indirecto basado en el registro BX
- Declaración de variables (DB y DW)
- Declaración de Constantes (EQU)
- Tablas (tabla DB 1, 2, 4, 8, 16, 32, 64, 128)
- Strings (string DB “un mensaje”)
- ORG

MODOS DE DIRECCIONAMIENTO
---

- Las operaciones se hacen entre registros, registros y memoria, datos inmediatos y registros, o entre datos inmediatos y memoria, pero nunca entre memoria y memoria.
- Direccionamiento inmediato: operando es un dato contenido en la instrucción.
- Direccionamiento directo: en la instrucción se indica la dirección de memoria en la que está el operando. Si este ocupa varias posiciones, figurará la dirección más baja.
- Direccionamiento indirecto a través del registro BX: la dirección de memoria donde está el operando viene determinada por el contenido del registro BX.
- Direccionamiento relativo a contador de programa: se utiliza en las instrucciones de salto condicional, donde la dirección de salto se obtiene sumando al registro IP el desplazamiento contenido en instrucción.

TIPOS DE INSTRUCCIONES
---

- Instrucciones de transferencia de datos: MOV.
```
var_byte DB 20h
var_word DW ?
MOV AX, 1000h
MOV BX, AX
MOV BL, var_byte
MOV var_word, BX
```
- Instrucciones aritmético-lógicas:
     * Instrucciones aritméticas: ADD, ADC, SUB, SBB.
     * Instrucciones lógicas: AND, OR, XOR, NEG, NOT.
- Instrucciones de comparación: CMP.
- Instrucciones de incremento/decremento: INC, DEC.
- Instrucciones de manejo de la Pila: PUSH, POP, PUSHF, POPF.
- Instrucciones de cambio de flujo de programa:
    * Instrucciones de salto incondicional: JMP.
    * Instrucciones de salto condicional: JZ, JNZ, JS, JNS, JC, JNC, JO, JNO.
    * Instrucciones asociadas a subrutinas: CALL, RET.
- Instrucciones de gestión de las Interrupciones: INT, IRET, STI, CLI.
- Instrucciones de control: NOP, HLT.
- Instrucciones de entrada/salida: IN, OUT.

ORGANIZACIÓN DE LA MEMORIA
-----------------------------------------

Posee 64 Kbytes direccionados linealmente. El usuario tiene a su disposición, un total de 32
Kbytes (desde la posición 0000H hasta la 7FFFH), estando los 32 Kbytes de memoria alta ocupados por
el programa monitor (sistema operativo). En el primer Kbyte se encuentra la tabla de vectores de
interrupción.

INTERRUPCIONES
---
- Hardware: Líneas INT y NMI. Conectadas a distintos periféricos en función de la configuración.
- Software: Instrucción INT xx.
- Tabla de vectores de interrupción Nexo de unión entre un tipo de interrupción (0...255) y el procedimiento la atenderá. Cada interrupción tiene un código que la identifica para la CPU. Existen por lo tanto 256 entradas en la tabla.
- Cada entrada de la tabla es una doble palabra (4 bytes) que contiene la dirección del procedimiento que dará servicio al tipo de interrupción correspondiente. Las 256 posibles interrupciones, correspondientes a los códigos del 0 al 0FFH, están organizadas en la siguiente forma:
- Cuatro interrupciones software que ocupan las posiciones correspondientes a los tipos
  - TIPO 0: Finaliza la ejecución de un programa.
  - TIPO 3: Sirve para poner puntos de parada.
  - TIPO 6: Espera leer un carácter del teclado y lo almacena en la posición de memoria cuya dirección se indica en BX.
  - TIPO 7: Escribe en la pantalla de comandos un bloque de datos. La dirección de comienzo del bloque se deberá cargar en el registro BX, y el número de datos que componen el bloque en el registro AL.
  - 251 interrupciones libres para ser utilizadas por el usuario.

PERIFERICOS
---

Externos
- Pantalla (del ordenador donde se ejecuta).
- Unidades de disco (del ordenador donde se ejecuta).
- Teclado (del ordenador donde se ejecuta).
- Barra de LEDS.
- Barra de Microconmutadores.
- Impresora.

Internos
- PIO: Puertos paralelo de entrada/salida.
- HAND-SHAKE: Periférico de Handshaking.
- PIC: Controlador de interrupciones.
- TIMER: Contador de eventos.
- CDMA: Controlador de Acceso directo a memoria.