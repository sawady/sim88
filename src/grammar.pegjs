// SIM88 Grammar
// ==========================

{
  function isNegative(neg) {
    return neg === "-" ? -1 : 1;
  }

  function makeInteger(ns, neg, hexa) {
    var negative = isNegative(neg);
    var n = hexa ?
       parseInt(ns.join(""), 16) :
       parseInt(ns.join(""), 10);
    if(hexa && n >= 32768) expected('number < 7FFFH')
    return n * isNegative(neg);
  }
  
  function line() {
  	return location().start.line;
  }
}

PROGRAM
  = sts:(_ STATEMENT __ COMMENT* __ ENDLINE _)+ e:END .* 
    { return sts.map(function(x) { return x[1] }).filter(function(x) { return x !== null; } ).concat(e) }

STATEMENT =
  op:BINOP _ p1:PARAM1 _ "," _ p2:PARAM2 { return { line: line(), type: op, p1: p1, p2: p2, group: 'binary' } }
  / op:UNOP _ p1:PARAM1 { return { line: line(), type: op, p1: p1, group: 'unary' } }
  / op:ZOP { return { line: line(), type: op, group: 'zop' } }
  / op:JMP _ label:LABEL { return { line: line(), type: op, label: label, group: 'jmp' } }
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

PARAM1 "param1"
  = REG / VAR

PARAM2 "param2"
  = HEXA / DECIMAL / REG / VAR

VAR "variable"
  = v:([a-z]+) { return { type: 'variable', name: v.join('')} }

REG "register"
  = reg:("AX"i / "BX"i / "[BX]"i / "CX"i / "DX"i / "AL"i / "AH"i / "BL"i / "BH"i / "CL"i / "CH"i / "DL"i / "DH"i) { return { type: 'register', value: reg } } 

HEXA "hexadecimal"
  = ns:([0-9A-Fa-f]+) "H"i { return { type: 'hexadecimal', value: makeInteger(ns, "", true) } }

DECIMAL "decimal"
  = neg:("-"?) ns:([0-9]+) { return { type: 'decimal', value: makeInteger(ns, neg, false) } }

ENDLINE "end of line"
  = "\n"

END
  = "END"i { return { line: line(), group: 'END', type: 'END' } }

_ "whitespace"
  = [ \t\n\r]*

__ ""
  = [ \t]*
