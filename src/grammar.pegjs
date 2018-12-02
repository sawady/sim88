// SIM88 Grammar
// ==========================

{
  function sign(negs) {
    return negs.length % 2 == 0 ? 1 : -1;
  }

  function makeInteger(ns, negs, hexa) {
    var n = parseInt(ns.join(""), 10);
    if(hexa && n >= 10000) expected('number < 9999H')
    if(!hexa && n >= 65536) expected('number < 65536')
    return n * sign(negs);
  }
}

PROGRAM
  = sts:(_ STATEMENT __ COMMENT* __ ENDLINE _)+ END .* 
    { return sts.map(function(x) { return x[1] }).filter(function(x) { return x !== null; } ) }

STATEMENT =
  op:BINOP _ p1:PARAM _ "," _ p2:PARAM  { return { type: op, p1: p1, p2: p2 } }
  / op:UNOP _ p1:PARAM { return { type: op, p1: p1 } }
  / op:ZOP { return { type: op } }
  / op:JMP _ label:LABEL { return { type: op, label: label } }
  / COMMENT { return null }

COMMENT = ';' ([^\n]*)

BINOP
  = op:(
      "MOV"i 
    / "ADD"i
    / "ADC"i
    / "SUB"i
    / "SBB"i
    / "CMP"i
    / "AND"i
    / "OR"i
    / "XOR"i
    )
    { return op.toLowerCase() } 
  
UNOP
  = op:(
      "NEG"i
    / "DEC"i
    / "INC"i
    / "PUSH"i
    / "POP"i
    ) 
    { return op.toLowerCase() }
  
ZOP
  = op:(
      "PUSHF"i
    / "POPF"i
    / "RET"i
    / "CLI"i
    / "STI"i
    / "NOP"i
    / "HLT"i
    ) { return op.toLowerCase() }

JMP
  = op:(
      "CALL"i
     / "JZ"i
     / "JNZ"i
     / "JS"i
     / "JNS"i
     / "JC"i
     / "JNC"i
     / "JO"i
     / "JNO"i
     / "JMP"i
     )
     { return op.toLowerCase() }
  
LABEL
  = ":" label:([a-z]+) { return label.join('') }

PARAM "param"
  = HEXA / DECIMAL / REG

REG "register"
  = reg:("AX"i / "BX"i / "CX"i / "DX"i / "AL"i / "AH"i / "BL"i / "BH"i / "CL"i / "CH"i / "DL"i / "DH"i) { return { type: 'reg', value: reg } } 

HEXA "hexadecimal"
  = negs:("-"*) ns:([0-9]+) "H"i { return { type: 'hexadecimal', value: makeInteger(ns, negs, true) } }

DECIMAL "decimal"
  = negs:("-"*) ns:([0-9]+) { return { type: 'decimal', value: makeInteger(ns, negs, false) } }

ENDLINE "end of line"
  = "\n"

END
  = "END"i

_ "whitespace"
  = [ \t\n\r]*

__ ""
  = [ \t]*
