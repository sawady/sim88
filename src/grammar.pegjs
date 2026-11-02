// SIM88 assembly grammar (MSX88 dialect)
// =======================================
//
// The grammar parses ONE source line; src/model/parser.js splits the source
// into lines, so every node knows its line and END can stop the parse.
//
// A line is:   [label:] [statement] [; comment]
//
// Statements:
//   name DB/DW values      data definition (name is a data label)
//   name EQU expression    constant
//   DB/DW values           data without a name
//   ORG expression
//   END
//   MNEMONIC [operand {, operand}]
//
// Mnemonics are not validated here: the assembler knows which ones exist and
// gives a friendly error otherwise.

{
  const node = (kind, props) => ({ kind, ...props });
}

Line
  = _ label:LabelDef? _ body:Statement? _ Comment? _ {
      return { label, body };
    }

LabelDef
  = name:Ident _ ":" { return name; }

Statement
  = DataDef
  / ConstDef
  / Org
  / End
  / AnonymousData
  / Instruction

DataDef
  = name:Ident __ size:DataSize _ values:DataList {
      return node('data', { name, size, values });
    }

ConstDef
  = name:Ident __ "EQU"i !IdChar _ value:Expr {
      return node('equ', { name, value });
    }

AnonymousData
  = size:DataSize _ values:DataList { return node('data', { name: null, size, values }); }

DataSize
  = "DB"i !IdChar { return 8; }
  / "DW"i !IdChar { return 16; }

Org
  = "ORG"i !IdChar _ value:Expr { return node('org', { value }); }

End
  = "END"i !IdChar .* { return node('end', {}); }

Instruction
  = mnemonic:Ident operands:(_ @OperandList)? {
      return node('instruction', { mnemonic: mnemonic.toUpperCase(), operands: operands || [] });
    }

OperandList
  = head:Operand tail:(_ "," _ @Operand)* { return [head, ...tail]; }

DataList
  = head:DataItem tail:(_ "," _ @DataItem)* { return [head, ...tail]; }

DataItem
  = "?" { return node('uninit', {}); }
  / count:Expr _ "DUP"i _ "(" _ values:DataList _ ")" { return node('dup', { count, values }); }
  / value:String { return node('string', { value }); }
  / Expr

// ---------------------------------------------------------------- operands

Operand "operand"
  = size:PtrSize _ operand:(Memory / Expr) { return { ...operand, ptr: size }; }
  / Memory
  / Register
  / Expr

PtrSize
  = "BYTE"i __ "PTR"i !IdChar { return 8; }
  / "WORD"i __ "PTR"i !IdChar { return 16; }

// [BX], [BX + expr], [expr]
Memory
  = "[" _ base:BaseRegister disp:(_ @Sign _ @Expr)? _ "]" {
      if (!disp) return node('memory', { base, disp: null });
      const [sign, expr] = disp;
      return node('memory', { base, disp: sign === '-' ? node('neg', { value: expr }) : expr });
    }
  / "[" _ disp:Expr _ "]" { return node('memory', { base: null, disp }); }

BaseRegister
  = "BX"i !IdChar { return 'BX'; }

Register "register"
  = name:("AX"i / "BX"i / "CX"i / "DX"i / "SP"i
        / "AL"i / "AH"i / "BL"i / "BH"i / "CL"i / "CH"i / "DL"i / "DH"i) !IdChar {
      return node('register', { name: name.toUpperCase() });
    }

// ------------------------------------------------------------- expressions

Expr "expression"
  = head:Term tail:(_ @Sign _ @Term)* {
      return tail.reduce((left, [op, right]) => node('binary', { op, left, right }), head);
    }

Sign = "+" / "-"

Term
  = head:Factor tail:(_ @("*" / "/") _ @Factor)* {
      return tail.reduce((left, [op, right]) => node('binary', { op, left, right }), head);
    }

Factor
  = "(" _ @Expr _ ")"
  / "-" _ value:Factor { return node('neg', { value }); }
  / "OFFSET"i __ name:Ident { return node('offset', { name }); }
  / Number
  / Char
  / name:Ident { return node('symbol', { name }); }

Number "number"
  = digits:$([0-9] [0-9a-fA-F]*) [hH] !IdChar { return node('number', { value: parseInt(digits, 16) }); }
  / digits:$[01]+ [bB] !IdChar { return node('number', { value: parseInt(digits, 2) }); }
  / digits:$[0-9]+ [dD]? !IdChar { return node('number', { value: parseInt(digits, 10) }); }

// 'A' or "A": the character code
Char
  = "'" c:[^'\r\n] "'" { return node('number', { value: c.charCodeAt(0) }); }
  / '"' c:[^"\r\n] '"' { return node('number', { value: c.charCodeAt(0) }); }

String
  = '"' chars:$[^"\r\n]* '"' { return chars; }
  / "'" chars:$[^'\r\n]* "'" { return chars; }

// ------------------------------------------------------------------ lexical

Ident "name"
  = $([a-zA-Z_] IdChar*)

IdChar = [a-zA-Z_0-9]

Comment = ";" [^\r\n]*

_ "whitespace"
  = [ \t]*

__ "whitespace"
  = [ \t]+
