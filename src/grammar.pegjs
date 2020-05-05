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
    n = n * isNegative(neg);
    if(n > 65535 || n < -32768) expected('number out of range')
    return n;
  }
  
  function line() {
  	return location().start.line;
  }
}

PROGRAM
  = sts:(_ STATEMENT __ COMMENT* __ ENDLINE _)+ e:END .* 
    { return sts.map(function(x) { return x[1] }).filter(function(x) { return x !== null; } ).concat(e) }

STATEMENT =
  op:ORG _ p1:NUMBER { return { line: line(), type: op, p1: p1, group: 'ORG' } }
  / op:BINOP _ p1:PARAM1 _ "," _ p2:PARAM2 { return { line: line(), type: op, p1: p1, p2: p2, group: 'BINARY' } }
  / op:UNOP _ p1:PARAM1 { return { line: line(), type: op, p1: p1, group: 'UNARY' } }
  / op:ZOP { return { line: line(), type: op, group: 'ZOP' } }
  / op:JMP _ label:LABEL { return { line: line(), type: op, label: label, group: 'JMP' } }
  / name:NAME _ type:TYPE _ value:(VALUE / "?") { return { line: line(), type: name.type, name: name.name, vartype: type, value: value, group: 'VARIABLE' } }
  / v:NAME _ "EQU" _ value:VALUE { return { line: line(), type: 'CONSTANT', name: v.name, value: value, group: 'CONSTANT' } }
  / COMMENT { return null }

COMMENT = ';' ([^\n]*)

ORG = op:("ORG"i) { return op.toUpperCase() }

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
    { return op.toUpperCase() } 
  
UNOP
  = op:(
      "NEG"i
    / "DEC"i
    / "INC"i
    / "PUSH"i
    / "POP"i
    ) 
    { return op.toUpperCase() }
  
ZOP
  = op:(
      "PUSHF"i
    / "POPF"i
    / "RET"i
    / "CLI"i
    / "STI"i
    / "NOP"i
    / "HLT"i
    ) { return op.toUpperCase() }

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
     { return op.toUpperCase() }
  
LABEL
  = ":" label:([a-z]+) { return label.join('') }

PARAM1 "param1"
  = REG / VALUE

PARAM2 "param2"
  = REG / VALUE

TYPE "type"
  = "DB"

NAME "variable"
  = v:([a-zA-Z_][a-zA-Z_0-9]*) { return { type: 'VARIABLE', name: v[0].concat(v[1].join(''))} }

REG "register"
  = reg:("AX"i / "BX"i / "[BX]"i / "CX"i / "DX"i / "AL"i / "AH"i / "BL"i / "BH"i / "CL"i / "CH"i / "DL"i / "DH"i) { return { type: 'REGISTER', value: reg } } 
  
VALUE = NAME / NUMBER

NUMBER = HEXA / DECIMAL

HEXA "hexadecimal"
  = ns:([0-9A-Fa-f]+) "H"i { return { type: 'NUMBER', value: makeInteger(ns, "", true) } }

DECIMAL "decimal"
  = neg:("-"?) ns:([0-9]+) { return { type: 'NUMBER', value: makeInteger(ns, neg, false) } }

ENDLINE "end of line"
  = "\n"

END
  = "END"i { return { line: line(), group: 'END', type: 'END' } }

_ "whitespace"
  = [ \t\n\r]*

__ ""
  = [ \t]*
  