"use strict";

// istanbul ignore next
var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

// istanbul ignore next
var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

// istanbul ignore next
var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

// istanbul ignore next
var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

// istanbul ignore next
var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

/**
 * Copyright 2014 Shape Security, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Shift = require("shift-ast");

var _utils = require("./utils");

var isRestrictedWord = _utils.isRestrictedWord;
var isStrictModeReservedWordES5 = _utils.isStrictModeReservedWordES5;
var ErrorMessages = require("./errors").ErrorMessages;
var _tokenizer = require("./tokenizer");

var Tokenizer = _tokenizer["default"];
var TokenClass = _tokenizer.TokenClass;
var TokenType = _tokenizer.TokenType;
var IdentifierToken = _tokenizer.IdentifierToken;
var IdentifierLikeToken = _tokenizer.IdentifierLikeToken;
var NumericLiteralToken = _tokenizer.NumericLiteralToken;
var StringLiteralToken = _tokenizer.StringLiteralToken;


// Empty parameter list for ArrowExpression
var ARROW_EXPRESSION_PARAMS = "CoverParenthesizedExpressionAndArrowParameterList";

var STRICT_MODE_RESERVED_WORD = {
  "implements": null, "interface": null, "package": null, "private": null, "protected": null,
  "public": null, "static": null, "yield": null, "let": null
};

var Precedence = {
  Sequence: 0,
  Yield: 1,
  Assignment: 1,
  Conditional: 2,
  ArrowFunction: 2,
  LogicalOR: 3,
  LogicalAND: 4,
  BitwiseOR: 5,
  BitwiseXOR: 6,
  BitwiseAND: 7,
  Equality: 8,
  Relational: 9,
  BitwiseSHIFT: 10,
  Additive: 11,
  Multiplicative: 12,
  Unary: 13,
  Postfix: 14,
  Call: 15,
  New: 16,
  TaggedTemplate: 17,
  Member: 18,
  Primary: 19
};

var BinaryPrecedence = {
  "||": Precedence.LogicalOR,
  "&&": Precedence.LogicalAND,
  "|": Precedence.BitwiseOR,
  "^": Precedence.BitwiseXOR,
  "&": Precedence.BitwiseAND,
  "==": Precedence.Equality,
  "!=": Precedence.Equality,
  "===": Precedence.Equality,
  "!==": Precedence.Equality,
  "<": Precedence.Relational,
  ">": Precedence.Relational,
  "<=": Precedence.Relational,
  ">=": Precedence.Relational,
  "in": Precedence.Relational,
  "instanceof": Precedence.Relational,
  "<<": Precedence.BitwiseSHIFT,
  ">>": Precedence.BitwiseSHIFT,
  ">>>": Precedence.BitwiseSHIFT,
  "+": Precedence.Additive,
  "-": Precedence.Additive,
  "*": Precedence.Multiplicative,
  "%": Precedence.Multiplicative,
  "/": Precedence.Multiplicative };

function cpLoc(from, to) {
  if ("loc" in from) to.loc = from.loc;
  return to;
}

/**
 *
 * @param {[string]} strings
 * @returns {string?}
 */
function firstDuplicate(strings) {
  if (strings.length < 2) {
    return null;
  }var map = {};
  for (var cursor = 0; cursor < strings.length; cursor++) {
    var id = "$" + strings[cursor];
    if (map.hasOwnProperty(id)) {
      return strings[cursor];
    }
    map[id] = true;
  }
  return null;
}

function hasStrictModeReservedWord(ids) {
  return ids.some(function (id) {
    return STRICT_MODE_RESERVED_WORD.hasOwnProperty(id);
  });
}

var Parser = exports.Parser = (function (Tokenizer) {
  function Parser(source) {
    _classCallCheck(this, Parser);

    _get(Object.getPrototypeOf(Parser.prototype), "constructor", this).call(this, source);
    this.labelSet = Object.create(null);
    this.allowIn = true;
    this.inIteration = false;
    this.inSwitch = false;
    this.inFunctionBody = false;
    this.inMethod = false;
    this.inConstructor = false;
    this.hasClassHeritage = false;
    this.inGeneratorParameter = false;
    this.inGeneratorBody = false;
    this.allowYieldExpression = false;
  }

  _inherits(Parser, Tokenizer);

  _prototypeProperties(Parser, {
    transformDestructuringAssignment: {
      value: function transformDestructuringAssignment(node) {
        switch (node.type) {
          case "ObjectExpression":
            return cpLoc(node, new Shift.ObjectBinding(node.properties.map(Parser.transformDestructuringAssignment)));
          case "DataProperty":
            return cpLoc(node, new Shift.BindingPropertyProperty(node.name, Parser.transformDestructuringAssignment(node.expression)));
          case "ShorthandProperty":
            return cpLoc(node, new Shift.BindingPropertyIdentifier(cpLoc(node, new Shift.BindingIdentifier(node.name)), null));
          case "ArrayExpression":
            var last = node.elements[node.elements.length - 1];
            if (last != null && last.type === "SpreadElement") {
              return cpLoc(node, new Shift.ArrayBinding(node.elements.slice(0, -1).map(function (e) {
                return e && Parser.transformDestructuringAssignment(e);
              }), cpLoc(last.expression, new Shift.BindingIdentifier(last.expression.identifier))));
            } else {
              return cpLoc(node, new Shift.ArrayBinding(node.elements.map(function (e) {
                return e && Parser.transformDestructuringAssignment(e);
              }), null));
            }
          case "AssignmentExpression":
            return cpLoc(node, new Shift.BindingWithDefault(Parser.transformDestructuringAssignment(node.binding), node.expression));
          case "IdentifierExpression":
            return cpLoc(node, new Shift.BindingIdentifier(node.identifier));
        }
        return node;
      },
      writable: true,
      configurable: true
    },
    isDestructuringAssignmentTarget: {
      value: function isDestructuringAssignmentTarget(node) {
        switch (node.type) {
          case "ObjectExpression":
            return node.properties.every(function (p) {
              return p.type === "BindingPropertyIdentifier" || p.type === "ShorthandProperty" || p.type === "DataProperty" && Parser.isDestructuringAssignmentTargetWithDefault(p.expression);
            });
          case "ArrayExpression":
            if (node.elements.length === 0) {
              return false;
            }if (!node.elements.slice(0, -1).filter(function (e) {
              return e != null;
            }).every(Parser.isDestructuringAssignmentTargetWithDefault)) {
              return false;
            }var last = node.elements[node.elements.length - 1];
            return last != null && last.type === "SpreadElement" ? last.expression.type === "IdentifierExpression" : last == null || Parser.isDestructuringAssignmentTargetWithDefault(last);
          case "ArrayBinding":
          case "BindingIdentifier":
          case "BindingPropertyIdentifier":
          case "BindingPropertyProperty":
          case "BindingWithDefault":
          case "IdentifierExpression":
          case "ObjectBinding":
            return true;
        }
        return false;
      },
      writable: true,
      configurable: true
    },
    isDestructuringAssignmentTargetWithDefault: {
      value: function isDestructuringAssignmentTargetWithDefault(node) {
        return Parser.isDestructuringAssignmentTarget(node) || node.type === "AssignmentExpression" && node.operator === "=" && Parser.isDestructuringAssignmentTarget(node.binding);
      },
      writable: true,
      configurable: true
    },
    isValidSimpleAssignmentTarget: {
      value: function isValidSimpleAssignmentTarget(node) {
        switch (node.type) {
          case "IdentifierExpression":
          case "ComputedMemberExpression":
          case "StaticMemberExpression":
            return true;
        }
        return false;
      },
      writable: true,
      configurable: true
    },
    boundNames: {
      value: function boundNames(node) {
        switch (node.type) {
          case "BindingIdentifier":
            return [node.identifier.name];
          case "BindingWithDefault":
            return Parser.boundNames(node.binding);
          case "ArrayBinding":
            {
              var _ret = (function () {
                var names = [];
                node.elements.filter(function (e) {
                  return e != null;
                }).forEach(function (e) {
                  return [].push.apply(names, Parser.boundNames(e));
                });
                if (node.restElement != null) {
                  names.push(node.restElement.identifier.name);
                }
                return {
                  v: names
                };
              })();

              // istanbul ignore next
              if (typeof _ret === "object") {
                return _ret.v;
              }
            }
          case "ObjectBinding":
            {
              var _ret2 = (function () {
                var names = [];
                node.properties.forEach(function (p) {
                  switch (p.type) {
                    case "BindingPropertyIdentifier":
                      names.push(p.identifier.identifier.name);
                      break;
                    case "BindingPropertyProperty":
                      [].push.apply(names, Parser.boundNames(p.binding));
                      break;
                    // istanbul ignore next
                    default:
                      throw new Error("boundNames called on ObjectBinding with invalid property: " + p.type);
                  }
                });
                return {
                  v: names
                };
              })();

              // istanbul ignore next
              if (typeof _ret2 === "object") {
                return _ret2.v;
              }
            }
          case "ComputedMemberExpression":
          case "StaticMemberExpression":
            return [];
        }
        // istanbul ignore next
        throw new Error("boundNames called on invalid assignment target: " + node.type);
      },
      writable: true,
      configurable: true
    },
    isPrefixOperator: {
      value: function isPrefixOperator(type) {
        switch (type) {
          case TokenType.INC:
          case TokenType.DEC:
          case TokenType.ADD:
          case TokenType.SUB:
          case TokenType.BIT_NOT:
          case TokenType.NOT:
          case TokenType.DELETE:
          case TokenType.VOID:
          case TokenType.TYPEOF:
            return true;
        }
        return false;
      },
      writable: true,
      configurable: true
    }
  }, {
    eat: {
      value: function eat(tokenType) {
        if (this.lookahead.type === tokenType) {
          return this.lex();
        }
      },
      writable: true,
      configurable: true
    },
    expect: {
      value: function expect(tokenType) {
        if (this.lookahead.type === tokenType) {
          return this.lex();
        }
        throw this.createUnexpected(this.lookahead);
      },
      writable: true,
      configurable: true
    },
    match: {
      value: function match(subType) {
        return this.lookahead.type === subType;
      },
      writable: true,
      configurable: true
    },
    consumeSemicolon: {
      value: function consumeSemicolon() {
        if (this.hasLineTerminatorBeforeNext) {
          return;
        }

        if (this.eat(TokenType.SEMICOLON)) {
          return;
        }

        if (!this.eof() && !this.match(TokenType.RBRACE)) {
          throw this.createUnexpected(this.lookahead);
        }
      },
      writable: true,
      configurable: true
    },
    markLocation: {

      // this is a no-op, reserved for future use
      value: function markLocation(node, startLocation) {
        return node;
      },
      writable: true,
      configurable: true
    },
    parseScript: {
      value: function parseScript() {
        var location = this.getLocation();
        var _parseBody = this.parseBody();

        var _parseBody2 = _slicedToArray(_parseBody, 1);

        var body = _parseBody2[0];
        if (!this.match(TokenType.EOS)) {
          throw this.createUnexpected(this.lookahead);
        }
        return this.markLocation(new Shift.Script(body), location);
      },
      writable: true,
      configurable: true
    },
    parseFunctionBody: {
      value: function parseFunctionBody() {
        var previousStrict = this.strict;
        var startLocation = this.getLocation();

        var oldLabelSet = this.labelSet;
        var oldInIteration = this.inIteration;
        var oldInSwitch = this.inSwitch;
        var oldInFunctionBody = this.inFunctionBody;

        this.labelSet = Object.create(null);
        this.inIteration = false;
        this.inSwitch = false;
        this.inFunctionBody = true;

        this.expect(TokenType.LBRACE);
        var _parseBody = this.parseBody();

        var _parseBody2 = _slicedToArray(_parseBody, 2);

        var body = _parseBody2[0];
        var isStrict = _parseBody2[1];
        this.expect(TokenType.RBRACE);

        body = this.markLocation(body, startLocation);

        this.labelSet = oldLabelSet;
        this.inIteration = oldInIteration;
        this.inSwitch = oldInSwitch;
        this.inFunctionBody = oldInFunctionBody;
        this.strict = previousStrict;
        return [body, isStrict];
      },
      writable: true,
      configurable: true
    },
    parseBody: {
      value: function parseBody() {
        var location = this.getLocation();
        var directives = [];
        var statements = [];
        var parsingDirectives = true;
        var isStrict = this.strict;
        var firstRestricted = null;
        while (true) {
          if (this.eof() || this.match(TokenType.RBRACE)) {
            break;
          }
          var token = this.lookahead;
          var text = token.slice.text;
          var isStringLiteral = token.type === TokenType.STRING;
          var directiveLocation = this.getLocation();
          var stmt = this.parseStatementListItem();
          if (parsingDirectives) {
            if (isStringLiteral && stmt.type === "ExpressionStatement" && stmt.expression.type === "LiteralStringExpression") {
              if (text === "\"use strict\"" || text === "'use strict'") {
                isStrict = true;
                this.strict = true;
                if (firstRestricted != null) {
                  throw this.createErrorWithLocation(firstRestricted, ErrorMessages.STRICT_OCTAL_LITERAL);
                }
              } else if (firstRestricted == null && token.octal) {
                firstRestricted = token;
              }
              directives.push(this.markLocation(new Shift.Directive(text.slice(1, -1)), directiveLocation));
            } else {
              parsingDirectives = false;
              statements.push(stmt);
            }
          } else {
            statements.push(stmt);
          }
        }

        return [this.markLocation(new Shift.FunctionBody(directives, statements), location), isStrict];
      },
      writable: true,
      configurable: true
    },
    parseStatementListItem: {
      value: function parseStatementListItem() {
        var startLocation = this.getLocation();
        if (this.eof()) {
          throw this.createUnexpected(this.lookahead);
        }
        switch (this.lookahead.type) {
          case TokenType.FUNCTION:
            return this.markLocation(this.parseFunction(false), startLocation);
          case TokenType.CONST:
            return this.markLocation(this.parseVariableDeclarationStatement(), startLocation);
          case TokenType.CLASS:
            return this.parseClass(false);
          default:
            if (this.lookahead.value === "let") {
              return this.markLocation(this.parseVariableDeclarationStatement(), startLocation);
            }
            return this.parseStatement();
        }
      },
      writable: true,
      configurable: true
    },
    parseStatement: {
      value: function parseStatement() {
        var startLocation = this.getLocation();
        if (this.eof()) {
          throw this.createUnexpected(this.lookahead);
        }
        switch (this.lookahead.type) {
          case TokenType.SEMICOLON:
            return this.markLocation(this.parseEmptyStatement(), startLocation);
          case TokenType.LBRACE:
            return this.markLocation(this.parseBlockStatement(), startLocation);
          case TokenType.LPAREN:
            return this.markLocation(this.parseExpressionStatement(), startLocation);
          case TokenType.BREAK:
            return this.markLocation(this.parseBreakStatement(), startLocation);
          case TokenType.CONTINUE:
            return this.markLocation(this.parseContinueStatement(), startLocation);
          case TokenType.DEBUGGER:
            return this.markLocation(this.parseDebuggerStatement(), startLocation);
          case TokenType.DO:
            return this.markLocation(this.parseDoWhileStatement(), startLocation);
          case TokenType.FOR:
            return this.markLocation(this.parseForStatement(), startLocation);
          case TokenType.IF:
            return this.markLocation(this.parseIfStatement(), startLocation);
          case TokenType.RETURN:
            return this.markLocation(this.parseReturnStatement(), startLocation);
          case TokenType.SWITCH:
            return this.markLocation(this.parseSwitchStatement(), startLocation);
          case TokenType.THROW:
            return this.markLocation(this.parseThrowStatement(), startLocation);
          case TokenType.TRY:
            return this.markLocation(this.parseTryStatement(), startLocation);
          case TokenType.VAR:
            return this.markLocation(this.parseVariableDeclarationStatement(), startLocation);
          case TokenType.WHILE:
            return this.markLocation(this.parseWhileStatement(), startLocation);
          case TokenType.WITH:
            return this.markLocation(this.parseWithStatement(), startLocation);
          case TokenType.CONST:
          case TokenType.FUNCTION:
          case TokenType.CLASS:
            throw this.createUnexpected(this.lookahead);

          default:
            {
              var expr = this.parseExpression();

              // 12.12 Labelled Statements;
              if (expr.type === "IdentifierExpression" && this.eat(TokenType.COLON)) {
                var key = "$" + expr.identifier.name;
                if (({}).hasOwnProperty.call(this.labelSet, key)) {
                  throw this.createError(ErrorMessages.LABEL_REDECLARATION, expr.identifier.name);
                }

                this.labelSet[key] = true;
                var labeledBody = undefined;
                if (this.match(TokenType.FUNCTION)) {
                  labeledBody = this.parseFunction(false, false);
                } else {
                  labeledBody = this.parseStatement();
                }
                delete this.labelSet[key];
                return this.markLocation(new Shift.LabeledStatement(expr.identifier, labeledBody), startLocation);
              } else {
                this.consumeSemicolon();
                return this.markLocation(new Shift.ExpressionStatement(expr), startLocation);
              }
            }
        }
      },
      writable: true,
      configurable: true
    },
    parseEmptyStatement: {
      value: function parseEmptyStatement() {
        this.expect(TokenType.SEMICOLON);
        return new Shift.EmptyStatement();
      },
      writable: true,
      configurable: true
    },
    parseBlockStatement: {
      value: function parseBlockStatement() {
        return new Shift.BlockStatement(this.parseBlock());
      },
      writable: true,
      configurable: true
    },
    parseExpressionStatement: {
      value: function parseExpressionStatement() {
        var expr = this.parseExpression();
        this.consumeSemicolon();
        return new Shift.ExpressionStatement(expr);
      },
      writable: true,
      configurable: true
    },
    parseBreakStatement: {
      value: function parseBreakStatement() {
        var token = this.lookahead;
        this.expect(TokenType.BREAK);

        // Catch the very common case first: immediately a semicolon (U+003B).
        if (this.eat(TokenType.SEMICOLON)) {
          if (!(this.inIteration || this.inSwitch)) {
            throw this.createErrorWithLocation(token, ErrorMessages.ILLEGAL_BREAK);
          }

          return new Shift.BreakStatement(null);
        }

        if (this.hasLineTerminatorBeforeNext) {
          if (!(this.inIteration || this.inSwitch)) {
            throw this.createErrorWithLocation(token, ErrorMessages.ILLEGAL_BREAK);
          }

          return new Shift.BreakStatement(null);
        }

        var label = null;
        if (this.lookahead.type == TokenType.IDENTIFIER) {
          label = this.parseIdentifier();

          var key = "$" + label.name;
          if (!({}).hasOwnProperty.call(this.labelSet, key)) {
            throw this.createError(ErrorMessages.UNKNOWN_LABEL, label.name);
          }
        }

        this.consumeSemicolon();

        if (label == null && !(this.inIteration || this.inSwitch)) {
          throw this.createErrorWithLocation(token, ErrorMessages.ILLEGAL_BREAK);
        }

        return new Shift.BreakStatement(label);
      },
      writable: true,
      configurable: true
    },
    parseContinueStatement: {
      value: function parseContinueStatement() {
        var token = this.lookahead;
        this.expect(TokenType.CONTINUE);

        // Catch the very common case first: immediately a semicolon (U+003B).
        if (this.eat(TokenType.SEMICOLON)) {
          if (!this.inIteration) {
            throw this.createErrorWithLocation(token, ErrorMessages.ILLEGAL_CONTINUE);
          }

          return new Shift.ContinueStatement(null);
        }

        if (this.hasLineTerminatorBeforeNext) {
          if (!this.inIteration) {
            throw this.createErrorWithLocation(token, ErrorMessages.ILLEGAL_CONTINUE);
          }

          return new Shift.ContinueStatement(null);
        }

        var label = null;
        if (this.lookahead.type == TokenType.IDENTIFIER) {
          label = this.parseIdentifier();

          var key = "$" + label.name;
          if (!({}).hasOwnProperty.call(this.labelSet, key)) {
            throw this.createError(ErrorMessages.UNKNOWN_LABEL, label.name);
          }
        }

        this.consumeSemicolon();
        if (!this.inIteration) {
          throw this.createErrorWithLocation(token, ErrorMessages.ILLEGAL_CONTINUE);
        }

        return new Shift.ContinueStatement(label);
      },
      writable: true,
      configurable: true
    },
    parseDebuggerStatement: {
      value: function parseDebuggerStatement() {
        this.expect(TokenType.DEBUGGER);
        this.consumeSemicolon();
        return new Shift.DebuggerStatement();
      },
      writable: true,
      configurable: true
    },
    parseDoWhileStatement: {
      value: function parseDoWhileStatement() {
        this.expect(TokenType.DO);
        var oldInIteration = this.inIteration;
        this.inIteration = true;

        var body = this.parseStatement();
        this.inIteration = oldInIteration;

        this.expect(TokenType.WHILE);
        this.expect(TokenType.LPAREN);
        var test = this.parseExpression();
        this.expect(TokenType.RPAREN);
        this.eat(TokenType.SEMICOLON);

        return new Shift.DoWhileStatement(body, test);
      },
      writable: true,
      configurable: true
    },
    parseForStatement: {
      value: function parseForStatement() {
        this.expect(TokenType.FOR);
        this.expect(TokenType.LPAREN);
        var test = null;
        var right = null;
        if (this.eat(TokenType.SEMICOLON)) {
          if (!this.match(TokenType.SEMICOLON)) {
            test = this.parseExpression();
          }
          this.expect(TokenType.SEMICOLON);
          if (!this.match(TokenType.RPAREN)) {
            right = this.parseExpression();
          }
          return new Shift.ForStatement(null, test, right, this.getIteratorStatementEpilogue());
        } else {
          if (this.match(TokenType.VAR) || this.match(TokenType.IDENTIFIER) && this.lookahead.value === "let") {
            var previousAllowIn = this.allowIn;
            this.allowIn = false;
            var initDecl = this.parseVariableDeclaration();
            this.allowIn = previousAllowIn;

            if (initDecl.declarators.length === 1 && (this.match(TokenType.IN) || this.match(TokenType.OF))) {
              var type = this.match(TokenType.IN) ? Shift.ForInStatement : Shift.ForOfStatement;
              if (initDecl.declarators[0].init != null) {
                throw type == Shift.ForInStatement ? this.createError(ErrorMessages.INVALID_VAR_INIT_FOR_IN) : this.createError(ErrorMessages.INVALID_VAR_INIT_FOR_OF);
              }
              this.lex();
              right = this.parseExpression();
              return new type(initDecl, right, this.getIteratorStatementEpilogue());
            } else {
              this.expect(TokenType.SEMICOLON);
              if (!this.match(TokenType.SEMICOLON)) {
                test = this.parseExpression();
              }
              this.expect(TokenType.SEMICOLON);
              if (!this.match(TokenType.RPAREN)) {
                right = this.parseExpression();
              }
              return new Shift.ForStatement(initDecl, test, right, this.getIteratorStatementEpilogue());
            }
          } else {
            var previousAllowIn = this.allowIn;
            this.allowIn = false;
            var init = this.parseExpression();
            this.allowIn = previousAllowIn;

            if (this.match(TokenType.IN) || this.match(TokenType.OF)) {
              if (!Parser.isValidSimpleAssignmentTarget(init)) {
                throw this.createError(ErrorMessages.INVALID_LHS_IN_FOR_IN);
              }

              var type = this.match(TokenType.IN) ? Shift.ForInStatement : Shift.ForOfStatement;

              this.lex();
              right = this.parseExpression();

              return new type(init, right, this.getIteratorStatementEpilogue());
            } else {
              this.expect(TokenType.SEMICOLON);
              if (!this.match(TokenType.SEMICOLON)) {
                test = this.parseExpression();
              }
              this.expect(TokenType.SEMICOLON);
              if (!this.match(TokenType.RPAREN)) {
                right = this.parseExpression();
              }
              return new Shift.ForStatement(init, test, right, this.getIteratorStatementEpilogue());
            }
          }
        }
      },
      writable: true,
      configurable: true
    },
    getIteratorStatementEpilogue: {
      value: function getIteratorStatementEpilogue() {
        this.expect(TokenType.RPAREN);
        var oldInIteration = this.inIteration;
        this.inIteration = true;
        var body = this.parseStatement();
        this.inIteration = oldInIteration;
        return body;
      },
      writable: true,
      configurable: true
    },
    parseIfStatement: {
      value: function parseIfStatement() {
        this.expect(TokenType.IF);
        this.expect(TokenType.LPAREN);
        var test = this.parseExpression();

        this.expect(TokenType.RPAREN);
        var consequent = this.parseStatement();
        var alternate = null;
        if (this.eat(TokenType.ELSE)) {
          alternate = this.parseStatement();
        }
        return new Shift.IfStatement(test, consequent, alternate);
      },
      writable: true,
      configurable: true
    },
    parseReturnStatement: {
      value: function parseReturnStatement() {
        var argument = null;

        this.expect(TokenType.RETURN);
        if (!this.inFunctionBody) {
          throw this.createError(ErrorMessages.ILLEGAL_RETURN);
        }

        if (this.hasLineTerminatorBeforeNext) {
          return new Shift.ReturnStatement(null);
        }

        if (!this.match(TokenType.SEMICOLON)) {
          if (!this.match(TokenType.RBRACE) && !this.eof()) {
            argument = this.parseExpression();
          }
        }

        this.consumeSemicolon();
        return new Shift.ReturnStatement(argument);
      },
      writable: true,
      configurable: true
    },
    parseWithStatement: {
      value: function parseWithStatement() {
        if (this.strict) {
          throw this.createError(ErrorMessages.STRICT_MODE_WITH);
        }

        this.expect(TokenType.WITH);
        this.expect(TokenType.LPAREN);
        var object = this.parseExpression();
        this.expect(TokenType.RPAREN);
        var body = this.parseStatement();

        return new Shift.WithStatement(object, body);
      },
      writable: true,
      configurable: true
    },
    parseSwitchStatement: {
      value: function parseSwitchStatement() {
        this.expect(TokenType.SWITCH);
        this.expect(TokenType.LPAREN);
        var discriminant = this.parseExpression();
        this.expect(TokenType.RPAREN);
        this.expect(TokenType.LBRACE);

        if (this.eat(TokenType.RBRACE)) {
          return new Shift.SwitchStatement(discriminant, []);
        }
        var oldInSwitch = this.inSwitch;
        this.inSwitch = true;

        var cases = this.parseSwitchCases();

        if (this.match(TokenType.DEFAULT)) {
          var switchDefault = this.parseSwitchDefault();
          var postDefaultCases = this.parseSwitchCases();
          if (this.match(TokenType.DEFAULT)) {
            throw this.createError(ErrorMessages.MULTIPLE_DEFAULTS_IN_SWITCH);
          }
          this.inSwitch = oldInSwitch;
          this.expect(TokenType.RBRACE);
          return new Shift.SwitchStatementWithDefault(discriminant, cases, switchDefault, postDefaultCases);
        } else {
          this.inSwitch = oldInSwitch;
          this.expect(TokenType.RBRACE);
          return new Shift.SwitchStatement(discriminant, cases);
        }
      },
      writable: true,
      configurable: true
    },
    parseSwitchCases: {
      value: function parseSwitchCases() {
        var result = [];
        while (!(this.eof() || this.match(TokenType.RBRACE) || this.match(TokenType.DEFAULT))) {
          result.push(this.parseSwitchCase());
        }
        return result;
      },
      writable: true,
      configurable: true
    },
    parseSwitchCase: {
      value: function parseSwitchCase() {
        var startLocation = this.getLocation();
        this.expect(TokenType.CASE);
        return this.markLocation(new Shift.SwitchCase(this.parseExpression(), this.parseSwitchCaseBody()), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseSwitchDefault: {
      value: function parseSwitchDefault() {
        var startLocation = this.getLocation();
        this.expect(TokenType.DEFAULT);
        return this.markLocation(new Shift.SwitchDefault(this.parseSwitchCaseBody()), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseSwitchCaseBody: {
      value: function parseSwitchCaseBody() {
        this.expect(TokenType.COLON);
        return this.parseStatementListInSwitchCaseBody();
      },
      writable: true,
      configurable: true
    },
    parseStatementListInSwitchCaseBody: {
      value: function parseStatementListInSwitchCaseBody() {
        var result = [];
        while (!(this.eof() || this.match(TokenType.RBRACE) || this.match(TokenType.DEFAULT) || this.match(TokenType.CASE))) {
          result.push(this.parseStatement());
        }
        return result;
      },
      writable: true,
      configurable: true
    },
    parseThrowStatement: {
      value: function parseThrowStatement() {
        var token = this.expect(TokenType.THROW);

        if (this.hasLineTerminatorBeforeNext) {
          throw this.createErrorWithLocation(token, ErrorMessages.NEWLINE_AFTER_THROW);
        }

        var argument = this.parseExpression();

        this.consumeSemicolon();

        return new Shift.ThrowStatement(argument);
      },
      writable: true,
      configurable: true
    },
    parseTryStatement: {
      value: function parseTryStatement() {
        this.expect(TokenType.TRY);
        var block = this.parseBlock();

        if (this.match(TokenType.CATCH)) {
          var handler = this.parseCatchClause();
          if (this.eat(TokenType.FINALLY)) {
            var finalizer = this.parseBlock();
            return new Shift.TryFinallyStatement(block, handler, finalizer);
          }
          return new Shift.TryCatchStatement(block, handler);
        }

        if (this.eat(TokenType.FINALLY)) {
          var finalizer = this.parseBlock();
          return new Shift.TryFinallyStatement(block, null, finalizer);
        } else {
          throw this.createError(ErrorMessages.NO_CATCH_OR_FINALLY);
        }
      },
      writable: true,
      configurable: true
    },
    parseVariableDeclarationStatement: {
      value: function parseVariableDeclarationStatement() {
        var declaration = this.parseVariableDeclaration();
        this.consumeSemicolon();
        return new Shift.VariableDeclarationStatement(declaration);
      },
      writable: true,
      configurable: true
    },
    parseWhileStatement: {
      value: function parseWhileStatement() {
        this.expect(TokenType.WHILE);
        this.expect(TokenType.LPAREN);
        return new Shift.WhileStatement(this.parseExpression(), this.getIteratorStatementEpilogue());
      },
      writable: true,
      configurable: true
    },
    parseCatchClause: {
      value: function parseCatchClause() {
        var startLocation = this.getLocation();

        this.expect(TokenType.CATCH);
        this.expect(TokenType.LPAREN);
        var token = this.lookahead;
        if (this.match(TokenType.RPAREN) || this.match(TokenType.LPAREN)) {
          throw this.createUnexpected(token);
        }

        var param = this.parseLeftHandSideExpression();

        if (!Parser.isDestructuringAssignmentTarget(param)) {
          throw this.createUnexpected(token);
        }
        param = Parser.transformDestructuringAssignment(param);

        var bound = Parser.boundNames(param);
        if (firstDuplicate(bound) != null) {
          throw this.createErrorWithLocation(token, ErrorMessages.DUPLICATE_BINDING, firstDuplicate(bound));
        }

        if (this.strict && bound.some(isRestrictedWord)) {
          throw this.createErrorWithLocation(token, ErrorMessages.STRICT_CATCH_VARIABLE);
        }

        this.expect(TokenType.RPAREN);

        var body = this.parseBlock();

        return this.markLocation(new Shift.CatchClause(param, body), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseBlock: {
      value: function parseBlock() {
        var startLocation = this.getLocation();
        this.expect(TokenType.LBRACE);

        var body = [];
        while (!this.match(TokenType.RBRACE)) {
          body.push(this.parseStatementListItem());
        }
        this.expect(TokenType.RBRACE);

        return this.markLocation(new Shift.Block(body), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseVariableDeclaration: {
      value: function parseVariableDeclaration() {
        var startLocation = this.getLocation();
        var token = this.lex();

        // Preceded by this.match(TokenSubType.VAR) || this.match(TokenSubType.LET);
        var kind = token.type == TokenType.VAR ? "var" : token.type === TokenType.CONST ? "const" : "let";
        var declarators = this.parseVariableDeclaratorList(kind);
        return this.markLocation(new Shift.VariableDeclaration(kind, declarators), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseVariableDeclaratorList: {
      value: function parseVariableDeclaratorList(kind) {
        var result = [];
        while (true) {
          result.push(this.parseVariableDeclarator(kind));
          if (!this.eat(TokenType.COMMA)) {
            return result;
          }
        }
      },
      writable: true,
      configurable: true
    },
    parseVariableDeclarator: {
      value: function parseVariableDeclarator(kind) {
        var startLocation = this.getLocation();
        var token = this.lookahead;

        if (this.match(TokenType.LPAREN)) {
          throw this.createUnexpected(this.lookahead);
        }
        var id = this.parseLeftHandSideExpression();

        if (!Parser.isDestructuringAssignmentTarget(id)) {
          throw this.createUnexpected(token);
        }
        id = Parser.transformDestructuringAssignment(id);

        var bound = Parser.boundNames(id);
        if (firstDuplicate(bound) != null) {
          throw this.createErrorWithLocation(token, ErrorMessages.DUPLICATE_BINDING, firstDuplicate(bound));
        }

        if (this.strict && bound.some(isRestrictedWord)) {
          throw this.createErrorWithLocation(token, ErrorMessages.STRICT_VAR_NAME);
        }

        var init = null;
        if (kind == "const") {
          this.expect(TokenType.ASSIGN);
          init = this.parseAssignmentExpression();
        } else if (this.eat(TokenType.ASSIGN)) {
          init = this.parseAssignmentExpression();
        }
        return this.markLocation(new Shift.VariableDeclarator(id, init), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseExpression: {
      value: function parseExpression() {
        var startLocation = this.getLocation();

        var expr = this.parseAssignmentExpression();

        if (this.match(TokenType.COMMA)) {
          while (!this.eof()) {
            if (!this.match(TokenType.COMMA)) {
              break;
            }
            this.lex();
            expr = this.markLocation(new Shift.BinaryExpression(",", expr, this.parseAssignmentExpression()), startLocation);
          }
        }
        return expr;
      },
      writable: true,
      configurable: true
    },
    parseArrowExpressionTail: {
      value: function parseArrowExpressionTail(head, startLocation) {
        var arrow = this.expect(TokenType.ARROW);

        // Convert param list.
        var _head$params = head.params;
        var params = _head$params === undefined ? null : _head$params;
        var _head$rest = head.rest;
        var rest = _head$rest === undefined ? null : _head$rest;
        if (head.type !== ARROW_EXPRESSION_PARAMS) {
          if (head.type === "IdentifierExpression") {
            var _name = head.identifier.name;
            if (STRICT_MODE_RESERVED_WORD.hasOwnProperty(_name)) {
              throw this.createError(ErrorMessages.STRICT_RESERVED_WORD);
            }
            if (isRestrictedWord(_name)) {
              throw this.createError(ErrorMessages.STRICT_PARAM_NAME);
            }
            head = Parser.transformDestructuringAssignment(head);
            params = [head];
          } else {
            throw this.createUnexpected(arrow);
          }
        }

        if (this.match(TokenType.LBRACE)) {
          var previousYield = this.allowYieldExpression;
          this.allowYieldExpression = false;
          var _parseFunctionBody = this.parseFunctionBody();

          var _parseFunctionBody2 = _slicedToArray(_parseFunctionBody, 1);

          var body = _parseFunctionBody2[0];
          this.allowYieldExpression = previousYield;
          return this.markLocation(new Shift.ArrowExpression(params, rest, body), startLocation);
        } else {
          var body = this.parseAssignmentExpression();
          return this.markLocation(new Shift.ArrowExpression(params, rest, body), startLocation);
        }
      },
      writable: true,
      configurable: true
    },
    parseAssignmentExpression: {
      value: function parseAssignmentExpression() {
        var token = this.lookahead;
        var startLocation = this.getLocation();

        if (this.allowYieldExpression && !this.inGeneratorParameter && this.lookahead.value === "yield") {
          return this.parseYieldExpression();
        }

        var node = this.parseConditionalExpression();

        if (!this.hasLineTerminatorBeforeNext && this.match(TokenType.ARROW)) {
          return this.parseArrowExpressionTail(node, startLocation);
        }

        var isOperator = false;
        var operator = this.lookahead;
        switch (operator.type) {
          case TokenType.ASSIGN:
          case TokenType.ASSIGN_BIT_OR:
          case TokenType.ASSIGN_BIT_XOR:
          case TokenType.ASSIGN_BIT_AND:
          case TokenType.ASSIGN_SHL:
          case TokenType.ASSIGN_SHR:
          case TokenType.ASSIGN_SHR_UNSIGNED:
          case TokenType.ASSIGN_ADD:
          case TokenType.ASSIGN_SUB:
          case TokenType.ASSIGN_MUL:
          case TokenType.ASSIGN_DIV:
          case TokenType.ASSIGN_MOD:
            isOperator = true;
            break;
        }
        if (isOperator) {
          if (!Parser.isDestructuringAssignmentTarget(node) && node.type !== "ComputedMemberExpression" && node.type !== "StaticMemberExpression") {
            throw this.createError(ErrorMessages.INVALID_LHS_IN_ASSIGNMENT);
          }
          node = Parser.transformDestructuringAssignment(node);

          var bound = Parser.boundNames(node);
          if (firstDuplicate(bound) != null) {
            throw this.createErrorWithLocation(token, ErrorMessages.DUPLICATE_BINDING, firstDuplicate(bound));
          }

          if (this.strict && bound.some(isRestrictedWord)) {
            throw this.createErrorWithLocation(token, ErrorMessages.STRICT_LHS_ASSIGNMENT);
          }

          this.lex();
          var previousInGeneratorParameter = this.inGeneratorParameter;
          this.inGeneratorParameter = false;
          var right = this.parseAssignmentExpression();
          this.inGeneratorParameter = previousInGeneratorParameter;
          return this.markLocation(new Shift.AssignmentExpression(operator.type.name, node, right), startLocation);
        }

        if (node.type === "ObjectExpression" && node.properties.some(function (p) {
          return p.type === "BindingPropertyIdentifier";
        })) {
          throw this.createUnexpected(operator);
        }

        return node;
      },
      writable: true,
      configurable: true
    },
    lookaheadAssignmentExpression: {
      value: function lookaheadAssignmentExpression() {
        switch (this.lookahead.type) {
          case TokenType.ADD:
          case TokenType.ASSIGN_DIV:
          case TokenType.CLASS:
          case TokenType.DEC:
          case TokenType.DIV:
          case TokenType.FALSE:
          case TokenType.FUNCTION:
          case TokenType.IDENTIFIER:
          case TokenType.LBRACE:
          case TokenType.LBRACK:
          case TokenType.LPAREN:
          case TokenType.NEW:
          case TokenType.NOT:
          case TokenType.NULL:
          case TokenType.NUMBER:
          case TokenType.STRING:
          case TokenType.SUB:
          case TokenType.THIS:
          case TokenType.TRUE:
          case TokenType.YIELD:
          case TokenType.TEMPLATE:
            return true;
        }
        return false;
      },
      writable: true,
      configurable: true
    },
    parseYieldExpression: {
      value: function parseYieldExpression() {
        var startLocation = this.getLocation();

        this.lex();
        if (this.hasLineTerminatorBeforeNext) {
          return this.markLocation(new Shift.YieldExpression(null), startLocation);
        }
        var isGenerator = !!this.eat(TokenType.MUL);
        var previousYield = this.allowYieldExpression;
        var expr = null;
        if (isGenerator || this.lookaheadAssignmentExpression()) {
          expr = this.parseAssignmentExpression();
        }
        this.allowYieldExpression = previousYield;
        var cons = isGenerator ? Shift.YieldGeneratorExpression : Shift.YieldExpression;
        return this.markLocation(new cons(expr), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseConditionalExpression: {
      value: function parseConditionalExpression() {
        var startLocation = this.getLocation();
        var expr = this.parseBinaryExpression();
        if (this.eat(TokenType.CONDITIONAL)) {
          var previousAllowIn = this.allowIn;
          this.allowIn = true;
          var consequent = this.parseAssignmentExpression();
          this.allowIn = previousAllowIn;
          this.expect(TokenType.COLON);
          var alternate = this.parseAssignmentExpression();
          return this.markLocation(new Shift.ConditionalExpression(expr, consequent, alternate), startLocation);
        }

        return expr;
      },
      writable: true,
      configurable: true
    },
    isBinaryOperator: {
      value: function isBinaryOperator(type) {
        switch (type) {
          case TokenType.OR:
          case TokenType.AND:
          case TokenType.BIT_OR:
          case TokenType.BIT_XOR:
          case TokenType.BIT_AND:
          case TokenType.EQ:
          case TokenType.NE:
          case TokenType.EQ_STRICT:
          case TokenType.NE_STRICT:
          case TokenType.LT:
          case TokenType.GT:
          case TokenType.LTE:
          case TokenType.GTE:
          case TokenType.INSTANCEOF:
          case TokenType.SHL:
          case TokenType.SHR:
          case TokenType.SHR_UNSIGNED:
          case TokenType.ADD:
          case TokenType.SUB:
          case TokenType.MUL:
          case TokenType.DIV:
          case TokenType.MOD:
            return true;
          case TokenType.IN:
            return this.allowIn;
          default:
            return false;
        }
      },
      writable: true,
      configurable: true
    },
    parseBinaryExpression: {
      value: function parseBinaryExpression() {
        var _this = this;
        var location = this.getLocation();
        var left = this.parseUnaryExpression();
        var operator = this.lookahead.type;

        var isBinaryOperator = this.isBinaryOperator(operator);
        if (!isBinaryOperator) {
          return left;
        }

        this.lex();
        var stack = [];
        stack.push({ location: location, left: left, operator: operator, precedence: BinaryPrecedence[operator.name] });
        location = this.getLocation();
        var right = this.parseUnaryExpression();

        operator = this.lookahead.type;
        isBinaryOperator = this.isBinaryOperator(this.lookahead.type);
        while (isBinaryOperator) {
          var precedence = BinaryPrecedence[operator.name];
          // Reduce: make a binary expression from the three topmost entries.
          while (stack.length && precedence <= stack[stack.length - 1].precedence) {
            var stackItem = stack[stack.length - 1];
            var stackOperator = stackItem.operator;
            left = stackItem.left;
            stack.pop();
            location = stackItem.location;
            right = this.markLocation(new Shift.BinaryExpression(stackOperator.name, left, right), location);
          }

          // Shift.
          this.lex();
          stack.push({ location: location, left: right, operator: operator, precedence: precedence });
          location = this.getLocation();
          right = this.parseUnaryExpression();

          operator = this.lookahead.type;
          isBinaryOperator = this.isBinaryOperator(operator);
        }

        // Final reduce to clean-up the stack.
        return stack.reduceRight(function (expr, stackItem) {
          return _this.markLocation(new Shift.BinaryExpression(stackItem.operator.name, stackItem.left, expr), stackItem.location);
        }, right);
      },
      writable: true,
      configurable: true
    },
    parseUnaryExpression: {
      value: function parseUnaryExpression() {
        if (this.lookahead.type.klass != TokenClass.Punctuator && this.lookahead.type.klass != TokenClass.Keyword) {
          return this.parsePostfixExpression();
        }
        var startLocation = this.getLocation();
        var operator = this.lookahead;
        if (!Parser.isPrefixOperator(operator.type)) {
          return this.parsePostfixExpression();
        }
        this.lex();
        var expr = this.parseUnaryExpression();
        switch (operator.type) {
          case TokenType.INC:
          case TokenType.DEC:
            // 11.4.4, 11.4.5;
            if (expr.type === "IdentifierExpression") {
              if (this.strict && isRestrictedWord(expr.identifier.name)) {
                throw this.createError(ErrorMessages.STRICT_LHS_PREFIX);
              }
            }

            if (!Parser.isValidSimpleAssignmentTarget(expr)) {
              throw this.createError(ErrorMessages.INVALID_LHS_IN_ASSIGNMENT);
            }
            break;
          case TokenType.DELETE:
            if (expr.type === "IdentifierExpression" && this.strict) {
              throw this.createError(ErrorMessages.STRICT_DELETE);
            }
            break;
          default:
            break;
        }

        return this.markLocation(new Shift.PrefixExpression(operator.value, expr), startLocation);
      },
      writable: true,
      configurable: true
    },
    parsePostfixExpression: {
      value: function parsePostfixExpression() {
        var startLocation = this.getLocation();

        var expr = this.parseLeftHandSideExpression(true);

        if (this.hasLineTerminatorBeforeNext) {
          return expr;
        }

        var operator = this.lookahead;
        if (operator.type !== TokenType.INC && operator.type !== TokenType.DEC) {
          return expr;
        }
        this.lex();
        // 11.3.1, 11.3.2;
        if (expr.type === "IdentifierExpression") {
          if (this.strict && isRestrictedWord(expr.identifier.name)) {
            throw this.createError(ErrorMessages.STRICT_LHS_POSTFIX);
          }
        }
        if (!Parser.isValidSimpleAssignmentTarget(expr)) {
          throw this.createError(ErrorMessages.INVALID_LHS_IN_ASSIGNMENT);
        }
        return this.markLocation(new Shift.PostfixExpression(expr, operator.value), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseLeftHandSideExpression: {
      value: function parseLeftHandSideExpression(allowCall) {
        var startLocation = this.getLocation();
        var previousAllowIn = this.allowIn;
        this.allowIn = allowCall;

        var expr = undefined,
            token = this.lookahead;

        if (this.eat(TokenType.SUPER)) {
          expr = this.markLocation(new Shift.Super(), startLocation);
          if (allowCall && this.inConstructor && this.match(TokenType.LPAREN)) {
            expr = this.markLocation(new Shift.CallExpression(expr, this.parseArgumentList()), startLocation);
          } else if (this.inMethod && this.match(TokenType.LBRACK)) {
            expr = this.markLocation(new Shift.ComputedMemberExpression(expr, this.parseComputedMember()), startLocation);
          } else if (this.inMethod && this.match(TokenType.PERIOD)) {
            expr = this.markLocation(new Shift.StaticMemberExpression(expr, this.parseNonComputedMember()), startLocation);
          } else {
            throw this.createUnexpected(token);
          }
        } else if (this.match(TokenType.NEW)) {
          expr = this.parseNewExpression();
        } else {
          expr = this.parsePrimaryExpression();
        }

        while (true) {
          if (allowCall && this.match(TokenType.LPAREN)) {
            expr = this.markLocation(new Shift.CallExpression(expr, this.parseArgumentList()), startLocation);
          } else if (this.match(TokenType.LBRACK)) {
            expr = this.markLocation(new Shift.ComputedMemberExpression(expr, this.parseComputedMember()), startLocation);
          } else if (this.match(TokenType.PERIOD)) {
            expr = this.markLocation(new Shift.StaticMemberExpression(expr, this.parseNonComputedMember()), startLocation);
          } else if (this.match(TokenType.TEMPLATE)) {
            expr = this.markLocation(new Shift.TemplateString(expr, this.parseTemplateElements()), startLocation);
          } else {
            break;
          }
        }

        this.allowIn = previousAllowIn;

        return expr;
      },
      writable: true,
      configurable: true
    },
    parseTemplateElements: {
      value: function parseTemplateElements() {
        var startLocation = this.getLocation();
        var token = this.lookahead;
        if (token.tail) {
          this.lex();
          return [this.markLocation(new Shift.TemplateLiteral(token.value.slice(1, -1)), startLocation)];
        }
        var result = [this.markLocation(new Shift.TemplateLiteral(this.lex().value.slice(1, -2)), startLocation)];
        while (true) {
          result.push(this.parseExpression());
          if (!this.match(TokenType.RBRACE)) {
            throw this.createILLEGAL();
          }
          this.index = this.startIndex;
          this.line = this.startLine;
          this.lineStart = this.startLineStart;
          this.lookahead = this.scanTemplateLiteral();
          startLocation = this.getLocation();
          token = this.lex();
          if (token.tail) {
            result.push(this.markLocation(new Shift.TemplateLiteral(token.value.slice(1, -1)), startLocation));
            return result;
          } else {
            result.push(this.markLocation(new Shift.TemplateLiteral(token.value.slice(1, -2)), startLocation));
          }
        }
      },
      writable: true,
      configurable: true
    },
    parseNonComputedMember: {
      value: function parseNonComputedMember() {
        this.expect(TokenType.PERIOD);
        if (!this.lookahead.type.klass.isIdentifierName) {
          throw this.createUnexpected(this.lookahead);
        } else {
          return this.lex().value;
        }
      },
      writable: true,
      configurable: true
    },
    parseComputedMember: {
      value: function parseComputedMember() {
        this.expect(TokenType.LBRACK);
        var expr = this.parseExpression();
        this.expect(TokenType.RBRACK);
        return expr;
      },
      writable: true,
      configurable: true
    },
    parseNewExpression: {
      value: function parseNewExpression() {
        var startLocation = this.getLocation();
        this.expect(TokenType.NEW);
        if (this.inFunctionBody && this.eat(TokenType.PERIOD)) {
          var ident = this.expect(TokenType.IDENTIFIER);
          if (ident.value !== "target") {
            throw this.createUnexpected(ident);
          }
          return this.markLocation(new Shift.NewTargetExpression(), startLocation);
        }
        var callee = this.parseLeftHandSideExpression();
        return this.markLocation(new Shift.NewExpression(callee, this.match(TokenType.LPAREN) ? this.parseArgumentList() : []), startLocation);
      },
      writable: true,
      configurable: true
    },
    parsePrimaryExpression: {
      value: function parsePrimaryExpression() {
        if (this.match(TokenType.LPAREN)) {
          return this.parseGroupExpression();
        }

        var startLocation = this.getLocation();

        switch (this.lookahead.type) {
          case TokenType.YIELD:
          case TokenType.IDENTIFIER:
            return this.markLocation(new Shift.IdentifierExpression(this.parseIdentifier()), startLocation);
          case TokenType.STRING:
            return this.parseStringLiteral();
          case TokenType.NUMBER:
            return this.parseNumericLiteral();
          case TokenType.THIS:
            this.lex();
            return this.markLocation(new Shift.ThisExpression(), startLocation);
          case TokenType.FUNCTION:
            return this.markLocation(this.parseFunction(true), startLocation);
          case TokenType.TRUE:
            this.lex();
            return this.markLocation(new Shift.LiteralBooleanExpression(true), startLocation);
          case TokenType.FALSE:
            this.lex();
            return this.markLocation(new Shift.LiteralBooleanExpression(false), startLocation);
          case TokenType.NULL:
            this.lex();
            return this.markLocation(new Shift.LiteralNullExpression(), startLocation);
          case TokenType.LBRACK:
            return this.parseArrayExpression();
          case TokenType.LBRACE:
            return this.parseObjectExpression();
          case TokenType.TEMPLATE:
            return this.markLocation(new Shift.TemplateString(null, this.parseTemplateElements()), startLocation);
          case TokenType.DIV:
          case TokenType.ASSIGN_DIV:
            this.lookahead = this.scanRegExp(this.lookahead.type === TokenType.DIV ? "/" : "/=");
            var token = this.lex();
            var lastSlash = token.value.lastIndexOf("/");
            var pattern = token.value.slice(1, lastSlash).replace("\\/", "/");
            var flags = token.value.slice(lastSlash + 1);
            try {
              RegExp(pattern, flags);
            } catch (unused) {
              throw this.createErrorWithLocation(token, ErrorMessages.INVALID_REGULAR_EXPRESSION);
            }
            return this.markLocation(new Shift.LiteralRegExpExpression(pattern, flags), startLocation);
          case TokenType.CLASS:
            return this.parseClass(true);
          default:
            throw this.createUnexpected(this.lex());
        }
      },
      writable: true,
      configurable: true
    },
    parseNumericLiteral: {
      value: function parseNumericLiteral() {
        var startLocation = this.getLocation();
        if (this.strict && this.lookahead.octal) {
          throw this.createErrorWithLocation(this.lookahead, ErrorMessages.STRICT_OCTAL_LITERAL);
        }
        var token2 = this.lex();
        var node = token2._value === 1 / 0 ? new Shift.LiteralInfinityExpression() : new Shift.LiteralNumericExpression(token2._value);
        return this.markLocation(node, startLocation);
      },
      writable: true,
      configurable: true
    },
    parseStringLiteral: {
      value: function parseStringLiteral() {
        var startLocation = this.getLocation();
        if (this.strict && this.lookahead.octal) {
          throw this.createErrorWithLocation(this.lookahead, ErrorMessages.STRICT_OCTAL_LITERAL);
        }
        var token2 = this.lex();
        return this.markLocation(new Shift.LiteralStringExpression(token2._value, token2.slice.text), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseIdentifierName: {
      value: function parseIdentifierName() {
        var startLocation = this.getLocation();
        if (this.lookahead.type.klass.isIdentifierName) {
          return this.markLocation(new Shift.Identifier(this.lex().value), startLocation);
        } else {
          throw this.createUnexpected(this.lookahead);
        }
      },
      writable: true,
      configurable: true
    },
    parseIdentifier: {
      value: function parseIdentifier() {
        var startLocation = this.getLocation();
        if (this.match(TokenType.YIELD)) {
          if (this.strict) {
            this.lookahead.type = TokenType.FUTURE_STRICT_RESERVED_WORD;
            throw this.createUnexpected(this.lookahead);
          } else if (this.allowYieldExpression) {
            throw this.createUnexpected(this.lookahead);
          } else if (this.inGeneratorBody) {
            throw this.createUnexpected(this.lookahead);
          } else {
            return this.markLocation(new Shift.Identifier(this.lex().value), startLocation);
          }
        }
        return this.markLocation(new Shift.Identifier(this.expect(TokenType.IDENTIFIER).value), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseArgumentList: {
      value: function parseArgumentList() {
        this.expect(TokenType.LPAREN);
        var args = this.parseArguments();
        this.expect(TokenType.RPAREN);
        return args;
      },
      writable: true,
      configurable: true
    },
    parseArguments: {
      value: function parseArguments() {
        var result = [];
        while (true) {
          if (this.match(TokenType.RPAREN) || this.eof()) {
            return result;
          }
          var startLocation = this.getLocation();
          var arg = undefined;
          if (this.eat(TokenType.ELLIPSIS)) {
            arg = this.parseAssignmentExpression();
            arg = this.markLocation(new Shift.SpreadElement(arg), startLocation);
          } else {
            arg = this.parseAssignmentExpression();
          }
          result.push(arg);
          if (!this.eat(TokenType.COMMA)) {
            break;
          }
        }
        return result;
      },
      writable: true,
      configurable: true
    },
    ensureArrow: {

      // 11.2 Left-Hand-Side Expressions;

      value: function ensureArrow() {
        if (this.hasLineTerminatorBeforeNext) {
          throw this.createError(ErrorMessages.UNEXPECTED_LINE_TERMINATOR);
        }
        if (!this.match(TokenType.ARROW)) {
          this.expect(TokenType.ARROW);
        }
      },
      writable: true,
      configurable: true
    },
    parseGroupExpression: {
      value: function parseGroupExpression() {
        var _this = this;
        var rest = null;
        var start = this.expect(TokenType.LPAREN);
        if (this.eat(TokenType.RPAREN)) {
          this.ensureArrow();
          return {
            type: ARROW_EXPRESSION_PARAMS,
            params: [],
            rest: null
          };
        } else if (this.eat(TokenType.ELLIPSIS)) {
          rest = new Shift.BindingIdentifier(this.parseIdentifier());
          this.expect(TokenType.RPAREN);
          this.ensureArrow();
          return {
            type: ARROW_EXPRESSION_PARAMS,
            params: [],
            rest: rest
          };
        }

        var possibleBindings = !this.match(TokenType.LPAREN);
        var startLocation = this.getLocation();
        var group = this.parseAssignmentExpression();
        var params = [group];

        while (this.eat(TokenType.COMMA)) {
          if (this.match(TokenType.ELLIPSIS)) {
            if (!possibleBindings) {
              throw this.createUnexpected(this.lookahead);
            }
            this.lex();
            rest = new Shift.BindingIdentifier(this.parseIdentifier());
            break;
          }
          possibleBindings = possibleBindings && !this.match(TokenType.LPAREN);
          var expr = this.parseAssignmentExpression();
          params.push(expr);
          group = this.markLocation(new Shift.BinaryExpression(",", group, expr), startLocation);
        }

        if (possibleBindings) {
          possibleBindings = params.every(Parser.isDestructuringAssignmentTargetWithDefault);
        }

        this.expect(TokenType.RPAREN);

        if (!this.hasLineTerminatorBeforeNext && this.match(TokenType.ARROW)) {
          var _ret = (function () {
            if (!possibleBindings) {
              throw _this.createErrorWithLocation(start, ErrorMessages.ILLEGAL_ARROW_FUNCTION_PARAMS);
            }
            // check dup params
            params = params.map(Parser.transformDestructuringAssignment);
            var allBoundNames = [];
            params.forEach(function (expr) {
              var boundNames = Parser.boundNames(expr);
              var dup = firstDuplicate(boundNames);
              if (dup) {
                throw _this.createError(ErrorMessages.DUPLICATE_BINDING, dup);
              }
              allBoundNames = allBoundNames.concat(boundNames);
            });
            if (rest) {
              allBoundNames.push(rest.identifier.name);
            }

            var dup = firstDuplicate(allBoundNames);
            if (dup) {
              throw _this.createError(ErrorMessages.STRICT_PARAM_DUPE);
            }

            var strict_restricted_word = allBoundNames.some(isRestrictedWord);
            if (strict_restricted_word) {
              throw _this.createError(ErrorMessages.STRICT_PARAM_NAME);
            }

            var strict_reserved_word = hasStrictModeReservedWord(allBoundNames);
            if (strict_reserved_word) {
              throw _this.createError(ErrorMessages.STRICT_RESERVED_WORD);
            }

            return {
              v: {
                type: ARROW_EXPRESSION_PARAMS,
                params: params,
                rest: rest
              }
            };
          })();

          // istanbul ignore next
          if (typeof _ret === "object") {
            return _ret.v;
          }
        } else {
          if (rest) {
            this.ensureArrow();
          }
          return group;
        }
      },
      writable: true,
      configurable: true
    },
    parseArrayExpression: {
      value: function parseArrayExpression() {
        var startLocation = this.getLocation();

        this.expect(TokenType.LBRACK);

        var elements = this.parseArrayExpressionElements();

        this.expect(TokenType.RBRACK);

        return this.markLocation(new Shift.ArrayExpression(elements), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseArrayExpressionElements: {
      value: function parseArrayExpressionElements() {
        var result = [];
        while (true) {
          if (this.match(TokenType.RBRACK)) {
            return result;
          }
          var el = undefined;

          if (this.eat(TokenType.COMMA)) {
            el = null;
          } else {
            var startLocation = this.getLocation();
            if (this.eat(TokenType.ELLIPSIS)) {
              el = this.parseAssignmentExpression();
              el = this.markLocation(new Shift.SpreadElement(el), startLocation);
            } else {
              el = this.parseAssignmentExpression();
            }
            if (!this.match(TokenType.RBRACK)) {
              this.expect(TokenType.COMMA);
            }
          }
          result.push(el);
        }
      },
      writable: true,
      configurable: true
    },
    parseObjectExpression: {
      value: function parseObjectExpression() {
        var startLocation = this.getLocation();

        this.expect(TokenType.LBRACE);

        var properties = this.parseObjectExpressionItems();

        this.expect(TokenType.RBRACE);

        return this.markLocation(new Shift.ObjectExpression(properties), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseObjectExpressionItems: {
      value: function parseObjectExpressionItems() {
        var result = [];
        var has__proto__ = [false];
        while (!this.match(TokenType.RBRACE)) {
          result.push(this.parsePropertyDefinition(has__proto__));
          if (!this.match(TokenType.RBRACE)) {
            this.expect(TokenType.COMMA);
          }
        }
        return result;
      },
      writable: true,
      configurable: true
    },
    parsePropertyDefinition: {
      value: function parsePropertyDefinition(has__proto__) {
        var startLocation = this.getLocation();
        var token = this.lookahead;

        var _parseMethodDefinition = this.parseMethodDefinition(false);

        var methodOrKey = _parseMethodDefinition.methodOrKey;
        var kind = _parseMethodDefinition.kind;
        switch (kind) {
          case "method":
            return methodOrKey;
          case "identifier":
            // IdentifierReference,
            if (this.eat(TokenType.ASSIGN)) {
              // CoverInitializedName
              if ((this.strict || this.allowYieldExpression) && methodOrKey.value === "yield") {
                throw this.createUnexpected(token);
              }
              return this.markLocation(new Shift.BindingPropertyIdentifier(new Shift.BindingIdentifier(new Shift.Identifier(methodOrKey.value)), this.parseAssignmentExpression()), startLocation);
            } else if (!this.match(TokenType.COLON)) {
              if (token.type !== TokenType.IDENTIFIER && token.type !== TokenType.YIELD || (this.strict || this.allowYieldExpression) && methodOrKey.value === "yield") {
                throw this.createUnexpected(token);
              }
              return this.markLocation(new Shift.ShorthandProperty(new Shift.Identifier(methodOrKey.value)), startLocation);
            }
        }

        // DataProperty
        this.expect(TokenType.COLON);
        if (methodOrKey.type === "StaticPropertyName") {
          if (methodOrKey.value === "__proto__") {
            if (!has__proto__[0]) {
              has__proto__[0] = true;
            } else {
              throw this.createErrorWithLocation(token, ErrorMessages.DUPLICATE_PROTO_PROPERTY);
            }
          }
        }
        return this.markLocation(new Shift.DataProperty(methodOrKey, this.parseAssignmentExpression()), startLocation);
      },
      writable: true,
      configurable: true
    },
    parsePropertyName: {
      value: function parsePropertyName() {
        // PropertyName[Yield,GeneratorParameter]:
        var token = this.lookahead;
        var startLocation = this.getLocation();

        if (this.eof()) {
          throw this.createUnexpected(token);
        }

        switch (token.type) {
          case TokenType.STRING:
            return this.markLocation(new Shift.StaticPropertyName(this.parseStringLiteral().value), startLocation);
          case TokenType.NUMBER:
            var numLiteral = this.parseNumericLiteral();
            return this.markLocation(new Shift.StaticPropertyName("" + (numLiteral.type === "LiteralInfinityExpression" ? 1 / 0 : numLiteral.value)), startLocation);
          case TokenType.LBRACK:
            var previousYield = this.allowYieldExpression;
            if (this.inGeneratorParameter) {
              this.allowYieldExpression = false;
            }
            this.expect(TokenType.LBRACK);
            var expr = this.parseAssignmentExpression();
            this.expect(TokenType.RBRACK);
            this.allowYieldExpression = previousYield;
            return this.markLocation(new Shift.ComputedPropertyName(expr), startLocation);
        }

        return this.markLocation(new Shift.StaticPropertyName(this.parseIdentifierName().name), startLocation);
      },
      writable: true,
      configurable: true
    },
    lookaheadPropertyName: {

      /**
       * Test if lookahead can be the beginning of a `PropertyName`.
       * @returns {boolean}
       */
      value: function lookaheadPropertyName() {
        switch (this.lookahead.type) {
          case TokenType.NUMBER:
          case TokenType.STRING:
          case TokenType.LBRACK:
            return true;
          default:
            return this.lookahead.type.klass.isIdentifierName;
        }
      },
      writable: true,
      configurable: true
    },
    parseMethodDefinition: {

      /**
       * Try to parse a method definition.
       *
       * If it turns out to be one of:
       *  * `IdentifierReference`
       *  * `CoverInitializedName` (`IdentifierReference "=" AssignmentExpression`)
       *  * `PropertyName : AssignmentExpression`
       * The the parser will stop at the end of the leading `Identifier` or `PropertyName` and return it.
       *
       * @returns {{methodOrKey: (Shift.Method|Shift.PropertyName), kind: string}}
       */
      value: function parseMethodDefinition(isClassProtoMethod) {
        var token = this.lookahead;
        var startLocation = this.getLocation();

        var isGenerator = !!this.eat(TokenType.MUL);

        var key = this.parsePropertyName();

        if (!isGenerator && token.type === TokenType.IDENTIFIER) {
          var _name = token.value;
          if (_name.length === 3) {
            // Property Assignment: Getter and Setter.
            if ("get" === _name && this.lookaheadPropertyName()) {
              key = this.parsePropertyName();
              this.expect(TokenType.LPAREN);
              this.expect(TokenType.RPAREN);
              var previousInConstructor = this.inConstructor;
              this.inConstructor = false;
              var previousInMethod = this.inMethod;
              this.inMethod = true;
              var _parseFunctionBody = this.parseFunctionBody();

              var _parseFunctionBody2 = _slicedToArray(_parseFunctionBody, 1);

              var body = _parseFunctionBody2[0];
              this.inConstructor = previousInConstructor;
              this.inMethod = previousInMethod;
              return {
                methodOrKey: this.markLocation(new Shift.Getter(key, body), startLocation),
                kind: "method"
              };
            } else if ("set" === _name && this.lookaheadPropertyName()) {
              key = this.parsePropertyName();
              this.expect(TokenType.LPAREN);
              var param = this.parseParam();
              var info = {};
              this.checkParam(param, token, [], info);
              this.expect(TokenType.RPAREN);
              var previousYield = this.allowYieldExpression;
              this.allowYieldExpression = false;
              var previousInConstructor = this.inConstructor;
              this.inConstructor = false;
              var previousInMethod = this.inMethod;
              this.inMethod = true;
              var _parseFunctionBody3 = this.parseFunctionBody();

              var _parseFunctionBody32 = _slicedToArray(_parseFunctionBody3, 2);

              var body = _parseFunctionBody32[0];
              var isStrict = _parseFunctionBody32[1];
              this.allowYieldExpression = previousYield;
              this.inConstructor = previousInConstructor;
              this.inMethod = previousInMethod;
              if (isStrict) {
                if (info.firstRestricted) {
                  throw this.createErrorWithLocation(info.firstRestricted, info.message);
                }
              }
              return {
                methodOrKey: this.markLocation(new Shift.Setter(key, param, body), startLocation),
                kind: "method"
              };
            }
          }
        }

        if (this.match(TokenType.LPAREN)) {
          var previousYield = this.allowYieldExpression;
          var previousInGeneratorParameter = this.inGeneratorParameter;
          this.inGeneratorParameter = isGenerator;
          this.allowYieldExpression = isGenerator;
          var paramInfo = this.parseParams(null);
          this.inGeneratorParameter = previousInGeneratorParameter;
          this.allowYieldExpression = previousYield;

          var previousInGeneratorBody = this.inGeneratorBody;
          var previousInConstructor = this.inConstructor;
          var previousInMethod = this.inMethod;
          this.allowYieldExpression = isGenerator;
          this.inConstructor = isClassProtoMethod && !isGenerator && this.hasClassHeritage && key.type === "StaticPropertyName" && key.value === "constructor";
          this.inMethod = true;

          if (isGenerator) {
            this.inGeneratorBody = true;
          }
          var _parseFunctionBody4 = this.parseFunctionBody();

          var _parseFunctionBody42 = _slicedToArray(_parseFunctionBody4, 1);

          var body = _parseFunctionBody42[0];
          this.allowYieldExpression = previousYield;
          this.inGeneratorBody = previousInGeneratorBody;
          this.inConstructor = previousInConstructor;
          this.inMethod = previousInMethod;

          if (paramInfo.firstRestricted) {
            throw this.createErrorWithLocation(paramInfo.firstRestricted, paramInfo.message);
          }
          return {
            methodOrKey: this.markLocation(new Shift.Method(isGenerator, key, paramInfo.params, paramInfo.rest, body), startLocation),
            kind: "method"
          };
        }

        return {
          methodOrKey: key,
          kind: token.type.klass.isIdentifierName ? "identifier" : "property"
        };
      },
      writable: true,
      configurable: true
    },
    parseClass: {
      value: function parseClass(isExpr) {
        var location = this.getLocation();
        this.expect(TokenType.CLASS);
        var id = null;
        var heritage = null;
        if (!isExpr || this.match(TokenType.IDENTIFIER)) {
          var _location = this.getLocation();
          id = this.markLocation(new Shift.BindingIdentifier(this.parseIdentifier()), _location);
        }

        var previousInGeneratorParameter = this.inGeneratorParameter;
        var previousParamYield = this.allowYieldExpression;
        var previousHasClassHeritage = this.hasClassHeritage;
        if (isExpr) {
          this.inGeneratorParameter = false;
          this.allowYieldExpression = false;
        }
        if (this.eat(TokenType.EXTENDS)) {
          heritage = this.parseLeftHandSideExpression(true);
        }

        this.expect(TokenType.LBRACE);
        var originalStrict = this.strict;
        this.strict = true;
        var methods = [];
        var hasConstructor = false;
        this.hasClassHeritage = heritage != null;
        while (!this.eat(TokenType.RBRACE)) {
          if (this.eat(TokenType.SEMICOLON)) {
            continue;
          }
          var methodToken = this.lookahead;
          var isStatic = false;
          var _parseMethodDefinition = this.parseMethodDefinition(true);

          var methodOrKey = _parseMethodDefinition.methodOrKey;
          var kind = _parseMethodDefinition.kind;
          if (kind === "identifier" && methodOrKey.value === "static") {
            isStatic = true;
            var _ref = this.parseMethodDefinition(false);

            methodOrKey = _ref.methodOrKey;
            kind = _ref.kind;
          }
          switch (kind) {
            case "method":
              var key = methodOrKey.name;
              if (!isStatic) {
                if (key.type === "StaticPropertyName" && key.value === "constructor") {
                  if (methodOrKey.type !== "Method" || methodOrKey.isGenerator) {
                    throw this.createErrorWithLocation(methodToken, "Constructors cannot be generators, getters or setters");
                  }
                  if (hasConstructor) {
                    throw this.createErrorWithLocation(methodToken, "Only one constructor is allowed in a class");
                  } else {
                    hasConstructor = true;
                  }
                }
              } else {
                if (key.type === "StaticPropertyName" && key.value === "prototype") {
                  throw this.createErrorWithLocation(methodToken, "Static class methods cannot be named 'prototype'");
                }
              }
              methods.push(new Shift.ClassElement(isStatic, methodOrKey));
              break;
            default:
              throw this.createError("Only methods are allowed in classes");
          }
        }
        this.strict = originalStrict;
        this.allowYieldExpression = previousParamYield;
        this.inGeneratorParameter = previousInGeneratorParameter;
        return this.markLocation(new (isExpr ? Shift.ClassExpression : Shift.ClassDeclaration)(id, heritage, methods), location);
      },
      writable: true,
      configurable: true
    },
    parseFunction: {
      value: function parseFunction(isExpr) {
        var allowGenerator = arguments[1] === undefined ? true : arguments[1];
        var startLocation = this.getLocation();

        this.expect(TokenType.FUNCTION);

        var id = null;
        var message = null;
        var firstRestricted = null;
        var isGenerator = allowGenerator && !!this.eat(TokenType.MUL);
        var previousGeneratorParameter = this.inGeneratorParameter;
        var previousYield = this.allowYieldExpression;
        var previousInGeneratorBody = this.inGeneratorBody;

        if (!isExpr || !this.match(TokenType.LPAREN)) {
          var token = this.lookahead;
          var _startLocation = this.getLocation();
          id = this.parseIdentifier();
          if (this.strict) {
            if (isRestrictedWord(id.name)) {
              throw this.createErrorWithLocation(token, ErrorMessages.STRICT_FUNCTION_NAME);
            }
          } else {
            if (isRestrictedWord(id.name)) {
              firstRestricted = token;
              message = ErrorMessages.STRICT_FUNCTION_NAME;
            } else if (isStrictModeReservedWordES5(id.name)) {
              firstRestricted = token;
              message = ErrorMessages.STRICT_RESERVED_WORD;
            }
          }
          id = this.markLocation(new Shift.BindingIdentifier(id), _startLocation);
        }
        this.inGeneratorParameter = isGenerator;
        this.allowYieldExpression = isGenerator;
        var info = this.parseParams(firstRestricted);
        this.inGeneratorParameter = previousGeneratorParameter;
        this.allowYieldExpression = previousYield;

        if (info.message != null) {
          message = info.message;
        }

        var previousStrict = this.strict;
        this.allowYieldExpression = isGenerator;
        if (isGenerator) {
          this.inGeneratorBody = true;
        }
        var previousInConstructor = this.inConstructor;
        this.inConstructor = false;
        var previousInMethod = this.inMethod;
        this.inMethod = false;
        var _parseFunctionBody = this.parseFunctionBody();

        var _parseFunctionBody2 = _slicedToArray(_parseFunctionBody, 2);

        var body = _parseFunctionBody2[0];
        var isStrict = _parseFunctionBody2[1];
        this.inGeneratorBody = previousInGeneratorBody;
        this.inConstructor = previousInConstructor;
        this.inMethod = previousInMethod;

        this.allowYieldExpression = previousYield;
        if (message != null) {
          if ((this.strict || isStrict) && info.firstRestricted != null) {
            throw this.createErrorWithLocation(info.firstRestricted, message);
          }
        }
        this.strict = previousStrict;
        var cons = isExpr ? Shift.FunctionExpression : Shift.FunctionDeclaration;
        return this.markLocation(new cons(isGenerator, id, info.params, info.rest, body), startLocation);
      },
      writable: true,
      configurable: true
    },
    parseParam: {
      value: function parseParam(bound, info) {
        var token = this.lookahead;
        if (this.match(TokenType.LPAREN)) {
          throw this.createUnexpected(this.lookahead);
        }
        var param = this.parseLeftHandSideExpression();
        if (this.eat(TokenType.ASSIGN)) {
          var previousInGeneratorParameter = this.inGeneratorParameter;
          var previousYieldExpression = this.allowYieldExpression;
          if (this.inGeneratorParameter) {
            this.allowYieldExpression = false;
          }
          this.inGeneratorParameter = false;
          param = this.markLocation(new Shift.AssignmentExpression("=", param, this.parseAssignmentExpression()));
          this.inGeneratorParameter = previousInGeneratorParameter;
          this.allowYieldExpression = previousYieldExpression;
        }
        if (!Parser.isDestructuringAssignmentTargetWithDefault(param)) {
          throw this.createUnexpected(token);
        }
        return Parser.transformDestructuringAssignment(param);
      },
      writable: true,
      configurable: true
    },
    checkParam: {
      value: function checkParam(param, token, bound, info) {
        var newBound = Parser.boundNames(param);
        [].push.apply(bound, newBound);

        if (firstDuplicate(newBound) != null) {
          throw this.createErrorWithLocation(token, ErrorMessages.DUPLICATE_BINDING, firstDuplicate(newBound));
        }

        if (this.strict) {
          if (newBound.some(isRestrictedWord)) {
            throw this.createErrorWithLocation(token, ErrorMessages.STRICT_PARAM_NAME);
          } else if (firstDuplicate(bound) != null) {
            throw this.createErrorWithLocation(token, ErrorMessages.STRICT_PARAM_DUPE);
          }
        } else if (info.firstRestricted == null) {
          if (newBound.some(isRestrictedWord)) {
            info.firstRestricted = token;
            info.message = ErrorMessages.STRICT_PARAM_NAME;
          } else if (hasStrictModeReservedWord(newBound)) {
            info.firstRestricted = token;
            info.message = ErrorMessages.STRICT_RESERVED_WORD;
          } else if (firstDuplicate(bound) != null) {
            info.firstRestricted = token;
            info.message = ErrorMessages.STRICT_PARAM_DUPE;
          }
        }
      },
      writable: true,
      configurable: true
    },
    parseParams: {
      value: function parseParams(fr) {
        var info = { params: [], rest: null };
        info.firstRestricted = fr;
        this.expect(TokenType.LPAREN);

        if (!this.match(TokenType.RPAREN)) {
          var bound = [];
          var seenRest = false;

          while (!this.eof()) {
            var token = this.lookahead;
            var startLocation = this.getLocation();
            var param = undefined;
            if (this.eat(TokenType.ELLIPSIS)) {
              token = this.lookahead;
              param = new Shift.BindingIdentifier(this.parseIdentifier());
              cpLoc(param.identifier, param);
              seenRest = true;
            } else {
              param = this.parseParam();
            }

            this.checkParam(param, token, bound, info);

            if (seenRest) {
              info.rest = param;
              break;
            }
            info.params.push(param);
            if (this.match(TokenType.RPAREN)) {
              break;
            }
            this.expect(TokenType.COMMA);
          }
        }

        this.expect(TokenType.RPAREN);
        return info;
      },
      writable: true,
      configurable: true
    }
  });

  return Parser;
})(Tokenizer);
//# sourceMappingURL=data:application/json;base64,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Q0FBQztBQUMzQixnQkFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3ZDLGdCQUFJLEtBQUssWUFBQSxDQUFDO0FBQ1YsZ0JBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUU7QUFDaEMsbUJBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQ3ZCLG1CQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7QUFDNUQsbUJBQUssQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQy9CLHNCQUFRLEdBQUcsSUFBSSxDQUFDO2FBQ2pCLE1BQU07QUFDTCxtQkFBSyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzthQUMzQjs7QUFFRCxnQkFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQzs7QUFFM0MsZ0JBQUksUUFBUSxFQUFFO0FBQ1osa0JBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0FBQ2xCLG9CQUFNO2FBQ1A7QUFDRCxnQkFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDeEIsZ0JBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDaEMsb0JBQU07YUFDUDtBQUNELGdCQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztXQUM5QjtTQUNGOztBQUVELFlBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzlCLGVBQU8sSUFBSSxDQUFDO09BQ2I7Ozs7OztTQWg4RFUsTUFBTTtHQUFTLFNBQVMiLCJmaWxlIjoic3JjL3BhcnNlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ29weXJpZ2h0IDIwMTQgU2hhcGUgU2VjdXJpdHksIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgKiBhcyBTaGlmdCBmcm9tIFwic2hpZnQtYXN0XCI7XG5cbmltcG9ydCB7aXNSZXN0cmljdGVkV29yZCwgaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkRVM1fSBmcm9tIFwiLi91dGlsc1wiO1xuXG5pbXBvcnQge0Vycm9yTWVzc2FnZXN9IGZyb20gXCIuL2Vycm9yc1wiO1xuXG5pbXBvcnQgVG9rZW5pemVyLCB7XG4gICAgVG9rZW5DbGFzcyxcbiAgICBUb2tlblR5cGUsXG4gICAgSWRlbnRpZmllclRva2VuLFxuICAgIElkZW50aWZpZXJMaWtlVG9rZW4sXG4gICAgTnVtZXJpY0xpdGVyYWxUb2tlbixcbiAgICBTdHJpbmdMaXRlcmFsVG9rZW59IGZyb20gXCIuL3Rva2VuaXplclwiO1xuXG4vLyBFbXB0eSBwYXJhbWV0ZXIgbGlzdCBmb3IgQXJyb3dFeHByZXNzaW9uXG5jb25zdCBBUlJPV19FWFBSRVNTSU9OX1BBUkFNUyA9IFwiQ292ZXJQYXJlbnRoZXNpemVkRXhwcmVzc2lvbkFuZEFycm93UGFyYW1ldGVyTGlzdFwiO1xuXG5jb25zdCBTVFJJQ1RfTU9ERV9SRVNFUlZFRF9XT1JEID0ge1xuICBcImltcGxlbWVudHNcIjogbnVsbCwgXCJpbnRlcmZhY2VcIjogbnVsbCwgXCJwYWNrYWdlXCI6IG51bGwsIFwicHJpdmF0ZVwiOiBudWxsLCBcInByb3RlY3RlZFwiOiBudWxsLFxuICBcInB1YmxpY1wiOiBudWxsLCBcInN0YXRpY1wiOiBudWxsLCBcInlpZWxkXCI6IG51bGwsIFwibGV0XCI6IG51bGxcbn07XG5cbmNvbnN0IFByZWNlZGVuY2UgPSB7XG4gIFNlcXVlbmNlOiAwLFxuICBZaWVsZDogMSxcbiAgQXNzaWdubWVudDogMSxcbiAgQ29uZGl0aW9uYWw6IDIsXG4gIEFycm93RnVuY3Rpb246IDIsXG4gIExvZ2ljYWxPUjogMyxcbiAgTG9naWNhbEFORDogNCxcbiAgQml0d2lzZU9SOiA1LFxuICBCaXR3aXNlWE9SOiA2LFxuICBCaXR3aXNlQU5EOiA3LFxuICBFcXVhbGl0eTogOCxcbiAgUmVsYXRpb25hbDogOSxcbiAgQml0d2lzZVNISUZUOiAxMCxcbiAgQWRkaXRpdmU6IDExLFxuICBNdWx0aXBsaWNhdGl2ZTogMTIsXG4gIFVuYXJ5OiAxMyxcbiAgUG9zdGZpeDogMTQsXG4gIENhbGw6IDE1LFxuICBOZXc6IDE2LFxuICBUYWdnZWRUZW1wbGF0ZTogMTcsXG4gIE1lbWJlcjogMTgsXG4gIFByaW1hcnk6IDE5XG59O1xuXG5jb25zdCBCaW5hcnlQcmVjZWRlbmNlID0ge1xuICBcInx8XCI6IFByZWNlZGVuY2UuTG9naWNhbE9SLFxuICBcIiYmXCI6IFByZWNlZGVuY2UuTG9naWNhbEFORCxcbiAgXCJ8XCI6IFByZWNlZGVuY2UuQml0d2lzZU9SLFxuICBcIl5cIjogUHJlY2VkZW5jZS5CaXR3aXNlWE9SLFxuICBcIiZcIjogUHJlY2VkZW5jZS5CaXR3aXNlQU5ELFxuICBcIj09XCI6IFByZWNlZGVuY2UuRXF1YWxpdHksXG4gIFwiIT1cIjogUHJlY2VkZW5jZS5FcXVhbGl0eSxcbiAgXCI9PT1cIjogUHJlY2VkZW5jZS5FcXVhbGl0eSxcbiAgXCIhPT1cIjogUHJlY2VkZW5jZS5FcXVhbGl0eSxcbiAgXCI8XCI6IFByZWNlZGVuY2UuUmVsYXRpb25hbCxcbiAgXCI+XCI6IFByZWNlZGVuY2UuUmVsYXRpb25hbCxcbiAgXCI8PVwiOiBQcmVjZWRlbmNlLlJlbGF0aW9uYWwsXG4gIFwiPj1cIjogUHJlY2VkZW5jZS5SZWxhdGlvbmFsLFxuICBcImluXCI6IFByZWNlZGVuY2UuUmVsYXRpb25hbCxcbiAgXCJpbnN0YW5jZW9mXCI6IFByZWNlZGVuY2UuUmVsYXRpb25hbCxcbiAgXCI8PFwiOiBQcmVjZWRlbmNlLkJpdHdpc2VTSElGVCxcbiAgXCI+PlwiOiBQcmVjZWRlbmNlLkJpdHdpc2VTSElGVCxcbiAgXCI+Pj5cIjogUHJlY2VkZW5jZS5CaXR3aXNlU0hJRlQsXG4gIFwiK1wiOiBQcmVjZWRlbmNlLkFkZGl0aXZlLFxuICBcIi1cIjogUHJlY2VkZW5jZS5BZGRpdGl2ZSxcbiAgXCIqXCI6IFByZWNlZGVuY2UuTXVsdGlwbGljYXRpdmUsXG4gIFwiJVwiOiBQcmVjZWRlbmNlLk11bHRpcGxpY2F0aXZlLFxuICBcIi9cIjogUHJlY2VkZW5jZS5NdWx0aXBsaWNhdGl2ZSxcbn07XG5cbmZ1bmN0aW9uIGNwTG9jKGZyb20sIHRvKSB7XG4gIGlmIChcImxvY1wiIGluIGZyb20pXG4gICAgdG8ubG9jID0gZnJvbS5sb2NcbiAgcmV0dXJuIHRvO1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0ge1tzdHJpbmddfSBzdHJpbmdzXG4gKiBAcmV0dXJucyB7c3RyaW5nP31cbiAqL1xuZnVuY3Rpb24gZmlyc3REdXBsaWNhdGUoc3RyaW5ncykge1xuICBpZiAoc3RyaW5ncy5sZW5ndGggPCAyKVxuICAgIHJldHVybiBudWxsO1xuICBsZXQgbWFwID0ge307XG4gIGZvciAobGV0IGN1cnNvciA9IDA7IGN1cnNvciA8IHN0cmluZ3MubGVuZ3RoOyBjdXJzb3IrKykge1xuICAgIGxldCBpZCA9ICckJyArIHN0cmluZ3NbY3Vyc29yXTtcbiAgICBpZiAobWFwLmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgcmV0dXJuIHN0cmluZ3NbY3Vyc29yXTtcbiAgICB9XG4gICAgbWFwW2lkXSA9IHRydWU7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGhhc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQoaWRzKSB7XG4gIHJldHVybiBpZHMuc29tZShpZCA9PiBTVFJJQ1RfTU9ERV9SRVNFUlZFRF9XT1JELmhhc093blByb3BlcnR5KGlkKSk7XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJzZXIgZXh0ZW5kcyBUb2tlbml6ZXIge1xuICBjb25zdHJ1Y3Rvcihzb3VyY2UpIHtcbiAgICBzdXBlcihzb3VyY2UpO1xuICAgIHRoaXMubGFiZWxTZXQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHRoaXMuYWxsb3dJbiA9IHRydWU7XG4gICAgdGhpcy5pbkl0ZXJhdGlvbiA9IGZhbHNlO1xuICAgIHRoaXMuaW5Td2l0Y2ggPSBmYWxzZTtcbiAgICB0aGlzLmluRnVuY3Rpb25Cb2R5ID0gZmFsc2U7XG4gICAgdGhpcy5pbk1ldGhvZCA9IGZhbHNlO1xuICAgIHRoaXMuaW5Db25zdHJ1Y3RvciA9IGZhbHNlO1xuICAgIHRoaXMuaGFzQ2xhc3NIZXJpdGFnZSA9IGZhbHNlO1xuICAgIHRoaXMuaW5HZW5lcmF0b3JQYXJhbWV0ZXIgPSBmYWxzZTtcbiAgICB0aGlzLmluR2VuZXJhdG9yQm9keSA9IGZhbHNlO1xuICAgIHRoaXMuYWxsb3dZaWVsZEV4cHJlc3Npb24gPSBmYWxzZTtcbiAgfVxuXG4gIGVhdCh0b2tlblR5cGUpIHtcbiAgICBpZiAodGhpcy5sb29rYWhlYWQudHlwZSA9PT0gdG9rZW5UeXBlKSB7XG4gICAgICByZXR1cm4gdGhpcy5sZXgoKTtcbiAgICB9XG4gIH1cblxuICBleHBlY3QodG9rZW5UeXBlKSB7XG4gICAgaWYgKHRoaXMubG9va2FoZWFkLnR5cGUgPT09IHRva2VuVHlwZSkge1xuICAgICAgcmV0dXJuIHRoaXMubGV4KCk7XG4gICAgfVxuICAgIHRocm93IHRoaXMuY3JlYXRlVW5leHBlY3RlZCh0aGlzLmxvb2thaGVhZCk7XG4gIH1cblxuICBtYXRjaChzdWJUeXBlKSB7XG4gICAgcmV0dXJuIHRoaXMubG9va2FoZWFkLnR5cGUgPT09IHN1YlR5cGU7XG4gIH1cblxuICBjb25zdW1lU2VtaWNvbG9uKCkge1xuICAgIGlmICh0aGlzLmhhc0xpbmVUZXJtaW5hdG9yQmVmb3JlTmV4dCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmVhdChUb2tlblR5cGUuU0VNSUNPTE9OKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5lb2YoKSAmJiAhdGhpcy5tYXRjaChUb2tlblR5cGUuUkJSQUNFKSkge1xuICAgICAgdGhyb3cgdGhpcy5jcmVhdGVVbmV4cGVjdGVkKHRoaXMubG9va2FoZWFkKTtcbiAgICB9XG4gIH1cblxuICAvLyB0aGlzIGlzIGEgbm8tb3AsIHJlc2VydmVkIGZvciBmdXR1cmUgdXNlXG4gIG1hcmtMb2NhdGlvbihub2RlLCBzdGFydExvY2F0aW9uKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICBwYXJzZVNjcmlwdCgpIHtcbiAgICBsZXQgbG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgbGV0IFtib2R5XSA9IHRoaXMucGFyc2VCb2R5KCk7XG4gICAgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5FT1MpKSB7XG4gICAgICB0aHJvdyB0aGlzLmNyZWF0ZVVuZXhwZWN0ZWQodGhpcy5sb29rYWhlYWQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LlNjcmlwdChib2R5KSwgbG9jYXRpb24pO1xuICB9XG5cbiAgcGFyc2VGdW5jdGlvbkJvZHkoKSB7XG4gICAgbGV0IHByZXZpb3VzU3RyaWN0ID0gdGhpcy5zdHJpY3Q7XG4gICAgbGV0IHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG5cbiAgICBsZXQgb2xkTGFiZWxTZXQgPSB0aGlzLmxhYmVsU2V0O1xuICAgIGxldCBvbGRJbkl0ZXJhdGlvbiA9IHRoaXMuaW5JdGVyYXRpb247XG4gICAgbGV0IG9sZEluU3dpdGNoID0gdGhpcy5pblN3aXRjaDtcbiAgICBsZXQgb2xkSW5GdW5jdGlvbkJvZHkgPSB0aGlzLmluRnVuY3Rpb25Cb2R5O1xuXG4gICAgdGhpcy5sYWJlbFNldCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgdGhpcy5pbkl0ZXJhdGlvbiA9IGZhbHNlO1xuICAgIHRoaXMuaW5Td2l0Y2ggPSBmYWxzZTtcbiAgICB0aGlzLmluRnVuY3Rpb25Cb2R5ID0gdHJ1ZTtcblxuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5MQlJBQ0UpO1xuICAgIGxldCBbYm9keSwgaXNTdHJpY3RdID0gdGhpcy5wYXJzZUJvZHkoKTtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuUkJSQUNFKTtcblxuICAgIGJvZHkgPSB0aGlzLm1hcmtMb2NhdGlvbihib2R5LCBzdGFydExvY2F0aW9uKTtcblxuICAgIHRoaXMubGFiZWxTZXQgPSBvbGRMYWJlbFNldDtcbiAgICB0aGlzLmluSXRlcmF0aW9uID0gb2xkSW5JdGVyYXRpb247XG4gICAgdGhpcy5pblN3aXRjaCA9IG9sZEluU3dpdGNoO1xuICAgIHRoaXMuaW5GdW5jdGlvbkJvZHkgPSBvbGRJbkZ1bmN0aW9uQm9keTtcbiAgICB0aGlzLnN0cmljdCA9IHByZXZpb3VzU3RyaWN0O1xuICAgIHJldHVybiBbYm9keSwgaXNTdHJpY3RdO1xuICB9XG5cbiAgcGFyc2VCb2R5KCkge1xuICAgIGxldCBsb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcbiAgICBsZXQgZGlyZWN0aXZlcyA9IFtdO1xuICAgIGxldCBzdGF0ZW1lbnRzID0gW107XG4gICAgbGV0IHBhcnNpbmdEaXJlY3RpdmVzID0gdHJ1ZTtcbiAgICBsZXQgaXNTdHJpY3QgPSB0aGlzLnN0cmljdDtcbiAgICBsZXQgZmlyc3RSZXN0cmljdGVkID0gbnVsbDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKHRoaXMuZW9mKCkgfHwgdGhpcy5tYXRjaChUb2tlblR5cGUuUkJSQUNFKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGxldCB0b2tlbiA9IHRoaXMubG9va2FoZWFkO1xuICAgICAgbGV0IHRleHQgPSB0b2tlbi5zbGljZS50ZXh0O1xuICAgICAgbGV0IGlzU3RyaW5nTGl0ZXJhbCA9IHRva2VuLnR5cGUgPT09IFRva2VuVHlwZS5TVFJJTkc7XG4gICAgICBsZXQgZGlyZWN0aXZlTG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgICBsZXQgc3RtdCA9IHRoaXMucGFyc2VTdGF0ZW1lbnRMaXN0SXRlbSgpO1xuICAgICAgaWYgKHBhcnNpbmdEaXJlY3RpdmVzKSB7XG4gICAgICAgIGlmIChpc1N0cmluZ0xpdGVyYWwgJiYgc3RtdC50eXBlID09PSBcIkV4cHJlc3Npb25TdGF0ZW1lbnRcIiAmJlxuICAgICAgICAgICAgc3RtdC5leHByZXNzaW9uLnR5cGUgPT09IFwiTGl0ZXJhbFN0cmluZ0V4cHJlc3Npb25cIikge1xuICAgICAgICAgIGlmICh0ZXh0ID09PSBcIlxcXCJ1c2Ugc3RyaWN0XFxcIlwiIHx8IHRleHQgPT09IFwiJ3VzZSBzdHJpY3QnXCIpIHtcbiAgICAgICAgICAgIGlzU3RyaWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RyaWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChmaXJzdFJlc3RyaWN0ZWQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yV2l0aExvY2F0aW9uKGZpcnN0UmVzdHJpY3RlZCwgRXJyb3JNZXNzYWdlcy5TVFJJQ1RfT0NUQUxfTElURVJBTCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChmaXJzdFJlc3RyaWN0ZWQgPT0gbnVsbCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgfVxuICAgICAgICAgIGRpcmVjdGl2ZXMucHVzaCh0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuRGlyZWN0aXZlKHRleHQuc2xpY2UoMSwgLTEpKSwgZGlyZWN0aXZlTG9jYXRpb24pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJzaW5nRGlyZWN0aXZlcyA9IGZhbHNlO1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaChzdG10KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBbdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LkZ1bmN0aW9uQm9keShkaXJlY3RpdmVzLCBzdGF0ZW1lbnRzKSwgbG9jYXRpb24pLCBpc1N0cmljdF07XG4gIH1cblxuICBwYXJzZVN0YXRlbWVudExpc3RJdGVtKCkge1xuICAgIGxldCBzdGFydExvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbigpO1xuICAgIGlmICh0aGlzLmVvZigpKSB7XG4gICAgICB0aHJvdyB0aGlzLmNyZWF0ZVVuZXhwZWN0ZWQodGhpcy5sb29rYWhlYWQpO1xuICAgIH1cbiAgICBzd2l0Y2ggKHRoaXMubG9va2FoZWFkLnR5cGUpIHtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkZVTkNUSU9OOlxuICAgICAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24odGhpcy5wYXJzZUZ1bmN0aW9uKGZhbHNlKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICBjYXNlIFRva2VuVHlwZS5DT05TVDpcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKHRoaXMucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uU3RhdGVtZW50KCksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgY2FzZSBUb2tlblR5cGUuQ0xBU1M6XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlQ2xhc3MoZmFsc2UpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKHRoaXMubG9va2FoZWFkLnZhbHVlID09PSAnbGV0Jykge1xuICAgICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbih0aGlzLnBhcnNlVmFyaWFibGVEZWNsYXJhdGlvblN0YXRlbWVudCgpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5wYXJzZVN0YXRlbWVudCgpO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlU3RhdGVtZW50KCkge1xuICAgIGxldCBzdGFydExvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbigpO1xuICAgIGlmICh0aGlzLmVvZigpKSB7XG4gICAgICB0aHJvdyB0aGlzLmNyZWF0ZVVuZXhwZWN0ZWQodGhpcy5sb29rYWhlYWQpO1xuICAgIH1cbiAgICBzd2l0Y2ggKHRoaXMubG9va2FoZWFkLnR5cGUpIHtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLlNFTUlDT0xPTjpcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKHRoaXMucGFyc2VFbXB0eVN0YXRlbWVudCgpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkxCUkFDRTpcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKHRoaXMucGFyc2VCbG9ja1N0YXRlbWVudCgpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkxQQVJFTjpcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKHRoaXMucGFyc2VFeHByZXNzaW9uU3RhdGVtZW50KCksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgY2FzZSBUb2tlblR5cGUuQlJFQUs6XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbih0aGlzLnBhcnNlQnJlYWtTdGF0ZW1lbnQoKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICBjYXNlIFRva2VuVHlwZS5DT05USU5VRTpcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKHRoaXMucGFyc2VDb250aW51ZVN0YXRlbWVudCgpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkRFQlVHR0VSOlxuICAgICAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24odGhpcy5wYXJzZURlYnVnZ2VyU3RhdGVtZW50KCksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgY2FzZSBUb2tlblR5cGUuRE86XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbih0aGlzLnBhcnNlRG9XaGlsZVN0YXRlbWVudCgpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkZPUjpcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKHRoaXMucGFyc2VGb3JTdGF0ZW1lbnQoKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICBjYXNlIFRva2VuVHlwZS5JRjpcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKHRoaXMucGFyc2VJZlN0YXRlbWVudCgpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLlJFVFVSTjpcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKHRoaXMucGFyc2VSZXR1cm5TdGF0ZW1lbnQoKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICBjYXNlIFRva2VuVHlwZS5TV0lUQ0g6XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbih0aGlzLnBhcnNlU3dpdGNoU3RhdGVtZW50KCksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgY2FzZSBUb2tlblR5cGUuVEhST1c6XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbih0aGlzLnBhcnNlVGhyb3dTdGF0ZW1lbnQoKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICBjYXNlIFRva2VuVHlwZS5UUlk6XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbih0aGlzLnBhcnNlVHJ5U3RhdGVtZW50KCksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgY2FzZSBUb2tlblR5cGUuVkFSOlxuICAgICAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24odGhpcy5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25TdGF0ZW1lbnQoKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICBjYXNlIFRva2VuVHlwZS5XSElMRTpcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKHRoaXMucGFyc2VXaGlsZVN0YXRlbWVudCgpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLldJVEg6XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbih0aGlzLnBhcnNlV2l0aFN0YXRlbWVudCgpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkNPTlNUOlxuICAgICAgY2FzZSBUb2tlblR5cGUuRlVOQ1RJT046XG4gICAgICBjYXNlIFRva2VuVHlwZS5DTEFTUzpcbiAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVVbmV4cGVjdGVkKHRoaXMubG9va2FoZWFkKTtcblxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBsZXQgZXhwciA9IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgLy8gMTIuMTIgTGFiZWxsZWQgU3RhdGVtZW50cztcbiAgICAgICAgaWYgKGV4cHIudHlwZSA9PT0gXCJJZGVudGlmaWVyRXhwcmVzc2lvblwiICYmIHRoaXMuZWF0KFRva2VuVHlwZS5DT0xPTikpIHtcbiAgICAgICAgICBsZXQga2V5ID0gXCIkXCIgKyBleHByLmlkZW50aWZpZXIubmFtZTtcbiAgICAgICAgICBpZiAoe30uaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmxhYmVsU2V0LCBrZXkpKSB7XG4gICAgICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKEVycm9yTWVzc2FnZXMuTEFCRUxfUkVERUNMQVJBVElPTiwgZXhwci5pZGVudGlmaWVyLm5hbWUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMubGFiZWxTZXRba2V5XSA9IHRydWU7XG4gICAgICAgICAgbGV0IGxhYmVsZWRCb2R5O1xuICAgICAgICAgIGlmICh0aGlzLm1hdGNoKFRva2VuVHlwZS5GVU5DVElPTikpIHtcbiAgICAgICAgICAgIGxhYmVsZWRCb2R5ID0gdGhpcy5wYXJzZUZ1bmN0aW9uKGZhbHNlLCBmYWxzZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxhYmVsZWRCb2R5ID0gdGhpcy5wYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWxldGUgdGhpcy5sYWJlbFNldFtrZXldO1xuICAgICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuTGFiZWxlZFN0YXRlbWVudChleHByLmlkZW50aWZpZXIsIGxhYmVsZWRCb2R5KSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5jb25zdW1lU2VtaWNvbG9uKCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5FeHByZXNzaW9uU3RhdGVtZW50KGV4cHIpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICB9XG5cbiAgcGFyc2VFbXB0eVN0YXRlbWVudCgpIHtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuU0VNSUNPTE9OKTtcbiAgICByZXR1cm4gbmV3IFNoaWZ0LkVtcHR5U3RhdGVtZW50O1xuICB9XG5cbiAgcGFyc2VCbG9ja1N0YXRlbWVudCgpIHtcbiAgICByZXR1cm4gbmV3IFNoaWZ0LkJsb2NrU3RhdGVtZW50KHRoaXMucGFyc2VCbG9jaygpKTtcbiAgfVxuXG4gIHBhcnNlRXhwcmVzc2lvblN0YXRlbWVudCgpIHtcbiAgICBsZXQgZXhwciA9IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG4gICAgdGhpcy5jb25zdW1lU2VtaWNvbG9uKCk7XG4gICAgcmV0dXJuIG5ldyBTaGlmdC5FeHByZXNzaW9uU3RhdGVtZW50KGV4cHIpO1xuICB9XG5cbiAgcGFyc2VCcmVha1N0YXRlbWVudCgpIHtcbiAgICBsZXQgdG9rZW4gPSB0aGlzLmxvb2thaGVhZDtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuQlJFQUspO1xuXG4gICAgLy8gQ2F0Y2ggdGhlIHZlcnkgY29tbW9uIGNhc2UgZmlyc3Q6IGltbWVkaWF0ZWx5IGEgc2VtaWNvbG9uIChVKzAwM0IpLlxuICAgIGlmICh0aGlzLmVhdChUb2tlblR5cGUuU0VNSUNPTE9OKSkge1xuICAgICAgaWYgKCEodGhpcy5pbkl0ZXJhdGlvbiB8fCB0aGlzLmluU3dpdGNoKSkge1xuICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yV2l0aExvY2F0aW9uKHRva2VuLCBFcnJvck1lc3NhZ2VzLklMTEVHQUxfQlJFQUspO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFNoaWZ0LkJyZWFrU3RhdGVtZW50KG51bGwpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmhhc0xpbmVUZXJtaW5hdG9yQmVmb3JlTmV4dCkge1xuICAgICAgaWYgKCEodGhpcy5pbkl0ZXJhdGlvbiB8fCB0aGlzLmluU3dpdGNoKSkge1xuICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yV2l0aExvY2F0aW9uKHRva2VuLCBFcnJvck1lc3NhZ2VzLklMTEVHQUxfQlJFQUspO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFNoaWZ0LkJyZWFrU3RhdGVtZW50KG51bGwpO1xuICAgIH1cblxuICAgIGxldCBsYWJlbCA9IG51bGw7XG4gICAgaWYgKHRoaXMubG9va2FoZWFkLnR5cGUgPT0gVG9rZW5UeXBlLklERU5USUZJRVIpIHtcbiAgICAgIGxhYmVsID0gdGhpcy5wYXJzZUlkZW50aWZpZXIoKTtcblxuICAgICAgbGV0IGtleSA9IFwiJFwiICsgbGFiZWwubmFtZTtcbiAgICAgIGlmICghe30uaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLmxhYmVsU2V0LCBrZXkpKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IoRXJyb3JNZXNzYWdlcy5VTktOT1dOX0xBQkVMLCBsYWJlbC5uYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgIGlmIChsYWJlbCA9PSBudWxsICYmICEodGhpcy5pbkl0ZXJhdGlvbiB8fCB0aGlzLmluU3dpdGNoKSkge1xuICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcldpdGhMb2NhdGlvbih0b2tlbiwgRXJyb3JNZXNzYWdlcy5JTExFR0FMX0JSRUFLKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFNoaWZ0LkJyZWFrU3RhdGVtZW50KGxhYmVsKTtcbiAgfVxuXG4gIHBhcnNlQ29udGludWVTdGF0ZW1lbnQoKSB7XG4gICAgbGV0IHRva2VuID0gdGhpcy5sb29rYWhlYWQ7XG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLkNPTlRJTlVFKTtcblxuICAgIC8vIENhdGNoIHRoZSB2ZXJ5IGNvbW1vbiBjYXNlIGZpcnN0OiBpbW1lZGlhdGVseSBhIHNlbWljb2xvbiAoVSswMDNCKS5cbiAgICBpZiAodGhpcy5lYXQoVG9rZW5UeXBlLlNFTUlDT0xPTikpIHtcbiAgICAgIGlmICghdGhpcy5pbkl0ZXJhdGlvbikge1xuICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yV2l0aExvY2F0aW9uKHRva2VuLCBFcnJvck1lc3NhZ2VzLklMTEVHQUxfQ09OVElOVUUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFNoaWZ0LkNvbnRpbnVlU3RhdGVtZW50KG51bGwpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmhhc0xpbmVUZXJtaW5hdG9yQmVmb3JlTmV4dCkge1xuICAgICAgaWYgKCF0aGlzLmluSXRlcmF0aW9uKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24odG9rZW4sIEVycm9yTWVzc2FnZXMuSUxMRUdBTF9DT05USU5VRSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgU2hpZnQuQ29udGludWVTdGF0ZW1lbnQobnVsbCk7XG4gICAgfVxuXG4gICAgbGV0IGxhYmVsID0gbnVsbDtcbiAgICBpZiAodGhpcy5sb29rYWhlYWQudHlwZSA9PSBUb2tlblR5cGUuSURFTlRJRklFUikge1xuICAgICAgbGFiZWwgPSB0aGlzLnBhcnNlSWRlbnRpZmllcigpO1xuXG4gICAgICBsZXQga2V5ID0gXCIkXCIgKyBsYWJlbC5uYW1lO1xuICAgICAgaWYgKCF7fS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMubGFiZWxTZXQsIGtleSkpIHtcbiAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihFcnJvck1lc3NhZ2VzLlVOS05PV05fTEFCRUwsIGxhYmVsLm5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29uc3VtZVNlbWljb2xvbigpO1xuICAgIGlmICghdGhpcy5pbkl0ZXJhdGlvbikge1xuICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcldpdGhMb2NhdGlvbih0b2tlbiwgRXJyb3JNZXNzYWdlcy5JTExFR0FMX0NPTlRJTlVFKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFNoaWZ0LkNvbnRpbnVlU3RhdGVtZW50KGxhYmVsKTtcbiAgfVxuXG5cbiAgcGFyc2VEZWJ1Z2dlclN0YXRlbWVudCgpIHtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuREVCVUdHRVIpO1xuICAgIHRoaXMuY29uc3VtZVNlbWljb2xvbigpO1xuICAgIHJldHVybiBuZXcgU2hpZnQuRGVidWdnZXJTdGF0ZW1lbnQ7XG4gIH1cblxuICBwYXJzZURvV2hpbGVTdGF0ZW1lbnQoKSB7XG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLkRPKTtcbiAgICBsZXQgb2xkSW5JdGVyYXRpb24gPSB0aGlzLmluSXRlcmF0aW9uO1xuICAgIHRoaXMuaW5JdGVyYXRpb24gPSB0cnVlO1xuXG4gICAgbGV0IGJvZHkgPSB0aGlzLnBhcnNlU3RhdGVtZW50KCk7XG4gICAgdGhpcy5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuXG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLldISUxFKTtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuTFBBUkVOKTtcbiAgICBsZXQgdGVzdCA9IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLlJQQVJFTik7XG4gICAgdGhpcy5lYXQoVG9rZW5UeXBlLlNFTUlDT0xPTik7XG5cbiAgICByZXR1cm4gbmV3IFNoaWZ0LkRvV2hpbGVTdGF0ZW1lbnQoYm9keSwgdGVzdCk7XG4gIH1cblxuICBzdGF0aWMgdHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnQobm9kZSkge1xuICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICBjYXNlIFwiT2JqZWN0RXhwcmVzc2lvblwiOlxuICAgICAgICByZXR1cm4gY3BMb2Mobm9kZSwgbmV3IFNoaWZ0Lk9iamVjdEJpbmRpbmcoXG4gICAgICAgICAgbm9kZS5wcm9wZXJ0aWVzLm1hcChQYXJzZXIudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnQpXG4gICAgICAgICkpO1xuICAgICAgY2FzZSBcIkRhdGFQcm9wZXJ0eVwiOlxuICAgICAgICByZXR1cm4gY3BMb2Mobm9kZSwgbmV3IFNoaWZ0LkJpbmRpbmdQcm9wZXJ0eVByb3BlcnR5KFxuICAgICAgICAgIG5vZGUubmFtZSxcbiAgICAgICAgICBQYXJzZXIudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnQobm9kZS5leHByZXNzaW9uKVxuICAgICAgICApKTtcbiAgICAgIGNhc2UgXCJTaG9ydGhhbmRQcm9wZXJ0eVwiOlxuICAgICAgICByZXR1cm4gY3BMb2Mobm9kZSwgbmV3IFNoaWZ0LkJpbmRpbmdQcm9wZXJ0eUlkZW50aWZpZXIoXG4gICAgICAgICAgY3BMb2Mobm9kZSwgbmV3IFNoaWZ0LkJpbmRpbmdJZGVudGlmaWVyKG5vZGUubmFtZSkpLFxuICAgICAgICAgIG51bGxcbiAgICAgICAgKSk7XG4gICAgICBjYXNlIFwiQXJyYXlFeHByZXNzaW9uXCI6XG4gICAgICAgIGxldCBsYXN0ID0gbm9kZS5lbGVtZW50c1tub2RlLmVsZW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAobGFzdCAhPSBudWxsICYmIGxhc3QudHlwZSA9PT0gXCJTcHJlYWRFbGVtZW50XCIpIHtcbiAgICAgICAgICByZXR1cm4gY3BMb2Mobm9kZSwgbmV3IFNoaWZ0LkFycmF5QmluZGluZyhcbiAgICAgICAgICAgIG5vZGUuZWxlbWVudHMuc2xpY2UoMCwgLTEpLm1hcChlID0+IGUgJiYgUGFyc2VyLnRyYW5zZm9ybURlc3RydWN0dXJpbmdBc3NpZ25tZW50KGUpKSxcbiAgICAgICAgICAgIGNwTG9jKGxhc3QuZXhwcmVzc2lvbiwgbmV3IFNoaWZ0LkJpbmRpbmdJZGVudGlmaWVyKGxhc3QuZXhwcmVzc2lvbi5pZGVudGlmaWVyKSlcbiAgICAgICAgICApKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gY3BMb2Mobm9kZSwgbmV3IFNoaWZ0LkFycmF5QmluZGluZyhcbiAgICAgICAgICAgIG5vZGUuZWxlbWVudHMubWFwKGUgPT4gZSAmJiBQYXJzZXIudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnQoZSkpLFxuICAgICAgICAgICAgbnVsbFxuICAgICAgICAgICkpO1xuICAgICAgICB9XG4gICAgICBjYXNlIFwiQXNzaWdubWVudEV4cHJlc3Npb25cIjpcbiAgICAgICAgcmV0dXJuIGNwTG9jKG5vZGUsIG5ldyBTaGlmdC5CaW5kaW5nV2l0aERlZmF1bHQoXG4gICAgICAgICAgUGFyc2VyLnRyYW5zZm9ybURlc3RydWN0dXJpbmdBc3NpZ25tZW50KG5vZGUuYmluZGluZyksXG4gICAgICAgICAgbm9kZS5leHByZXNzaW9uXG4gICAgICAgICkpO1xuICAgICAgY2FzZSBcIklkZW50aWZpZXJFeHByZXNzaW9uXCI6XG4gICAgICAgIHJldHVybiBjcExvYyhub2RlLCBuZXcgU2hpZnQuQmluZGluZ0lkZW50aWZpZXIobm9kZS5pZGVudGlmaWVyKSk7XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgc3RhdGljIGlzRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnRUYXJnZXQobm9kZSkge1xuICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICBjYXNlIFwiT2JqZWN0RXhwcmVzc2lvblwiOlxuICAgICAgICByZXR1cm4gbm9kZS5wcm9wZXJ0aWVzLmV2ZXJ5KHAgPT5cbiAgICAgICAgICBwLnR5cGUgPT09IFwiQmluZGluZ1Byb3BlcnR5SWRlbnRpZmllclwiIHx8XG4gICAgICAgICAgcC50eXBlID09PSBcIlNob3J0aGFuZFByb3BlcnR5XCIgfHxcbiAgICAgICAgICBwLnR5cGUgPT09IFwiRGF0YVByb3BlcnR5XCIgJiZcbiAgICAgICAgICAgIFBhcnNlci5pc0Rlc3RydWN0dXJpbmdBc3NpZ25tZW50VGFyZ2V0V2l0aERlZmF1bHQocC5leHByZXNzaW9uKVxuICAgICAgICApO1xuICAgICAgY2FzZSBcIkFycmF5RXhwcmVzc2lvblwiOlxuICAgICAgICBpZiAobm9kZS5lbGVtZW50cy5sZW5ndGggPT09IDApXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoIW5vZGUuZWxlbWVudHMuc2xpY2UoMCwgLTEpLmZpbHRlcihlID0+IGUgIT0gbnVsbCkuZXZlcnkoUGFyc2VyLmlzRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnRUYXJnZXRXaXRoRGVmYXVsdCkpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBsZXQgbGFzdCA9IG5vZGUuZWxlbWVudHNbbm9kZS5lbGVtZW50cy5sZW5ndGggLSAxXTtcbiAgICAgICAgcmV0dXJuIGxhc3QgIT0gbnVsbCAmJiBsYXN0LnR5cGUgPT09IFwiU3ByZWFkRWxlbWVudFwiXG4gICAgICAgICAgPyBsYXN0LmV4cHJlc3Npb24udHlwZSA9PT0gXCJJZGVudGlmaWVyRXhwcmVzc2lvblwiXG4gICAgICAgICAgOiBsYXN0ID09IG51bGwgfHwgUGFyc2VyLmlzRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnRUYXJnZXRXaXRoRGVmYXVsdChsYXN0KTtcbiAgICAgIGNhc2UgXCJBcnJheUJpbmRpbmdcIjpcbiAgICAgIGNhc2UgXCJCaW5kaW5nSWRlbnRpZmllclwiOlxuICAgICAgY2FzZSBcIkJpbmRpbmdQcm9wZXJ0eUlkZW50aWZpZXJcIjpcbiAgICAgIGNhc2UgXCJCaW5kaW5nUHJvcGVydHlQcm9wZXJ0eVwiOlxuICAgICAgY2FzZSBcIkJpbmRpbmdXaXRoRGVmYXVsdFwiOlxuICAgICAgY2FzZSBcIklkZW50aWZpZXJFeHByZXNzaW9uXCI6XG4gICAgICBjYXNlIFwiT2JqZWN0QmluZGluZ1wiOlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc3RhdGljIGlzRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnRUYXJnZXRXaXRoRGVmYXVsdChub2RlKSB7XG4gICAgcmV0dXJuIFBhcnNlci5pc0Rlc3RydWN0dXJpbmdBc3NpZ25tZW50VGFyZ2V0KG5vZGUpIHx8XG4gICAgICBub2RlLnR5cGUgPT09IFwiQXNzaWdubWVudEV4cHJlc3Npb25cIiAmJiBub2RlLm9wZXJhdG9yID09PSBcIj1cIiAmJlxuICAgICAgUGFyc2VyLmlzRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnRUYXJnZXQobm9kZS5iaW5kaW5nKTtcbiAgfVxuXG4gIHN0YXRpYyBpc1ZhbGlkU2ltcGxlQXNzaWdubWVudFRhcmdldChub2RlKSB7XG4gICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgIGNhc2UgXCJJZGVudGlmaWVyRXhwcmVzc2lvblwiOlxuICAgICAgY2FzZSBcIkNvbXB1dGVkTWVtYmVyRXhwcmVzc2lvblwiOlxuICAgICAgY2FzZSBcIlN0YXRpY01lbWJlckV4cHJlc3Npb25cIjpcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHN0YXRpYyBib3VuZE5hbWVzKG5vZGUpIHtcbiAgICBzd2l0Y2gobm9kZS50eXBlKSB7XG4gICAgICBjYXNlIFwiQmluZGluZ0lkZW50aWZpZXJcIjpcbiAgICAgICAgcmV0dXJuIFtub2RlLmlkZW50aWZpZXIubmFtZV07XG4gICAgICBjYXNlIFwiQmluZGluZ1dpdGhEZWZhdWx0XCI6XG4gICAgICAgIHJldHVybiBQYXJzZXIuYm91bmROYW1lcyhub2RlLmJpbmRpbmcpO1xuICAgICAgY2FzZSBcIkFycmF5QmluZGluZ1wiOiB7XG4gICAgICAgIGxldCBuYW1lcyA9IFtdO1xuICAgICAgICBub2RlLmVsZW1lbnRzLmZpbHRlcihlID0+IGUgIT0gbnVsbCkuZm9yRWFjaChlID0+IFtdLnB1c2guYXBwbHkobmFtZXMsIFBhcnNlci5ib3VuZE5hbWVzKGUpKSk7XG4gICAgICAgIGlmIChub2RlLnJlc3RFbGVtZW50ICE9IG51bGwpIHtcbiAgICAgICAgICBuYW1lcy5wdXNoKG5vZGUucmVzdEVsZW1lbnQuaWRlbnRpZmllci5uYW1lKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmFtZXM7XG4gICAgICB9XG4gICAgICBjYXNlIFwiT2JqZWN0QmluZGluZ1wiOiB7XG4gICAgICAgIGxldCBuYW1lcyA9IFtdO1xuICAgICAgICBub2RlLnByb3BlcnRpZXMuZm9yRWFjaChwID0+IHtcbiAgICAgICAgICBzd2l0Y2ggKHAudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBcIkJpbmRpbmdQcm9wZXJ0eUlkZW50aWZpZXJcIjpcbiAgICAgICAgICAgICAgbmFtZXMucHVzaChwLmlkZW50aWZpZXIuaWRlbnRpZmllci5uYW1lKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiQmluZGluZ1Byb3BlcnR5UHJvcGVydHlcIjpcbiAgICAgICAgICAgICAgW10ucHVzaC5hcHBseShuYW1lcywgUGFyc2VyLmJvdW5kTmFtZXMocC5iaW5kaW5nKSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgLy8gaXN0YW5idWwgaWdub3JlIG5leHRcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImJvdW5kTmFtZXMgY2FsbGVkIG9uIE9iamVjdEJpbmRpbmcgd2l0aCBpbnZhbGlkIHByb3BlcnR5OiBcIiArIHAudHlwZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG5hbWVzO1xuICAgICAgfVxuICAgICAgY2FzZSBcIkNvbXB1dGVkTWVtYmVyRXhwcmVzc2lvblwiOlxuICAgICAgY2FzZSBcIlN0YXRpY01lbWJlckV4cHJlc3Npb25cIjpcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICAvLyBpc3RhbmJ1bCBpZ25vcmUgbmV4dFxuICAgIHRocm93IG5ldyBFcnJvcihcImJvdW5kTmFtZXMgY2FsbGVkIG9uIGludmFsaWQgYXNzaWdubWVudCB0YXJnZXQ6IFwiICsgbm9kZS50eXBlKTtcbiAgfVxuXG4gIHBhcnNlRm9yU3RhdGVtZW50KCkge1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5GT1IpO1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5MUEFSRU4pO1xuICAgIGxldCB0ZXN0ID0gbnVsbDtcbiAgICBsZXQgcmlnaHQgPSBudWxsO1xuICAgIGlmICh0aGlzLmVhdChUb2tlblR5cGUuU0VNSUNPTE9OKSkge1xuICAgICAgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5TRU1JQ09MT04pKSB7XG4gICAgICAgIHRlc3QgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgfVxuICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLlNFTUlDT0xPTik7XG4gICAgICBpZiAoIXRoaXMubWF0Y2goVG9rZW5UeXBlLlJQQVJFTikpIHtcbiAgICAgICAgcmlnaHQgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBTaGlmdC5Gb3JTdGF0ZW1lbnQoXG4gICAgICAgICAgbnVsbCxcbiAgICAgICAgICB0ZXN0LFxuICAgICAgICAgIHJpZ2h0LFxuICAgICAgICAgIHRoaXMuZ2V0SXRlcmF0b3JTdGF0ZW1lbnRFcGlsb2d1ZSgpXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5tYXRjaChUb2tlblR5cGUuVkFSKSB8fCB0aGlzLm1hdGNoKFRva2VuVHlwZS5JREVOVElGSUVSKSAmJiB0aGlzLmxvb2thaGVhZC52YWx1ZSA9PT0gJ2xldCcpIHtcbiAgICAgICAgbGV0IHByZXZpb3VzQWxsb3dJbiA9IHRoaXMuYWxsb3dJbjtcbiAgICAgICAgdGhpcy5hbGxvd0luID0gZmFsc2U7XG4gICAgICAgIGxldCBpbml0RGVjbCA9IHRoaXMucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uKCk7XG4gICAgICAgIHRoaXMuYWxsb3dJbiA9IHByZXZpb3VzQWxsb3dJbjtcblxuICAgICAgICBpZiAoaW5pdERlY2wuZGVjbGFyYXRvcnMubGVuZ3RoID09PSAxICYmICh0aGlzLm1hdGNoKFRva2VuVHlwZS5JTikgfHwgdGhpcy5tYXRjaChUb2tlblR5cGUuT0YpKSkge1xuICAgICAgICAgIGxldCB0eXBlID0gdGhpcy5tYXRjaChUb2tlblR5cGUuSU4pID9cbiAgICAgICAgICAgIFNoaWZ0LkZvckluU3RhdGVtZW50IDogU2hpZnQuRm9yT2ZTdGF0ZW1lbnQ7XG4gICAgICAgICAgaWYgKGluaXREZWNsLmRlY2xhcmF0b3JzWzBdLmluaXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgdHlwZSA9PSBTaGlmdC5Gb3JJblN0YXRlbWVudCA/XG4gICAgICAgICAgICAgIHRoaXMuY3JlYXRlRXJyb3IoRXJyb3JNZXNzYWdlcy5JTlZBTElEX1ZBUl9JTklUX0ZPUl9JTikgOlxuICAgICAgICAgICAgICB0aGlzLmNyZWF0ZUVycm9yKEVycm9yTWVzc2FnZXMuSU5WQUxJRF9WQVJfSU5JVF9GT1JfT0YpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmxleCgpO1xuICAgICAgICAgIHJpZ2h0ID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICByZXR1cm4gbmV3IHR5cGUoaW5pdERlY2wsIHJpZ2h0LCB0aGlzLmdldEl0ZXJhdG9yU3RhdGVtZW50RXBpbG9ndWUoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLlNFTUlDT0xPTik7XG4gICAgICAgICAgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5TRU1JQ09MT04pKSB7XG4gICAgICAgICAgICB0ZXN0ID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLlNFTUlDT0xPTik7XG4gICAgICAgICAgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5SUEFSRU4pKSB7XG4gICAgICAgICAgICByaWdodCA9IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXcgU2hpZnQuRm9yU3RhdGVtZW50KGluaXREZWNsLCB0ZXN0LCByaWdodCwgdGhpcy5nZXRJdGVyYXRvclN0YXRlbWVudEVwaWxvZ3VlKCkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcHJldmlvdXNBbGxvd0luID0gdGhpcy5hbGxvd0luO1xuICAgICAgICB0aGlzLmFsbG93SW4gPSBmYWxzZTtcbiAgICAgICAgbGV0IGluaXQgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICB0aGlzLmFsbG93SW4gPSBwcmV2aW91c0FsbG93SW47XG5cbiAgICAgICAgaWYgKHRoaXMubWF0Y2goVG9rZW5UeXBlLklOKSB8fCB0aGlzLm1hdGNoKFRva2VuVHlwZS5PRikpIHtcbiAgICAgICAgICBpZiAoIVBhcnNlci5pc1ZhbGlkU2ltcGxlQXNzaWdubWVudFRhcmdldChpbml0KSkge1xuICAgICAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihFcnJvck1lc3NhZ2VzLklOVkFMSURfTEhTX0lOX0ZPUl9JTik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IHR5cGUgPSB0aGlzLm1hdGNoKFRva2VuVHlwZS5JTikgP1xuICAgICAgICAgICAgU2hpZnQuRm9ySW5TdGF0ZW1lbnQgOiBTaGlmdC5Gb3JPZlN0YXRlbWVudDtcblxuICAgICAgICAgIHRoaXMubGV4KCk7XG4gICAgICAgICAgcmlnaHQgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgICAgcmV0dXJuIG5ldyB0eXBlKGluaXQsIHJpZ2h0LCB0aGlzLmdldEl0ZXJhdG9yU3RhdGVtZW50RXBpbG9ndWUoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLlNFTUlDT0xPTik7XG4gICAgICAgICAgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5TRU1JQ09MT04pKSB7XG4gICAgICAgICAgICB0ZXN0ID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLlNFTUlDT0xPTik7XG4gICAgICAgICAgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5SUEFSRU4pKSB7XG4gICAgICAgICAgICByaWdodCA9IHRoaXMucGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXcgU2hpZnQuRm9yU3RhdGVtZW50KGluaXQsIHRlc3QsIHJpZ2h0LCB0aGlzLmdldEl0ZXJhdG9yU3RhdGVtZW50RXBpbG9ndWUoKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRJdGVyYXRvclN0YXRlbWVudEVwaWxvZ3VlKCkge1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5SUEFSRU4pO1xuICAgIGxldCBvbGRJbkl0ZXJhdGlvbiA9IHRoaXMuaW5JdGVyYXRpb247XG4gICAgdGhpcy5pbkl0ZXJhdGlvbiA9IHRydWU7XG4gICAgbGV0IGJvZHkgPSB0aGlzLnBhcnNlU3RhdGVtZW50KCk7XG4gICAgdGhpcy5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuICAgIHJldHVybiBib2R5O1xuICB9XG5cbiAgcGFyc2VJZlN0YXRlbWVudCgpIHtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuSUYpO1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5MUEFSRU4pO1xuICAgIGxldCB0ZXN0ID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcblxuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5SUEFSRU4pO1xuICAgIGxldCBjb25zZXF1ZW50ID0gdGhpcy5wYXJzZVN0YXRlbWVudCgpO1xuICAgIGxldCBhbHRlcm5hdGUgPSBudWxsO1xuICAgIGlmICh0aGlzLmVhdChUb2tlblR5cGUuRUxTRSkpIHtcbiAgICAgIGFsdGVybmF0ZSA9IHRoaXMucGFyc2VTdGF0ZW1lbnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBTaGlmdC5JZlN0YXRlbWVudCh0ZXN0LCBjb25zZXF1ZW50LCBhbHRlcm5hdGUpO1xuICB9XG5cbiAgcGFyc2VSZXR1cm5TdGF0ZW1lbnQoKSB7XG4gICAgbGV0IGFyZ3VtZW50ID0gbnVsbDtcblxuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5SRVRVUk4pO1xuICAgIGlmICghdGhpcy5pbkZ1bmN0aW9uQm9keSkge1xuICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihFcnJvck1lc3NhZ2VzLklMTEVHQUxfUkVUVVJOKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5oYXNMaW5lVGVybWluYXRvckJlZm9yZU5leHQpIHtcbiAgICAgIHJldHVybiBuZXcgU2hpZnQuUmV0dXJuU3RhdGVtZW50KG51bGwpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5tYXRjaChUb2tlblR5cGUuU0VNSUNPTE9OKSkge1xuICAgICAgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5SQlJBQ0UpICYmICF0aGlzLmVvZigpKSB7XG4gICAgICAgIGFyZ3VtZW50ID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvbnN1bWVTZW1pY29sb24oKTtcbiAgICByZXR1cm4gbmV3IFNoaWZ0LlJldHVyblN0YXRlbWVudChhcmd1bWVudCk7XG4gIH1cblxuICBwYXJzZVdpdGhTdGF0ZW1lbnQoKSB7XG4gICAgaWYgKHRoaXMuc3RyaWN0KSB7XG4gICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKEVycm9yTWVzc2FnZXMuU1RSSUNUX01PREVfV0lUSCk7XG4gICAgfVxuXG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLldJVEgpO1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5MUEFSRU4pO1xuICAgIGxldCBvYmplY3QgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5SUEFSRU4pO1xuICAgIGxldCBib2R5ID0gdGhpcy5wYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgcmV0dXJuIG5ldyBTaGlmdC5XaXRoU3RhdGVtZW50KG9iamVjdCwgYm9keSk7XG4gIH1cblxuICBwYXJzZVN3aXRjaFN0YXRlbWVudCgpIHtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuU1dJVENIKTtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuTFBBUkVOKTtcbiAgICBsZXQgZGlzY3JpbWluYW50ID0gdGhpcy5wYXJzZUV4cHJlc3Npb24oKTtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuUlBBUkVOKTtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuTEJSQUNFKTtcblxuICAgIGlmICh0aGlzLmVhdChUb2tlblR5cGUuUkJSQUNFKSkge1xuICAgICAgcmV0dXJuIG5ldyBTaGlmdC5Td2l0Y2hTdGF0ZW1lbnQoZGlzY3JpbWluYW50LCBbXSk7XG4gICAgfVxuICAgIGxldCBvbGRJblN3aXRjaCA9IHRoaXMuaW5Td2l0Y2g7XG4gICAgdGhpcy5pblN3aXRjaCA9IHRydWU7XG5cbiAgICBsZXQgY2FzZXMgPSB0aGlzLnBhcnNlU3dpdGNoQ2FzZXMoKTtcblxuICAgIGlmICh0aGlzLm1hdGNoKFRva2VuVHlwZS5ERUZBVUxUKSkge1xuICAgICAgbGV0IHN3aXRjaERlZmF1bHQgPSB0aGlzLnBhcnNlU3dpdGNoRGVmYXVsdCgpO1xuICAgICAgbGV0IHBvc3REZWZhdWx0Q2FzZXMgPSB0aGlzLnBhcnNlU3dpdGNoQ2FzZXMoKTtcbiAgICAgIGlmICh0aGlzLm1hdGNoKFRva2VuVHlwZS5ERUZBVUxUKSkge1xuICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKEVycm9yTWVzc2FnZXMuTVVMVElQTEVfREVGQVVMVFNfSU5fU1dJVENIKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuaW5Td2l0Y2ggPSBvbGRJblN3aXRjaDtcbiAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5SQlJBQ0UpO1xuICAgICAgcmV0dXJuIG5ldyBTaGlmdC5Td2l0Y2hTdGF0ZW1lbnRXaXRoRGVmYXVsdChkaXNjcmltaW5hbnQsIGNhc2VzLCBzd2l0Y2hEZWZhdWx0LCBwb3N0RGVmYXVsdENhc2VzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pblN3aXRjaCA9IG9sZEluU3dpdGNoO1xuICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLlJCUkFDRSk7XG4gICAgICByZXR1cm4gbmV3IFNoaWZ0LlN3aXRjaFN0YXRlbWVudChkaXNjcmltaW5hbnQsIGNhc2VzKTtcbiAgICB9XG4gIH1cblxuICBwYXJzZVN3aXRjaENhc2VzKCkge1xuICAgIGxldCByZXN1bHQgPSBbXTtcbiAgICB3aGlsZSAoISh0aGlzLmVvZigpIHx8IHRoaXMubWF0Y2goVG9rZW5UeXBlLlJCUkFDRSkgfHwgdGhpcy5tYXRjaChUb2tlblR5cGUuREVGQVVMVCkpKSB7XG4gICAgICByZXN1bHQucHVzaCh0aGlzLnBhcnNlU3dpdGNoQ2FzZSgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHBhcnNlU3dpdGNoQ2FzZSgpIHtcbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuQ0FTRSk7XG4gICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5Td2l0Y2hDYXNlKHRoaXMucGFyc2VFeHByZXNzaW9uKCksIHRoaXMucGFyc2VTd2l0Y2hDYXNlQm9keSgpKSwgc3RhcnRMb2NhdGlvbik7XG4gIH1cblxuICBwYXJzZVN3aXRjaERlZmF1bHQoKSB7XG4gICAgbGV0IHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLkRFRkFVTFQpO1xuICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuU3dpdGNoRGVmYXVsdCh0aGlzLnBhcnNlU3dpdGNoQ2FzZUJvZHkoKSksIHN0YXJ0TG9jYXRpb24pO1xuICB9XG5cbiAgcGFyc2VTd2l0Y2hDYXNlQm9keSgpIHtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuQ09MT04pO1xuICAgIHJldHVybiB0aGlzLnBhcnNlU3RhdGVtZW50TGlzdEluU3dpdGNoQ2FzZUJvZHkoKTtcbiAgfVxuXG4gIHBhcnNlU3RhdGVtZW50TGlzdEluU3dpdGNoQ2FzZUJvZHkoKSB7XG4gICAgbGV0IHJlc3VsdCA9IFtdO1xuICAgIHdoaWxlICghKHRoaXMuZW9mKCkgfHwgdGhpcy5tYXRjaChUb2tlblR5cGUuUkJSQUNFKSB8fCB0aGlzLm1hdGNoKFRva2VuVHlwZS5ERUZBVUxUKVxuICAgIHx8IHRoaXMubWF0Y2goVG9rZW5UeXBlLkNBU0UpKSkge1xuICAgICAgcmVzdWx0LnB1c2godGhpcy5wYXJzZVN0YXRlbWVudCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHBhcnNlVGhyb3dTdGF0ZW1lbnQoKSB7XG4gICAgbGV0IHRva2VuID0gdGhpcy5leHBlY3QoVG9rZW5UeXBlLlRIUk9XKTtcblxuICAgIGlmICh0aGlzLmhhc0xpbmVUZXJtaW5hdG9yQmVmb3JlTmV4dCkge1xuICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcldpdGhMb2NhdGlvbih0b2tlbiwgRXJyb3JNZXNzYWdlcy5ORVdMSU5FX0FGVEVSX1RIUk9XKTtcbiAgICB9XG5cbiAgICBsZXQgYXJndW1lbnQgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgdGhpcy5jb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICByZXR1cm4gbmV3IFNoaWZ0LlRocm93U3RhdGVtZW50KGFyZ3VtZW50KTtcbiAgfVxuXG4gIHBhcnNlVHJ5U3RhdGVtZW50KCkge1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5UUlkpO1xuICAgIGxldCBibG9jayA9IHRoaXMucGFyc2VCbG9jaygpO1xuXG4gICAgaWYgKHRoaXMubWF0Y2goVG9rZW5UeXBlLkNBVENIKSkge1xuICAgICAgbGV0IGhhbmRsZXIgPSB0aGlzLnBhcnNlQ2F0Y2hDbGF1c2UoKTtcbiAgICAgIGlmICh0aGlzLmVhdChUb2tlblR5cGUuRklOQUxMWSkpIHtcbiAgICAgICAgbGV0IGZpbmFsaXplciA9IHRoaXMucGFyc2VCbG9jaygpO1xuICAgICAgICByZXR1cm4gbmV3IFNoaWZ0LlRyeUZpbmFsbHlTdGF0ZW1lbnQoYmxvY2ssIGhhbmRsZXIsIGZpbmFsaXplcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFNoaWZ0LlRyeUNhdGNoU3RhdGVtZW50KGJsb2NrLCBoYW5kbGVyKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5lYXQoVG9rZW5UeXBlLkZJTkFMTFkpKSB7XG4gICAgICBsZXQgZmluYWxpemVyID0gdGhpcy5wYXJzZUJsb2NrKCk7XG4gICAgICByZXR1cm4gbmV3IFNoaWZ0LlRyeUZpbmFsbHlTdGF0ZW1lbnQoYmxvY2ssIG51bGwsIGZpbmFsaXplcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IoRXJyb3JNZXNzYWdlcy5OT19DQVRDSF9PUl9GSU5BTExZKTtcbiAgICB9XG4gIH1cblxuICBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25TdGF0ZW1lbnQoKSB7XG4gICAgbGV0IGRlY2xhcmF0aW9uID0gdGhpcy5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24oKTtcbiAgICB0aGlzLmNvbnN1bWVTZW1pY29sb24oKTtcbiAgICByZXR1cm4gbmV3IFNoaWZ0LlZhcmlhYmxlRGVjbGFyYXRpb25TdGF0ZW1lbnQoZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgcGFyc2VXaGlsZVN0YXRlbWVudCgpIHtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuV0hJTEUpO1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5MUEFSRU4pO1xuICAgIHJldHVybiBuZXcgU2hpZnQuV2hpbGVTdGF0ZW1lbnQodGhpcy5wYXJzZUV4cHJlc3Npb24oKSwgdGhpcy5nZXRJdGVyYXRvclN0YXRlbWVudEVwaWxvZ3VlKCkpO1xuICB9XG5cbiAgcGFyc2VDYXRjaENsYXVzZSgpIHtcbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcblxuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5DQVRDSCk7XG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLkxQQVJFTik7XG4gICAgbGV0IHRva2VuID0gdGhpcy5sb29rYWhlYWQ7XG4gICAgaWYgKHRoaXMubWF0Y2goVG9rZW5UeXBlLlJQQVJFTikgfHwgdGhpcy5tYXRjaChUb2tlblR5cGUuTFBBUkVOKSkge1xuICAgICAgdGhyb3cgdGhpcy5jcmVhdGVVbmV4cGVjdGVkKHRva2VuKTtcbiAgICB9XG5cbiAgICBsZXQgcGFyYW0gPSB0aGlzLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpO1xuXG4gICAgaWYgKCFQYXJzZXIuaXNEZXN0cnVjdHVyaW5nQXNzaWdubWVudFRhcmdldChwYXJhbSkpIHtcbiAgICAgIHRocm93IHRoaXMuY3JlYXRlVW5leHBlY3RlZCh0b2tlbik7XG4gICAgfVxuICAgIHBhcmFtID0gUGFyc2VyLnRyYW5zZm9ybURlc3RydWN0dXJpbmdBc3NpZ25tZW50KHBhcmFtKTtcblxuICAgIGxldCBib3VuZCA9IFBhcnNlci5ib3VuZE5hbWVzKHBhcmFtKTtcbiAgICBpZiAoZmlyc3REdXBsaWNhdGUoYm91bmQpICE9IG51bGwpIHtcbiAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24odG9rZW4sIEVycm9yTWVzc2FnZXMuRFVQTElDQVRFX0JJTkRJTkcsIGZpcnN0RHVwbGljYXRlKGJvdW5kKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RyaWN0ICYmIGJvdW5kLnNvbWUoaXNSZXN0cmljdGVkV29yZCkpIHtcbiAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24odG9rZW4sIEVycm9yTWVzc2FnZXMuU1RSSUNUX0NBVENIX1ZBUklBQkxFKTtcbiAgICB9XG5cbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuUlBBUkVOKTtcblxuICAgIGxldCBib2R5ID0gdGhpcy5wYXJzZUJsb2NrKCk7XG5cbiAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LkNhdGNoQ2xhdXNlKHBhcmFtLCBib2R5KSwgc3RhcnRMb2NhdGlvbik7XG4gIH1cblxuICBwYXJzZUJsb2NrKCkge1xuICAgIGxldCBzdGFydExvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbigpO1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5MQlJBQ0UpO1xuXG4gICAgbGV0IGJvZHkgPSBbXTtcbiAgICB3aGlsZSAoIXRoaXMubWF0Y2goVG9rZW5UeXBlLlJCUkFDRSkpIHtcbiAgICAgIGJvZHkucHVzaCh0aGlzLnBhcnNlU3RhdGVtZW50TGlzdEl0ZW0oKSk7XG4gICAgfVxuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5SQlJBQ0UpO1xuXG4gICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5CbG9jayhib2R5KSwgc3RhcnRMb2NhdGlvbik7XG4gIH1cblxuICBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24oKSB7XG4gICAgbGV0IHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgbGV0IHRva2VuID0gdGhpcy5sZXgoKTtcblxuICAgIC8vIFByZWNlZGVkIGJ5IHRoaXMubWF0Y2goVG9rZW5TdWJUeXBlLlZBUikgfHwgdGhpcy5tYXRjaChUb2tlblN1YlR5cGUuTEVUKTtcbiAgICBsZXQga2luZCA9IHRva2VuLnR5cGUgPT0gVG9rZW5UeXBlLlZBUiA/IFwidmFyXCIgOiB0b2tlbi50eXBlID09PSBUb2tlblR5cGUuQ09OU1QgPyBcImNvbnN0XCIgOiBcImxldFwiO1xuICAgIGxldCBkZWNsYXJhdG9ycyA9IHRoaXMucGFyc2VWYXJpYWJsZURlY2xhcmF0b3JMaXN0KGtpbmQpO1xuICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuVmFyaWFibGVEZWNsYXJhdGlvbihraW5kLCBkZWNsYXJhdG9ycyksIHN0YXJ0TG9jYXRpb24pO1xuICB9XG5cbiAgcGFyc2VWYXJpYWJsZURlY2xhcmF0b3JMaXN0KGtpbmQpIHtcbiAgICBsZXQgcmVzdWx0ID0gW107XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHRoaXMucGFyc2VWYXJpYWJsZURlY2xhcmF0b3Ioa2luZCkpO1xuICAgICAgaWYgKCF0aGlzLmVhdChUb2tlblR5cGUuQ09NTUEpKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcGFyc2VWYXJpYWJsZURlY2xhcmF0b3Ioa2luZCkge1xuICAgIGxldCBzdGFydExvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbigpO1xuICAgIGxldCB0b2tlbiA9IHRoaXMubG9va2FoZWFkO1xuXG4gICAgaWYgKHRoaXMubWF0Y2goVG9rZW5UeXBlLkxQQVJFTikpIHtcbiAgICAgIHRocm93IHRoaXMuY3JlYXRlVW5leHBlY3RlZCh0aGlzLmxvb2thaGVhZCk7XG4gICAgfVxuICAgIGxldCBpZCA9IHRoaXMucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKCk7XG5cbiAgICBpZiAoIVBhcnNlci5pc0Rlc3RydWN0dXJpbmdBc3NpZ25tZW50VGFyZ2V0KGlkKSkge1xuICAgICAgdGhyb3cgdGhpcy5jcmVhdGVVbmV4cGVjdGVkKHRva2VuKTtcbiAgICB9XG4gICAgaWQgPSBQYXJzZXIudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnQoaWQpO1xuXG4gICAgbGV0IGJvdW5kID0gUGFyc2VyLmJvdW5kTmFtZXMoaWQpO1xuICAgIGlmIChmaXJzdER1cGxpY2F0ZShib3VuZCkgIT0gbnVsbCkge1xuICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcldpdGhMb2NhdGlvbih0b2tlbiwgRXJyb3JNZXNzYWdlcy5EVVBMSUNBVEVfQklORElORywgZmlyc3REdXBsaWNhdGUoYm91bmQpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdHJpY3QgJiYgYm91bmQuc29tZShpc1Jlc3RyaWN0ZWRXb3JkKSkge1xuICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcldpdGhMb2NhdGlvbih0b2tlbiwgRXJyb3JNZXNzYWdlcy5TVFJJQ1RfVkFSX05BTUUpO1xuICAgIH1cblxuICAgIGxldCBpbml0ID0gbnVsbDtcbiAgICBpZiAoa2luZCA9PSBcImNvbnN0XCIpIHtcbiAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5BU1NJR04pO1xuICAgICAgaW5pdCA9IHRoaXMucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5lYXQoVG9rZW5UeXBlLkFTU0lHTikpIHtcbiAgICAgIGluaXQgPSB0aGlzLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5WYXJpYWJsZURlY2xhcmF0b3IoaWQsIGluaXQpLCBzdGFydExvY2F0aW9uKTtcbiAgfVxuXG4gIHBhcnNlRXhwcmVzc2lvbigpIHtcbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcblxuICAgIGxldCBleHByID0gdGhpcy5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG5cbiAgICBpZiAodGhpcy5tYXRjaChUb2tlblR5cGUuQ09NTUEpKSB7XG4gICAgICB3aGlsZSAoIXRoaXMuZW9mKCkpIHtcbiAgICAgICAgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5DT01NQSkpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxleCgpO1xuICAgICAgICBleHByID0gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LkJpbmFyeUV4cHJlc3Npb24oXCIsXCIsIGV4cHIsIHRoaXMucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKSxcbiAgICAgICAgICAgIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIHBhcnNlQXJyb3dFeHByZXNzaW9uVGFpbChoZWFkLCBzdGFydExvY2F0aW9uKSB7XG4gICAgbGV0IGFycm93ID0gdGhpcy5leHBlY3QoVG9rZW5UeXBlLkFSUk9XKTtcblxuICAgIC8vIENvbnZlcnQgcGFyYW0gbGlzdC5cbiAgICBsZXQge3BhcmFtcyA9IG51bGwsIHJlc3QgPSBudWxsfSA9IGhlYWQ7XG4gICAgaWYgKGhlYWQudHlwZSAhPT0gQVJST1dfRVhQUkVTU0lPTl9QQVJBTVMpIHtcbiAgICAgIGlmIChoZWFkLnR5cGUgPT09IFwiSWRlbnRpZmllckV4cHJlc3Npb25cIikge1xuICAgICAgICBsZXQgbmFtZSA9IGhlYWQuaWRlbnRpZmllci5uYW1lO1xuICAgICAgICBpZiAoU1RSSUNUX01PREVfUkVTRVJWRURfV09SRC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IoRXJyb3JNZXNzYWdlcy5TVFJJQ1RfUkVTRVJWRURfV09SRCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQobmFtZSkpIHtcbiAgICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKEVycm9yTWVzc2FnZXMuU1RSSUNUX1BBUkFNX05BTUUpO1xuICAgICAgICB9XG4gICAgICAgIGhlYWQgPSBQYXJzZXIudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnQoaGVhZCk7XG4gICAgICAgIHBhcmFtcyA9IFtoZWFkXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlVW5leHBlY3RlZChhcnJvdyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubWF0Y2goVG9rZW5UeXBlLkxCUkFDRSkpIHtcbiAgICAgIGxldCBwcmV2aW91c1lpZWxkID0gdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbjtcbiAgICAgIHRoaXMuYWxsb3dZaWVsZEV4cHJlc3Npb24gPSBmYWxzZTtcbiAgICAgIGxldCBbYm9keV0gPSB0aGlzLnBhcnNlRnVuY3Rpb25Cb2R5KCk7XG4gICAgICB0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uID0gcHJldmlvdXNZaWVsZDtcbiAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuQXJyb3dFeHByZXNzaW9uKHBhcmFtcywgcmVzdCwgYm9keSksIHN0YXJ0TG9jYXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgYm9keSA9IHRoaXMucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5BcnJvd0V4cHJlc3Npb24ocGFyYW1zLCByZXN0LCBib2R5KSwgc3RhcnRMb2NhdGlvbik7XG4gICAgfVxuICB9XG5cbiAgcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpIHtcbiAgICBsZXQgdG9rZW4gPSB0aGlzLmxvb2thaGVhZDtcbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcblxuICAgIGlmICh0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uICYmICF0aGlzLmluR2VuZXJhdG9yUGFyYW1ldGVyICYmIHRoaXMubG9va2FoZWFkLnZhbHVlID09PSAneWllbGQnKSB7XG4gICAgICByZXR1cm4gdGhpcy5wYXJzZVlpZWxkRXhwcmVzc2lvbigpO1xuICAgIH1cblxuICAgIGxldCBub2RlID0gdGhpcy5wYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbigpO1xuXG4gICAgaWYgKCF0aGlzLmhhc0xpbmVUZXJtaW5hdG9yQmVmb3JlTmV4dCAmJiB0aGlzLm1hdGNoKFRva2VuVHlwZS5BUlJPVykpIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlQXJyb3dFeHByZXNzaW9uVGFpbChub2RlLCBzdGFydExvY2F0aW9uKVxuICAgIH1cblxuICAgIGxldCBpc09wZXJhdG9yID0gZmFsc2U7XG4gICAgbGV0IG9wZXJhdG9yID0gdGhpcy5sb29rYWhlYWQ7XG4gICAgc3dpdGNoIChvcGVyYXRvci50eXBlKSB7XG4gICAgICBjYXNlIFRva2VuVHlwZS5BU1NJR046XG4gICAgICBjYXNlIFRva2VuVHlwZS5BU1NJR05fQklUX09SOlxuICAgICAgY2FzZSBUb2tlblR5cGUuQVNTSUdOX0JJVF9YT1I6XG4gICAgICBjYXNlIFRva2VuVHlwZS5BU1NJR05fQklUX0FORDpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkFTU0lHTl9TSEw6XG4gICAgICBjYXNlIFRva2VuVHlwZS5BU1NJR05fU0hSOlxuICAgICAgY2FzZSBUb2tlblR5cGUuQVNTSUdOX1NIUl9VTlNJR05FRDpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkFTU0lHTl9BREQ6XG4gICAgICBjYXNlIFRva2VuVHlwZS5BU1NJR05fU1VCOlxuICAgICAgY2FzZSBUb2tlblR5cGUuQVNTSUdOX01VTDpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkFTU0lHTl9ESVY6XG4gICAgICBjYXNlIFRva2VuVHlwZS5BU1NJR05fTU9EOlxuICAgICAgICBpc09wZXJhdG9yID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGlmIChpc09wZXJhdG9yKSB7XG4gICAgICBpZiAoIVBhcnNlci5pc0Rlc3RydWN0dXJpbmdBc3NpZ25tZW50VGFyZ2V0KG5vZGUpICYmIG5vZGUudHlwZSAhPT0gXCJDb21wdXRlZE1lbWJlckV4cHJlc3Npb25cIiAmJiBub2RlLnR5cGUgIT09IFwiU3RhdGljTWVtYmVyRXhwcmVzc2lvblwiKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IoRXJyb3JNZXNzYWdlcy5JTlZBTElEX0xIU19JTl9BU1NJR05NRU5UKTtcbiAgICAgIH1cbiAgICAgIG5vZGUgPSBQYXJzZXIudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnQobm9kZSk7XG5cbiAgICAgIGxldCBib3VuZCA9IFBhcnNlci5ib3VuZE5hbWVzKG5vZGUpO1xuICAgICAgaWYgKGZpcnN0RHVwbGljYXRlKGJvdW5kKSAhPSBudWxsKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24odG9rZW4sIEVycm9yTWVzc2FnZXMuRFVQTElDQVRFX0JJTkRJTkcsIGZpcnN0RHVwbGljYXRlKGJvdW5kKSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnN0cmljdCAmJiBib3VuZC5zb21lKGlzUmVzdHJpY3RlZFdvcmQpKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24odG9rZW4sIEVycm9yTWVzc2FnZXMuU1RSSUNUX0xIU19BU1NJR05NRU5UKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5sZXgoKTtcbiAgICAgIGxldCBwcmV2aW91c0luR2VuZXJhdG9yUGFyYW1ldGVyID0gdGhpcy5pbkdlbmVyYXRvclBhcmFtZXRlcjtcbiAgICAgIHRoaXMuaW5HZW5lcmF0b3JQYXJhbWV0ZXIgPSBmYWxzZTtcbiAgICAgIGxldCByaWdodCA9IHRoaXMucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgdGhpcy5pbkdlbmVyYXRvclBhcmFtZXRlciA9IHByZXZpb3VzSW5HZW5lcmF0b3JQYXJhbWV0ZXI7XG4gICAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LkFzc2lnbm1lbnRFeHByZXNzaW9uKG9wZXJhdG9yLnR5cGUubmFtZSwgbm9kZSwgcmlnaHQpLCBzdGFydExvY2F0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICBub2RlLnR5cGUgPT09IFwiT2JqZWN0RXhwcmVzc2lvblwiICYmXG4gICAgICBub2RlLnByb3BlcnRpZXMuc29tZShwID0+IHAudHlwZSA9PT0gXCJCaW5kaW5nUHJvcGVydHlJZGVudGlmaWVyXCIpXG4gICAgKSB7XG4gICAgICB0aHJvdyB0aGlzLmNyZWF0ZVVuZXhwZWN0ZWQob3BlcmF0b3IpO1xuICAgIH1cblxuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgbG9va2FoZWFkQXNzaWdubWVudEV4cHJlc3Npb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLmxvb2thaGVhZC50eXBlKSB7XG4gICAgICBjYXNlIFRva2VuVHlwZS5BREQ6XG4gICAgICBjYXNlIFRva2VuVHlwZS5BU1NJR05fRElWOlxuICAgICAgY2FzZSBUb2tlblR5cGUuQ0xBU1M6XG4gICAgICBjYXNlIFRva2VuVHlwZS5ERUM6XG4gICAgICBjYXNlIFRva2VuVHlwZS5ESVY6XG4gICAgICBjYXNlIFRva2VuVHlwZS5GQUxTRTpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkZVTkNUSU9OOlxuICAgICAgY2FzZSBUb2tlblR5cGUuSURFTlRJRklFUjpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkxCUkFDRTpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkxCUkFDSzpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkxQQVJFTjpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLk5FVzpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLk5PVDpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLk5VTEw6XG4gICAgICBjYXNlIFRva2VuVHlwZS5OVU1CRVI6XG4gICAgICBjYXNlIFRva2VuVHlwZS5TVFJJTkc6XG4gICAgICBjYXNlIFRva2VuVHlwZS5TVUI6XG4gICAgICBjYXNlIFRva2VuVHlwZS5USElTOlxuICAgICAgY2FzZSBUb2tlblR5cGUuVFJVRTpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLllJRUxEOlxuICAgICAgY2FzZSBUb2tlblR5cGUuVEVNUExBVEU6XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwYXJzZVlpZWxkRXhwcmVzc2lvbigpIHtcbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcblxuICAgIHRoaXMubGV4KCk7XG4gICAgaWYgKHRoaXMuaGFzTGluZVRlcm1pbmF0b3JCZWZvcmVOZXh0KSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LllpZWxkRXhwcmVzc2lvbihudWxsKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgfVxuICAgIGxldCBpc0dlbmVyYXRvciA9ICEhdGhpcy5lYXQoVG9rZW5UeXBlLk1VTCk7XG4gICAgbGV0IHByZXZpb3VzWWllbGQgPSB0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uO1xuICAgIGxldCBleHByID0gbnVsbDtcbiAgICBpZiAoaXNHZW5lcmF0b3IgfHwgdGhpcy5sb29rYWhlYWRBc3NpZ25tZW50RXhwcmVzc2lvbigpKSB7XG4gICAgICBleHByID0gdGhpcy5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgfVxuICAgIHRoaXMuYWxsb3dZaWVsZEV4cHJlc3Npb24gPSBwcmV2aW91c1lpZWxkO1xuICAgIGxldCBjb25zID0gaXNHZW5lcmF0b3IgPyBTaGlmdC5ZaWVsZEdlbmVyYXRvckV4cHJlc3Npb24gOiBTaGlmdC5ZaWVsZEV4cHJlc3Npb247XG4gICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBjb25zKGV4cHIpLCBzdGFydExvY2F0aW9uKTtcbiAgfVxuXG4gIHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uKCkge1xuICAgIGxldCBzdGFydExvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbigpO1xuICAgIGxldCBleHByID0gdGhpcy5wYXJzZUJpbmFyeUV4cHJlc3Npb24oKTtcbiAgICBpZiAodGhpcy5lYXQoVG9rZW5UeXBlLkNPTkRJVElPTkFMKSkge1xuICAgICAgbGV0IHByZXZpb3VzQWxsb3dJbiA9IHRoaXMuYWxsb3dJbjtcbiAgICAgIHRoaXMuYWxsb3dJbiA9IHRydWU7XG4gICAgICBsZXQgY29uc2VxdWVudCA9IHRoaXMucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgdGhpcy5hbGxvd0luID0gcHJldmlvdXNBbGxvd0luO1xuICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLkNPTE9OKTtcbiAgICAgIGxldCBhbHRlcm5hdGUgPSB0aGlzLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuQ29uZGl0aW9uYWxFeHByZXNzaW9uKGV4cHIsIGNvbnNlcXVlbnQsIGFsdGVybmF0ZSksIHN0YXJ0TG9jYXRpb24pO1xuICAgIH1cblxuICAgIHJldHVybiBleHByO1xuICB9XG5cbiAgaXNCaW5hcnlPcGVyYXRvcih0eXBlKSB7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlIFRva2VuVHlwZS5PUjpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkFORDpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkJJVF9PUjpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkJJVF9YT1I6XG4gICAgICBjYXNlIFRva2VuVHlwZS5CSVRfQU5EOlxuICAgICAgY2FzZSBUb2tlblR5cGUuRVE6XG4gICAgICBjYXNlIFRva2VuVHlwZS5ORTpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkVRX1NUUklDVDpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLk5FX1NUUklDVDpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkxUOlxuICAgICAgY2FzZSBUb2tlblR5cGUuR1Q6XG4gICAgICBjYXNlIFRva2VuVHlwZS5MVEU6XG4gICAgICBjYXNlIFRva2VuVHlwZS5HVEU6XG4gICAgICBjYXNlIFRva2VuVHlwZS5JTlNUQU5DRU9GOlxuICAgICAgY2FzZSBUb2tlblR5cGUuU0hMOlxuICAgICAgY2FzZSBUb2tlblR5cGUuU0hSOlxuICAgICAgY2FzZSBUb2tlblR5cGUuU0hSX1VOU0lHTkVEOlxuICAgICAgY2FzZSBUb2tlblR5cGUuQUREOlxuICAgICAgY2FzZSBUb2tlblR5cGUuU1VCOlxuICAgICAgY2FzZSBUb2tlblR5cGUuTVVMOlxuICAgICAgY2FzZSBUb2tlblR5cGUuRElWOlxuICAgICAgY2FzZSBUb2tlblR5cGUuTU9EOlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLklOOlxuICAgICAgICByZXR1cm4gdGhpcy5hbGxvd0luO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlQmluYXJ5RXhwcmVzc2lvbigpIHtcbiAgICBsZXQgbG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgbGV0IGxlZnQgPSB0aGlzLnBhcnNlVW5hcnlFeHByZXNzaW9uKCk7XG4gICAgbGV0IG9wZXJhdG9yID0gdGhpcy5sb29rYWhlYWQudHlwZTtcblxuICAgIGxldCBpc0JpbmFyeU9wZXJhdG9yID0gdGhpcy5pc0JpbmFyeU9wZXJhdG9yKG9wZXJhdG9yKTtcbiAgICBpZiAoIWlzQmluYXJ5T3BlcmF0b3IpIHtcbiAgICAgIHJldHVybiBsZWZ0O1xuICAgIH1cblxuICAgIHRoaXMubGV4KCk7XG4gICAgbGV0IHN0YWNrID0gW107XG4gICAgc3RhY2sucHVzaCh7bG9jYXRpb24sIGxlZnQsIG9wZXJhdG9yLCBwcmVjZWRlbmNlOiBCaW5hcnlQcmVjZWRlbmNlW29wZXJhdG9yLm5hbWVdfSk7XG4gICAgbG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgbGV0IHJpZ2h0ID0gdGhpcy5wYXJzZVVuYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgb3BlcmF0b3IgPSB0aGlzLmxvb2thaGVhZC50eXBlO1xuICAgIGlzQmluYXJ5T3BlcmF0b3IgPSB0aGlzLmlzQmluYXJ5T3BlcmF0b3IodGhpcy5sb29rYWhlYWQudHlwZSk7XG4gICAgd2hpbGUgKGlzQmluYXJ5T3BlcmF0b3IpIHtcbiAgICAgIGxldCBwcmVjZWRlbmNlID0gQmluYXJ5UHJlY2VkZW5jZVtvcGVyYXRvci5uYW1lXTtcbiAgICAgIC8vIFJlZHVjZTogbWFrZSBhIGJpbmFyeSBleHByZXNzaW9uIGZyb20gdGhlIHRocmVlIHRvcG1vc3QgZW50cmllcy5cbiAgICAgIHdoaWxlIChzdGFjay5sZW5ndGggJiYgKHByZWNlZGVuY2UgPD0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV0ucHJlY2VkZW5jZSkpIHtcbiAgICAgICAgbGV0IHN0YWNrSXRlbSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICBsZXQgc3RhY2tPcGVyYXRvciA9IHN0YWNrSXRlbS5vcGVyYXRvcjtcbiAgICAgICAgbGVmdCA9IHN0YWNrSXRlbS5sZWZ0O1xuICAgICAgICBzdGFjay5wb3AoKTtcbiAgICAgICAgbG9jYXRpb24gPSBzdGFja0l0ZW0ubG9jYXRpb247XG4gICAgICAgIHJpZ2h0ID0gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LkJpbmFyeUV4cHJlc3Npb24oc3RhY2tPcGVyYXRvci5uYW1lLCBsZWZ0LCByaWdodCksIGxvY2F0aW9uKTtcbiAgICAgIH1cblxuICAgICAgLy8gU2hpZnQuXG4gICAgICB0aGlzLmxleCgpO1xuICAgICAgc3RhY2sucHVzaCh7bG9jYXRpb24sIGxlZnQ6IHJpZ2h0LCBvcGVyYXRvciwgcHJlY2VkZW5jZX0pO1xuICAgICAgbG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgICByaWdodCA9IHRoaXMucGFyc2VVbmFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgb3BlcmF0b3IgPSB0aGlzLmxvb2thaGVhZC50eXBlO1xuICAgICAgaXNCaW5hcnlPcGVyYXRvciA9IHRoaXMuaXNCaW5hcnlPcGVyYXRvcihvcGVyYXRvcik7XG4gICAgfVxuXG4gICAgLy8gRmluYWwgcmVkdWNlIHRvIGNsZWFuLXVwIHRoZSBzdGFjay5cbiAgICByZXR1cm4gc3RhY2sucmVkdWNlUmlnaHQoKGV4cHIsIHN0YWNrSXRlbSkgPT5cbiAgICAgIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5CaW5hcnlFeHByZXNzaW9uKHN0YWNrSXRlbS5vcGVyYXRvci5uYW1lLCBzdGFja0l0ZW0ubGVmdCwgZXhwciksIHN0YWNrSXRlbS5sb2NhdGlvbiksXG4gICAgICByaWdodCk7XG4gIH1cblxuICBzdGF0aWMgaXNQcmVmaXhPcGVyYXRvcih0eXBlKSB7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlIFRva2VuVHlwZS5JTkM6XG4gICAgICBjYXNlIFRva2VuVHlwZS5ERUM6XG4gICAgICBjYXNlIFRva2VuVHlwZS5BREQ6XG4gICAgICBjYXNlIFRva2VuVHlwZS5TVUI6XG4gICAgICBjYXNlIFRva2VuVHlwZS5CSVRfTk9UOlxuICAgICAgY2FzZSBUb2tlblR5cGUuTk9UOlxuICAgICAgY2FzZSBUb2tlblR5cGUuREVMRVRFOlxuICAgICAgY2FzZSBUb2tlblR5cGUuVk9JRDpcbiAgICAgIGNhc2UgVG9rZW5UeXBlLlRZUEVPRjpcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHBhcnNlVW5hcnlFeHByZXNzaW9uKCkge1xuICAgIGlmICh0aGlzLmxvb2thaGVhZC50eXBlLmtsYXNzICE9IFRva2VuQ2xhc3MuUHVuY3R1YXRvciAmJiB0aGlzLmxvb2thaGVhZC50eXBlLmtsYXNzICE9IFRva2VuQ2xhc3MuS2V5d29yZCkge1xuICAgICAgcmV0dXJuIHRoaXMucGFyc2VQb3N0Zml4RXhwcmVzc2lvbigpO1xuICAgIH1cbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcbiAgICBsZXQgb3BlcmF0b3IgPSB0aGlzLmxvb2thaGVhZDtcbiAgICBpZiAoIVBhcnNlci5pc1ByZWZpeE9wZXJhdG9yKG9wZXJhdG9yLnR5cGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5wYXJzZVBvc3RmaXhFeHByZXNzaW9uKCk7XG4gICAgfVxuICAgIHRoaXMubGV4KCk7XG4gICAgbGV0IGV4cHIgPSB0aGlzLnBhcnNlVW5hcnlFeHByZXNzaW9uKCk7XG4gICAgc3dpdGNoIChvcGVyYXRvci50eXBlKSB7XG4gICAgICBjYXNlIFRva2VuVHlwZS5JTkM6XG4gICAgICBjYXNlIFRva2VuVHlwZS5ERUM6XG4gICAgICAgIC8vIDExLjQuNCwgMTEuNC41O1xuICAgICAgICBpZiAoZXhwci50eXBlID09PSBcIklkZW50aWZpZXJFeHByZXNzaW9uXCIpIHtcbiAgICAgICAgICBpZiAodGhpcy5zdHJpY3QgJiYgaXNSZXN0cmljdGVkV29yZChleHByLmlkZW50aWZpZXIubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IoRXJyb3JNZXNzYWdlcy5TVFJJQ1RfTEhTX1BSRUZJWCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFQYXJzZXIuaXNWYWxpZFNpbXBsZUFzc2lnbm1lbnRUYXJnZXQoZXhwcikpIHtcbiAgICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKEVycm9yTWVzc2FnZXMuSU5WQUxJRF9MSFNfSU5fQVNTSUdOTUVOVCk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFRva2VuVHlwZS5ERUxFVEU6XG4gICAgICAgIGlmIChleHByLnR5cGUgPT09IFwiSWRlbnRpZmllckV4cHJlc3Npb25cIiAmJiB0aGlzLnN0cmljdCkge1xuICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IoRXJyb3JNZXNzYWdlcy5TVFJJQ1RfREVMRVRFKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuUHJlZml4RXhwcmVzc2lvbihvcGVyYXRvci52YWx1ZSwgZXhwciksIHN0YXJ0TG9jYXRpb24pO1xuICB9XG5cbiAgcGFyc2VQb3N0Zml4RXhwcmVzc2lvbigpIHtcbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcblxuICAgIGxldCBleHByID0gdGhpcy5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24odHJ1ZSk7XG5cbiAgICBpZiAodGhpcy5oYXNMaW5lVGVybWluYXRvckJlZm9yZU5leHQpIHtcbiAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGxldCBvcGVyYXRvciA9IHRoaXMubG9va2FoZWFkO1xuICAgIGlmICgob3BlcmF0b3IudHlwZSAhPT0gVG9rZW5UeXBlLklOQykgJiYgKG9wZXJhdG9yLnR5cGUgIT09IFRva2VuVHlwZS5ERUMpKSB7XG4gICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG4gICAgdGhpcy5sZXgoKTtcbiAgICAvLyAxMS4zLjEsIDExLjMuMjtcbiAgICBpZiAoZXhwci50eXBlID09PSBcIklkZW50aWZpZXJFeHByZXNzaW9uXCIpIHtcbiAgICAgIGlmICh0aGlzLnN0cmljdCAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGV4cHIuaWRlbnRpZmllci5uYW1lKSkge1xuICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKEVycm9yTWVzc2FnZXMuU1RSSUNUX0xIU19QT1NURklYKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFQYXJzZXIuaXNWYWxpZFNpbXBsZUFzc2lnbm1lbnRUYXJnZXQoZXhwcikpIHtcbiAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IoRXJyb3JNZXNzYWdlcy5JTlZBTElEX0xIU19JTl9BU1NJR05NRU5UKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5Qb3N0Zml4RXhwcmVzc2lvbihleHByLCBvcGVyYXRvci52YWx1ZSksIHN0YXJ0TG9jYXRpb24pO1xuICB9XG5cbiAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKGFsbG93Q2FsbCkge1xuICAgIGxldCBzdGFydExvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbigpO1xuICAgIGxldCBwcmV2aW91c0FsbG93SW4gPSB0aGlzLmFsbG93SW47XG4gICAgdGhpcy5hbGxvd0luID0gYWxsb3dDYWxsO1xuXG4gICAgbGV0IGV4cHIsIHRva2VuID0gdGhpcy5sb29rYWhlYWQ7XG5cbiAgICBpZiAodGhpcy5lYXQoVG9rZW5UeXBlLlNVUEVSKSkge1xuICAgICAgZXhwciA9IHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5TdXBlciwgc3RhcnRMb2NhdGlvbik7XG4gICAgICBpZiAoYWxsb3dDYWxsICYmIHRoaXMuaW5Db25zdHJ1Y3RvciAmJiB0aGlzLm1hdGNoKFRva2VuVHlwZS5MUEFSRU4pKSB7XG4gICAgICAgIGV4cHIgPSB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuQ2FsbEV4cHJlc3Npb24oZXhwciwgdGhpcy5wYXJzZUFyZ3VtZW50TGlzdCgpKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuaW5NZXRob2QgJiYgdGhpcy5tYXRjaChUb2tlblR5cGUuTEJSQUNLKSkge1xuICAgICAgICBleHByID0gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LkNvbXB1dGVkTWVtYmVyRXhwcmVzc2lvbihleHByLCB0aGlzLnBhcnNlQ29tcHV0ZWRNZW1iZXIoKSksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmluTWV0aG9kICYmIHRoaXMubWF0Y2goVG9rZW5UeXBlLlBFUklPRCkpIHtcbiAgICAgICAgZXhwciA9IHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5TdGF0aWNNZW1iZXJFeHByZXNzaW9uKGV4cHIsIHRoaXMucGFyc2VOb25Db21wdXRlZE1lbWJlcigpKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZVVuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5tYXRjaChUb2tlblR5cGUuTkVXKSkge1xuICAgICAgZXhwciA9IHRoaXMucGFyc2VOZXdFeHByZXNzaW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cHIgPSB0aGlzLnBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcbiAgICB9XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGFsbG93Q2FsbCAmJiB0aGlzLm1hdGNoKFRva2VuVHlwZS5MUEFSRU4pKSB7XG4gICAgICAgIGV4cHIgPSB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuQ2FsbEV4cHJlc3Npb24oZXhwciwgdGhpcy5wYXJzZUFyZ3VtZW50TGlzdCgpKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMubWF0Y2goVG9rZW5UeXBlLkxCUkFDSykpIHtcbiAgICAgICAgZXhwciA9IHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5Db21wdXRlZE1lbWJlckV4cHJlc3Npb24oZXhwciwgdGhpcy5wYXJzZUNvbXB1dGVkTWVtYmVyKCkpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5tYXRjaChUb2tlblR5cGUuUEVSSU9EKSkge1xuICAgICAgICBleHByID0gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LlN0YXRpY01lbWJlckV4cHJlc3Npb24oZXhwciwgdGhpcy5wYXJzZU5vbkNvbXB1dGVkTWVtYmVyKCkpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5tYXRjaChUb2tlblR5cGUuVEVNUExBVEUpKSB7XG4gICAgICAgIGV4cHIgPSB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuVGVtcGxhdGVTdHJpbmcoZXhwciwgdGhpcy5wYXJzZVRlbXBsYXRlRWxlbWVudHMoKSksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5hbGxvd0luID0gcHJldmlvdXNBbGxvd0luO1xuXG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICBwYXJzZVRlbXBsYXRlRWxlbWVudHMoKSB7XG4gICAgbGV0IHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgbGV0IHRva2VuID0gdGhpcy5sb29rYWhlYWQ7XG4gICAgaWYgKHRva2VuLnRhaWwpIHtcbiAgICAgIHRoaXMubGV4KCk7XG4gICAgICByZXR1cm4gW3RoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5UZW1wbGF0ZUxpdGVyYWwodG9rZW4udmFsdWUuc2xpY2UoMSwgLTEpKSwgc3RhcnRMb2NhdGlvbildO1xuICAgIH1cbiAgICBsZXQgcmVzdWx0ID0gW3RoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5UZW1wbGF0ZUxpdGVyYWwodGhpcy5sZXgoKS52YWx1ZS5zbGljZSgxLCAtMikpLCBzdGFydExvY2F0aW9uKV07XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHRoaXMucGFyc2VFeHByZXNzaW9uKCkpO1xuICAgICAgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5SQlJBQ0UpKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlSUxMRUdBTCgpO1xuICAgICAgfVxuICAgICAgdGhpcy5pbmRleCA9IHRoaXMuc3RhcnRJbmRleDtcbiAgICAgIHRoaXMubGluZSA9IHRoaXMuc3RhcnRMaW5lO1xuICAgICAgdGhpcy5saW5lU3RhcnQgPSB0aGlzLnN0YXJ0TGluZVN0YXJ0O1xuICAgICAgdGhpcy5sb29rYWhlYWQgPSB0aGlzLnNjYW5UZW1wbGF0ZUxpdGVyYWwoKTtcbiAgICAgIHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgICB0b2tlbiA9IHRoaXMubGV4KCk7XG4gICAgICBpZiAodG9rZW4udGFpbCkge1xuICAgICAgICByZXN1bHQucHVzaCh0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuVGVtcGxhdGVMaXRlcmFsKHRva2VuLnZhbHVlLnNsaWNlKDEsIC0xKSksIHN0YXJ0TG9jYXRpb24pKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5UZW1wbGF0ZUxpdGVyYWwodG9rZW4udmFsdWUuc2xpY2UoMSwgLTIpKSwgc3RhcnRMb2NhdGlvbikpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKSB7XG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLlBFUklPRCk7XG4gICAgaWYgKCF0aGlzLmxvb2thaGVhZC50eXBlLmtsYXNzLmlzSWRlbnRpZmllck5hbWUpIHtcbiAgICAgIHRocm93IHRoaXMuY3JlYXRlVW5leHBlY3RlZCh0aGlzLmxvb2thaGVhZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmxleCgpLnZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlQ29tcHV0ZWRNZW1iZXIoKSB7XG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLkxCUkFDSyk7XG4gICAgbGV0IGV4cHIgPSB0aGlzLnBhcnNlRXhwcmVzc2lvbigpO1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5SQlJBQ0spO1xuICAgIHJldHVybiBleHByO1xuICB9XG5cbiAgcGFyc2VOZXdFeHByZXNzaW9uKCkge1xuICAgIGxldCBzdGFydExvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbigpO1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5ORVcpO1xuICAgIGlmICh0aGlzLmluRnVuY3Rpb25Cb2R5ICYmIHRoaXMuZWF0KFRva2VuVHlwZS5QRVJJT0QpKSB7XG4gICAgICBsZXQgaWRlbnQgPSB0aGlzLmV4cGVjdChUb2tlblR5cGUuSURFTlRJRklFUik7XG4gICAgICBpZiAoaWRlbnQudmFsdWUgIT09IFwidGFyZ2V0XCIpIHtcbiAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVVbmV4cGVjdGVkKGlkZW50KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuTmV3VGFyZ2V0RXhwcmVzc2lvbiwgc3RhcnRMb2NhdGlvbik7XG4gICAgfVxuICAgIGxldCBjYWxsZWUgPSB0aGlzLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpO1xuICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuTmV3RXhwcmVzc2lvbihcbiAgICAgIGNhbGxlZSxcbiAgICAgIHRoaXMubWF0Y2goVG9rZW5UeXBlLkxQQVJFTikgPyB0aGlzLnBhcnNlQXJndW1lbnRMaXN0KCkgOiBbXVxuICAgICksIHN0YXJ0TG9jYXRpb24pO1xuICB9XG5cbiAgcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpIHtcbiAgICBpZiAodGhpcy5tYXRjaChUb2tlblR5cGUuTFBBUkVOKSkge1xuICAgICAgcmV0dXJuIHRoaXMucGFyc2VHcm91cEV4cHJlc3Npb24oKTtcbiAgICB9XG5cbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcblxuICAgIHN3aXRjaCAodGhpcy5sb29rYWhlYWQudHlwZSkge1xuICAgICAgY2FzZSBUb2tlblR5cGUuWUlFTEQ6XG4gICAgICBjYXNlIFRva2VuVHlwZS5JREVOVElGSUVSOlxuICAgICAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LklkZW50aWZpZXJFeHByZXNzaW9uKHRoaXMucGFyc2VJZGVudGlmaWVyKCkpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLlNUUklORzpcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VTdHJpbmdMaXRlcmFsKCk7XG4gICAgICBjYXNlIFRva2VuVHlwZS5OVU1CRVI6XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlTnVtZXJpY0xpdGVyYWwoKTtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLlRISVM6XG4gICAgICAgIHRoaXMubGV4KCk7XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuVGhpc0V4cHJlc3Npb24sIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgY2FzZSBUb2tlblR5cGUuRlVOQ1RJT046XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbih0aGlzLnBhcnNlRnVuY3Rpb24odHJ1ZSksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgY2FzZSBUb2tlblR5cGUuVFJVRTpcbiAgICAgICAgdGhpcy5sZXgoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5MaXRlcmFsQm9vbGVhbkV4cHJlc3Npb24odHJ1ZSksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgY2FzZSBUb2tlblR5cGUuRkFMU0U6XG4gICAgICAgIHRoaXMubGV4KCk7XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuTGl0ZXJhbEJvb2xlYW5FeHByZXNzaW9uKGZhbHNlKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICBjYXNlIFRva2VuVHlwZS5OVUxMOlxuICAgICAgICB0aGlzLmxleCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LkxpdGVyYWxOdWxsRXhwcmVzc2lvbiwgc3RhcnRMb2NhdGlvbik7XG4gICAgICBjYXNlIFRva2VuVHlwZS5MQlJBQ0s6XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlQXJyYXlFeHByZXNzaW9uKCk7XG4gICAgICBjYXNlIFRva2VuVHlwZS5MQlJBQ0U6XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlT2JqZWN0RXhwcmVzc2lvbigpO1xuICAgICAgY2FzZSBUb2tlblR5cGUuVEVNUExBVEU6XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuVGVtcGxhdGVTdHJpbmcobnVsbCwgdGhpcy5wYXJzZVRlbXBsYXRlRWxlbWVudHMoKSksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgY2FzZSBUb2tlblR5cGUuRElWOlxuICAgICAgY2FzZSBUb2tlblR5cGUuQVNTSUdOX0RJVjpcbiAgICAgICAgdGhpcy5sb29rYWhlYWQgPSB0aGlzLnNjYW5SZWdFeHAodGhpcy5sb29rYWhlYWQudHlwZSA9PT0gVG9rZW5UeXBlLkRJViA/IFwiL1wiIDogXCIvPVwiKTtcbiAgICAgICAgbGV0IHRva2VuID0gdGhpcy5sZXgoKTtcbiAgICAgICAgbGV0IGxhc3RTbGFzaCA9IHRva2VuLnZhbHVlLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgICAgbGV0IHBhdHRlcm4gPSB0b2tlbi52YWx1ZS5zbGljZSgxLCBsYXN0U2xhc2gpLnJlcGxhY2UoXCJcXFxcL1wiLCBcIi9cIik7XG4gICAgICAgIGxldCBmbGFncyA9IHRva2VuLnZhbHVlLnNsaWNlKGxhc3RTbGFzaCArIDEpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIFJlZ0V4cChwYXR0ZXJuLCBmbGFncyk7XG4gICAgICAgIH0gY2F0Y2ggKHVudXNlZCkge1xuICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24odG9rZW4sIEVycm9yTWVzc2FnZXMuSU5WQUxJRF9SRUdVTEFSX0VYUFJFU1NJT04pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuTGl0ZXJhbFJlZ0V4cEV4cHJlc3Npb24ocGF0dGVybiwgZmxhZ3MpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLkNMQVNTOlxuICAgICAgICByZXR1cm4gdGhpcy5wYXJzZUNsYXNzKHRydWUpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVVbmV4cGVjdGVkKHRoaXMubGV4KCkpO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlTnVtZXJpY0xpdGVyYWwoKSB7XG4gICAgbGV0IHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgaWYgKHRoaXMuc3RyaWN0ICYmIHRoaXMubG9va2FoZWFkLm9jdGFsKSB7XG4gICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yV2l0aExvY2F0aW9uKHRoaXMubG9va2FoZWFkLCBFcnJvck1lc3NhZ2VzLlNUUklDVF9PQ1RBTF9MSVRFUkFMKTtcbiAgICB9XG4gICAgbGV0IHRva2VuMiA9IHRoaXMubGV4KCk7XG4gICAgbGV0IG5vZGUgPSB0b2tlbjIuX3ZhbHVlID09PSAxLzBcbiAgICAgID8gbmV3IFNoaWZ0LkxpdGVyYWxJbmZpbml0eUV4cHJlc3Npb25cbiAgICAgIDogbmV3IFNoaWZ0LkxpdGVyYWxOdW1lcmljRXhwcmVzc2lvbih0b2tlbjIuX3ZhbHVlKTtcbiAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obm9kZSwgc3RhcnRMb2NhdGlvbik7XG4gIH1cblxuICBwYXJzZVN0cmluZ0xpdGVyYWwoKSB7XG4gICAgbGV0IHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgaWYgKHRoaXMuc3RyaWN0ICYmIHRoaXMubG9va2FoZWFkLm9jdGFsKSB7XG4gICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yV2l0aExvY2F0aW9uKHRoaXMubG9va2FoZWFkLCBFcnJvck1lc3NhZ2VzLlNUUklDVF9PQ1RBTF9MSVRFUkFMKTtcbiAgICB9XG4gICAgbGV0IHRva2VuMiA9IHRoaXMubGV4KCk7XG4gICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5MaXRlcmFsU3RyaW5nRXhwcmVzc2lvbih0b2tlbjIuX3ZhbHVlLCB0b2tlbjIuc2xpY2UudGV4dCksXG4gICAgICAgIHN0YXJ0TG9jYXRpb24pO1xuICB9XG5cbiAgcGFyc2VJZGVudGlmaWVyTmFtZSgpIHtcbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcbiAgICBpZiAodGhpcy5sb29rYWhlYWQudHlwZS5rbGFzcy5pc0lkZW50aWZpZXJOYW1lKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LklkZW50aWZpZXIodGhpcy5sZXgoKS52YWx1ZSksIHN0YXJ0TG9jYXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyB0aGlzLmNyZWF0ZVVuZXhwZWN0ZWQodGhpcy5sb29rYWhlYWQpO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlSWRlbnRpZmllcigpIHtcbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcbiAgICBpZiAodGhpcy5tYXRjaChUb2tlblR5cGUuWUlFTEQpKSB7XG4gICAgICBpZiAodGhpcy5zdHJpY3QpIHtcbiAgICAgICAgdGhpcy5sb29rYWhlYWQudHlwZSA9IFRva2VuVHlwZS5GVVRVUkVfU1RSSUNUX1JFU0VSVkVEX1dPUkQ7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlVW5leHBlY3RlZCh0aGlzLmxvb2thaGVhZCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuYWxsb3dZaWVsZEV4cHJlc3Npb24pIHtcbiAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVVbmV4cGVjdGVkKHRoaXMubG9va2FoZWFkKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5pbkdlbmVyYXRvckJvZHkpIHtcbiAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVVbmV4cGVjdGVkKHRoaXMubG9va2FoZWFkKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LklkZW50aWZpZXIodGhpcy5sZXgoKS52YWx1ZSksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LklkZW50aWZpZXIodGhpcy5leHBlY3QoVG9rZW5UeXBlLklERU5USUZJRVIpLnZhbHVlKSwgc3RhcnRMb2NhdGlvbik7XG4gIH1cblxuICBwYXJzZUFyZ3VtZW50TGlzdCgpIHtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuTFBBUkVOKTtcbiAgICBsZXQgYXJncyA9IHRoaXMucGFyc2VBcmd1bWVudHMoKTtcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuUlBBUkVOKTtcbiAgICByZXR1cm4gYXJncztcbiAgfVxuXG4gIHBhcnNlQXJndW1lbnRzKCkge1xuICAgIGxldCByZXN1bHQgPSBbXTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKHRoaXMubWF0Y2goVG9rZW5UeXBlLlJQQVJFTikgfHwgdGhpcy5lb2YoKSkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgbGV0IHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgICBsZXQgYXJnO1xuICAgICAgaWYgKHRoaXMuZWF0KFRva2VuVHlwZS5FTExJUFNJUykpIHtcbiAgICAgICAgYXJnID0gdGhpcy5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICAgIGFyZyA9IHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5TcHJlYWRFbGVtZW50KGFyZyksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXJnID0gdGhpcy5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICB9XG4gICAgICByZXN1bHQucHVzaChhcmcpO1xuICAgICAgaWYgKCF0aGlzLmVhdChUb2tlblR5cGUuQ09NTUEpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gMTEuMiBMZWZ0LUhhbmQtU2lkZSBFeHByZXNzaW9ucztcblxuICBlbnN1cmVBcnJvdygpIHtcbiAgICBpZiAodGhpcy5oYXNMaW5lVGVybWluYXRvckJlZm9yZU5leHQpIHtcbiAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IoRXJyb3JNZXNzYWdlcy5VTkVYUEVDVEVEX0xJTkVfVEVSTUlOQVRPUik7XG4gICAgfVxuICAgIGlmICghdGhpcy5tYXRjaChUb2tlblR5cGUuQVJST1cpKSB7XG4gICAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuQVJST1cpO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlR3JvdXBFeHByZXNzaW9uKCkge1xuICAgIGxldCByZXN0ID0gbnVsbDtcbiAgICBsZXQgc3RhcnQgPSB0aGlzLmV4cGVjdChUb2tlblR5cGUuTFBBUkVOKTtcbiAgICBpZiAodGhpcy5lYXQoVG9rZW5UeXBlLlJQQVJFTikpIHtcbiAgICAgIHRoaXMuZW5zdXJlQXJyb3coKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IEFSUk9XX0VYUFJFU1NJT05fUEFSQU1TLFxuICAgICAgICBwYXJhbXM6IFtdLFxuICAgICAgICByZXN0OiBudWxsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAodGhpcy5lYXQoVG9rZW5UeXBlLkVMTElQU0lTKSkge1xuICAgICAgcmVzdCA9IG5ldyBTaGlmdC5CaW5kaW5nSWRlbnRpZmllcih0aGlzLnBhcnNlSWRlbnRpZmllcigpKTtcbiAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5SUEFSRU4pO1xuICAgICAgdGhpcy5lbnN1cmVBcnJvdygpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogQVJST1dfRVhQUkVTU0lPTl9QQVJBTVMsXG4gICAgICAgIHBhcmFtczogW10sXG4gICAgICAgIHJlc3Q6IHJlc3RcbiAgICAgIH07XG4gICAgfVxuXG4gICAgbGV0IHBvc3NpYmxlQmluZGluZ3MgPSAhdGhpcy5tYXRjaChUb2tlblR5cGUuTFBBUkVOKTtcbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcbiAgICBsZXQgZ3JvdXAgPSB0aGlzLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICBsZXQgcGFyYW1zID0gW2dyb3VwXTtcblxuICAgIHdoaWxlICh0aGlzLmVhdChUb2tlblR5cGUuQ09NTUEpKSB7XG4gICAgICBpZiAodGhpcy5tYXRjaChUb2tlblR5cGUuRUxMSVBTSVMpKSB7XG4gICAgICAgIGlmICghcG9zc2libGVCaW5kaW5ncykge1xuICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlVW5leHBlY3RlZCh0aGlzLmxvb2thaGVhZCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sZXgoKTtcbiAgICAgICAgcmVzdCA9IG5ldyBTaGlmdC5CaW5kaW5nSWRlbnRpZmllcih0aGlzLnBhcnNlSWRlbnRpZmllcigpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBwb3NzaWJsZUJpbmRpbmdzID0gcG9zc2libGVCaW5kaW5ncyAmJiAhdGhpcy5tYXRjaChUb2tlblR5cGUuTFBBUkVOKTtcbiAgICAgIGxldCBleHByID0gdGhpcy5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICBwYXJhbXMucHVzaChleHByKTtcbiAgICAgIGdyb3VwID0gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LkJpbmFyeUV4cHJlc3Npb24oXCIsXCIsIGdyb3VwLCBleHByKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgfVxuXG4gICAgaWYgKHBvc3NpYmxlQmluZGluZ3MpIHtcbiAgICAgIHBvc3NpYmxlQmluZGluZ3MgPSBwYXJhbXMuZXZlcnkoUGFyc2VyLmlzRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnRUYXJnZXRXaXRoRGVmYXVsdCk7XG4gICAgfVxuXG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLlJQQVJFTik7XG5cbiAgICBpZiAoIXRoaXMuaGFzTGluZVRlcm1pbmF0b3JCZWZvcmVOZXh0ICYmIHRoaXMubWF0Y2goVG9rZW5UeXBlLkFSUk9XKSkge1xuICAgICAgaWYgKCFwb3NzaWJsZUJpbmRpbmdzKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24oc3RhcnQsIEVycm9yTWVzc2FnZXMuSUxMRUdBTF9BUlJPV19GVU5DVElPTl9QQVJBTVMpO1xuICAgICAgfVxuICAgICAgLy8gY2hlY2sgZHVwIHBhcmFtc1xuICAgICAgcGFyYW1zID0gcGFyYW1zLm1hcChQYXJzZXIudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnQpO1xuICAgICAgbGV0IGFsbEJvdW5kTmFtZXMgPSBbXTtcbiAgICAgIHBhcmFtcy5mb3JFYWNoKGV4cHIgPT4ge1xuICAgICAgICBsZXQgYm91bmROYW1lcyA9IFBhcnNlci5ib3VuZE5hbWVzKGV4cHIpO1xuICAgICAgICBsZXQgZHVwID0gZmlyc3REdXBsaWNhdGUoYm91bmROYW1lcyk7XG4gICAgICAgIGlmIChkdXApIHtcbiAgICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKEVycm9yTWVzc2FnZXMuRFVQTElDQVRFX0JJTkRJTkcsIGR1cCk7XG4gICAgICAgIH1cbiAgICAgICAgYWxsQm91bmROYW1lcyA9IGFsbEJvdW5kTmFtZXMuY29uY2F0KGJvdW5kTmFtZXMpXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXN0KSB7XG4gICAgICAgIGFsbEJvdW5kTmFtZXMucHVzaChyZXN0LmlkZW50aWZpZXIubmFtZSk7XG4gICAgICB9XG5cbiAgICAgIGxldCBkdXAgPSBmaXJzdER1cGxpY2F0ZShhbGxCb3VuZE5hbWVzKTtcbiAgICAgIGlmIChkdXApIHtcbiAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihFcnJvck1lc3NhZ2VzLlNUUklDVF9QQVJBTV9EVVBFKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHN0cmljdF9yZXN0cmljdGVkX3dvcmQgPSBhbGxCb3VuZE5hbWVzLnNvbWUoaXNSZXN0cmljdGVkV29yZCk7XG4gICAgICBpZiAoc3RyaWN0X3Jlc3RyaWN0ZWRfd29yZCkge1xuICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKEVycm9yTWVzc2FnZXMuU1RSSUNUX1BBUkFNX05BTUUpO1xuICAgICAgfVxuXG4gICAgICBsZXQgc3RyaWN0X3Jlc2VydmVkX3dvcmQgPSBoYXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKGFsbEJvdW5kTmFtZXMpO1xuICAgICAgaWYgKHN0cmljdF9yZXNlcnZlZF93b3JkKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IoRXJyb3JNZXNzYWdlcy5TVFJJQ1RfUkVTRVJWRURfV09SRCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IEFSUk9XX0VYUFJFU1NJT05fUEFSQU1TLFxuICAgICAgICBwYXJhbXMsXG4gICAgICAgIHJlc3RcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChyZXN0KSB7XG4gICAgICAgIHRoaXMuZW5zdXJlQXJyb3coKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBncm91cDtcbiAgICB9XG4gIH1cblxuXG4gIHBhcnNlQXJyYXlFeHByZXNzaW9uKCkge1xuICAgIGxldCBzdGFydExvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbigpO1xuXG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLkxCUkFDSyk7XG5cbiAgICBsZXQgZWxlbWVudHMgPSB0aGlzLnBhcnNlQXJyYXlFeHByZXNzaW9uRWxlbWVudHMoKTtcblxuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5SQlJBQ0spO1xuXG4gICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5BcnJheUV4cHJlc3Npb24oZWxlbWVudHMpLCBzdGFydExvY2F0aW9uKTtcbiAgfVxuXG4gIHBhcnNlQXJyYXlFeHByZXNzaW9uRWxlbWVudHMoKSB7XG4gICAgbGV0IHJlc3VsdCA9IFtdO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAodGhpcy5tYXRjaChUb2tlblR5cGUuUkJSQUNLKSkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgbGV0IGVsO1xuXG4gICAgICBpZiAodGhpcy5lYXQoVG9rZW5UeXBlLkNPTU1BKSkge1xuICAgICAgICBlbCA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcbiAgICAgICAgaWYgKHRoaXMuZWF0KFRva2VuVHlwZS5FTExJUFNJUykpIHtcbiAgICAgICAgICBlbCA9IHRoaXMucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICAgIGVsID0gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LlNwcmVhZEVsZW1lbnQoZWwpLCBzdGFydExvY2F0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbCA9IHRoaXMucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5tYXRjaChUb2tlblR5cGUuUkJSQUNLKSkge1xuICAgICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5DT01NQSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wdXNoKGVsKTtcbiAgICB9XG4gIH1cblxuICBwYXJzZU9iamVjdEV4cHJlc3Npb24oKSB7XG4gICAgbGV0IHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG5cbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuTEJSQUNFKTtcblxuICAgIGxldCBwcm9wZXJ0aWVzID0gdGhpcy5wYXJzZU9iamVjdEV4cHJlc3Npb25JdGVtcygpO1xuXG4gICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLlJCUkFDRSk7XG5cbiAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0Lk9iamVjdEV4cHJlc3Npb24ocHJvcGVydGllcyksIHN0YXJ0TG9jYXRpb24pO1xuICB9XG5cblxuICBwYXJzZU9iamVjdEV4cHJlc3Npb25JdGVtcygpIHtcbiAgICBsZXQgcmVzdWx0ID0gW107XG4gICAgbGV0IGhhc19fcHJvdG9fXyA9IFtmYWxzZV07XG4gICAgd2hpbGUgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5SQlJBQ0UpKSB7XG4gICAgICByZXN1bHQucHVzaCh0aGlzLnBhcnNlUHJvcGVydHlEZWZpbml0aW9uKGhhc19fcHJvdG9fXykpO1xuICAgICAgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5SQlJBQ0UpKSB7XG4gICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5DT01NQSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwYXJzZVByb3BlcnR5RGVmaW5pdGlvbihoYXNfX3Byb3RvX18pIHtcbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcbiAgICBsZXQgdG9rZW4gPSB0aGlzLmxvb2thaGVhZDtcblxuICAgIGxldCB7bWV0aG9kT3JLZXksIGtpbmR9ID0gdGhpcy5wYXJzZU1ldGhvZERlZmluaXRpb24oZmFsc2UpO1xuICAgIHN3aXRjaCAoa2luZCkge1xuICAgICAgY2FzZSBcIm1ldGhvZFwiOlxuICAgICAgICByZXR1cm4gbWV0aG9kT3JLZXk7XG4gICAgICBjYXNlIFwiaWRlbnRpZmllclwiOiAvLyBJZGVudGlmaWVyUmVmZXJlbmNlLFxuICAgICAgICBpZiAodGhpcy5lYXQoVG9rZW5UeXBlLkFTU0lHTikpIHtcbiAgICAgICAgICAvLyBDb3ZlckluaXRpYWxpemVkTmFtZVxuICAgICAgICAgIGlmICgodGhpcy5zdHJpY3QgfHwgdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbikgJiYgbWV0aG9kT3JLZXkudmFsdWUgPT09ICd5aWVsZCcpIHtcbiAgICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlVW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuQmluZGluZ1Byb3BlcnR5SWRlbnRpZmllcihcbiAgICAgICAgICAgICAgbmV3IFNoaWZ0LkJpbmRpbmdJZGVudGlmaWVyKG5ldyBTaGlmdC5JZGVudGlmaWVyKG1ldGhvZE9yS2V5LnZhbHVlKSksXG4gICAgICAgICAgICAgIHRoaXMucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKSxcbiAgICAgICAgICAgIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5DT0xPTikpIHtcbiAgICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW5UeXBlLklERU5USUZJRVIgJiYgdG9rZW4udHlwZSAhPT0gVG9rZW5UeXBlLllJRUxEIHx8XG4gICAgICAgICAgICAodGhpcy5zdHJpY3QgfHwgdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbikgJiYgbWV0aG9kT3JLZXkudmFsdWUgPT09ICd5aWVsZCcpIHtcbiAgICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlVW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuU2hvcnRoYW5kUHJvcGVydHkobmV3IFNoaWZ0LklkZW50aWZpZXIobWV0aG9kT3JLZXkudmFsdWUpKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEYXRhUHJvcGVydHlcbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuQ09MT04pO1xuICAgIGlmIChtZXRob2RPcktleS50eXBlID09PSBcIlN0YXRpY1Byb3BlcnR5TmFtZVwiKSB7XG4gICAgICBpZiAobWV0aG9kT3JLZXkudmFsdWUgPT09IFwiX19wcm90b19fXCIpIHtcbiAgICAgICAgaWYgKCFoYXNfX3Byb3RvX19bMF0pIHtcbiAgICAgICAgICBoYXNfX3Byb3RvX19bMF0gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24odG9rZW4sIEVycm9yTWVzc2FnZXMuRFVQTElDQVRFX1BST1RPX1BST1BFUlRZKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LkRhdGFQcm9wZXJ0eShcbiAgICAgICAgbWV0aG9kT3JLZXksXG4gICAgICAgIHRoaXMucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKSxcbiAgICAgIHN0YXJ0TG9jYXRpb24pO1xuICB9XG5cbiAgcGFyc2VQcm9wZXJ0eU5hbWUoKSB7XG4gICAgLy8gUHJvcGVydHlOYW1lW1lpZWxkLEdlbmVyYXRvclBhcmFtZXRlcl06XG4gICAgbGV0IHRva2VuID0gdGhpcy5sb29rYWhlYWQ7XG4gICAgbGV0IHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG5cbiAgICBpZiAodGhpcy5lb2YoKSkge1xuICAgICAgdGhyb3cgdGhpcy5jcmVhdGVVbmV4cGVjdGVkKHRva2VuKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHRva2VuLnR5cGUpIHtcbiAgICAgIGNhc2UgVG9rZW5UeXBlLlNUUklORzpcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5TdGF0aWNQcm9wZXJ0eU5hbWUodGhpcy5wYXJzZVN0cmluZ0xpdGVyYWwoKS52YWx1ZSksIHN0YXJ0TG9jYXRpb24pO1xuICAgICAgY2FzZSBUb2tlblR5cGUuTlVNQkVSOlxuICAgICAgICBsZXQgbnVtTGl0ZXJhbCA9IHRoaXMucGFyc2VOdW1lcmljTGl0ZXJhbCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LlN0YXRpY1Byb3BlcnR5TmFtZShcIlwiICsgKG51bUxpdGVyYWwudHlwZSA9PT0gXCJMaXRlcmFsSW5maW5pdHlFeHByZXNzaW9uXCIgPyAxIC8gMCA6IG51bUxpdGVyYWwudmFsdWUpKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgICBjYXNlIFRva2VuVHlwZS5MQlJBQ0s6XG4gICAgICAgIGxldCBwcmV2aW91c1lpZWxkID0gdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbjtcbiAgICAgICAgaWYgKHRoaXMuaW5HZW5lcmF0b3JQYXJhbWV0ZXIpIHtcbiAgICAgICAgICB0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLkxCUkFDSyk7XG4gICAgICAgIGxldCBleHByID0gdGhpcy5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5SQlJBQ0spO1xuICAgICAgICB0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uID0gcHJldmlvdXNZaWVsZDtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5Db21wdXRlZFByb3BlcnR5TmFtZShleHByKSwgc3RhcnRMb2NhdGlvbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5TdGF0aWNQcm9wZXJ0eU5hbWUodGhpcy5wYXJzZUlkZW50aWZpZXJOYW1lKCkubmFtZSksIHN0YXJ0TG9jYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlc3QgaWYgbG9va2FoZWFkIGNhbiBiZSB0aGUgYmVnaW5uaW5nIG9mIGEgYFByb3BlcnR5TmFtZWAuXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgbG9va2FoZWFkUHJvcGVydHlOYW1lKCkge1xuICAgIHN3aXRjaCAodGhpcy5sb29rYWhlYWQudHlwZSkge1xuICAgICAgY2FzZSBUb2tlblR5cGUuTlVNQkVSOlxuICAgICAgY2FzZSBUb2tlblR5cGUuU1RSSU5HOlxuICAgICAgY2FzZSBUb2tlblR5cGUuTEJSQUNLOlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB0aGlzLmxvb2thaGVhZC50eXBlLmtsYXNzLmlzSWRlbnRpZmllck5hbWU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byBwYXJzZSBhIG1ldGhvZCBkZWZpbml0aW9uLlxuICAgKlxuICAgKiBJZiBpdCB0dXJucyBvdXQgdG8gYmUgb25lIG9mOlxuICAgKiAgKiBgSWRlbnRpZmllclJlZmVyZW5jZWBcbiAgICogICogYENvdmVySW5pdGlhbGl6ZWROYW1lYCAoYElkZW50aWZpZXJSZWZlcmVuY2UgXCI9XCIgQXNzaWdubWVudEV4cHJlc3Npb25gKVxuICAgKiAgKiBgUHJvcGVydHlOYW1lIDogQXNzaWdubWVudEV4cHJlc3Npb25gXG4gICAqIFRoZSB0aGUgcGFyc2VyIHdpbGwgc3RvcCBhdCB0aGUgZW5kIG9mIHRoZSBsZWFkaW5nIGBJZGVudGlmaWVyYCBvciBgUHJvcGVydHlOYW1lYCBhbmQgcmV0dXJuIGl0LlxuICAgKlxuICAgKiBAcmV0dXJucyB7e21ldGhvZE9yS2V5OiAoU2hpZnQuTWV0aG9kfFNoaWZ0LlByb3BlcnR5TmFtZSksIGtpbmQ6IHN0cmluZ319XG4gICAqL1xuICBwYXJzZU1ldGhvZERlZmluaXRpb24oaXNDbGFzc1Byb3RvTWV0aG9kKSB7XG4gICAgbGV0IHRva2VuID0gdGhpcy5sb29rYWhlYWQ7XG4gICAgbGV0IHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG5cbiAgICBsZXQgaXNHZW5lcmF0b3IgPSAhIXRoaXMuZWF0KFRva2VuVHlwZS5NVUwpO1xuXG4gICAgbGV0IGtleSA9IHRoaXMucGFyc2VQcm9wZXJ0eU5hbWUoKTtcblxuICAgIGlmICghaXNHZW5lcmF0b3IgJiYgdG9rZW4udHlwZSA9PT0gVG9rZW5UeXBlLklERU5USUZJRVIpIHtcbiAgICAgIGxldCBuYW1lID0gdG9rZW4udmFsdWU7XG4gICAgICBpZiAobmFtZS5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgLy8gUHJvcGVydHkgQXNzaWdubWVudDogR2V0dGVyIGFuZCBTZXR0ZXIuXG4gICAgICAgIGlmIChcImdldFwiID09PSBuYW1lICYmIHRoaXMubG9va2FoZWFkUHJvcGVydHlOYW1lKCkpIHtcbiAgICAgICAgICBrZXkgPSB0aGlzLnBhcnNlUHJvcGVydHlOYW1lKCk7XG4gICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLkxQQVJFTik7XG4gICAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLlJQQVJFTik7XG4gICAgICAgICAgbGV0IHByZXZpb3VzSW5Db25zdHJ1Y3RvciA9IHRoaXMuaW5Db25zdHJ1Y3RvcjtcbiAgICAgICAgICB0aGlzLmluQ29uc3RydWN0b3IgPSBmYWxzZTtcbiAgICAgICAgICBsZXQgcHJldmlvdXNJbk1ldGhvZCA9IHRoaXMuaW5NZXRob2Q7XG4gICAgICAgICAgdGhpcy5pbk1ldGhvZCA9IHRydWU7XG4gICAgICAgICAgbGV0IFtib2R5XSA9IHRoaXMucGFyc2VGdW5jdGlvbkJvZHkoKTtcbiAgICAgICAgICB0aGlzLmluQ29uc3RydWN0b3IgPSBwcmV2aW91c0luQ29uc3RydWN0b3I7XG4gICAgICAgICAgdGhpcy5pbk1ldGhvZCA9IHByZXZpb3VzSW5NZXRob2Q7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG1ldGhvZE9yS2V5OiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuR2V0dGVyKGtleSwgYm9keSksIHN0YXJ0TG9jYXRpb24pLFxuICAgICAgICAgICAga2luZDogXCJtZXRob2RcIlxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoXCJzZXRcIiA9PT0gbmFtZSAmJiB0aGlzLmxvb2thaGVhZFByb3BlcnR5TmFtZSgpKSB7XG4gICAgICAgICAga2V5ID0gdGhpcy5wYXJzZVByb3BlcnR5TmFtZSgpO1xuICAgICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5MUEFSRU4pO1xuICAgICAgICAgIGxldCBwYXJhbSA9IHRoaXMucGFyc2VQYXJhbSgpO1xuICAgICAgICAgIGxldCBpbmZvID0ge307XG4gICAgICAgICAgdGhpcy5jaGVja1BhcmFtKHBhcmFtLCB0b2tlbiwgW10sIGluZm8pO1xuICAgICAgICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5SUEFSRU4pO1xuICAgICAgICAgIGxldCBwcmV2aW91c1lpZWxkID0gdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbjtcbiAgICAgICAgICB0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uID0gZmFsc2U7XG4gICAgICAgICAgbGV0IHByZXZpb3VzSW5Db25zdHJ1Y3RvciA9IHRoaXMuaW5Db25zdHJ1Y3RvcjtcbiAgICAgICAgICB0aGlzLmluQ29uc3RydWN0b3IgPSBmYWxzZTtcbiAgICAgICAgICBsZXQgcHJldmlvdXNJbk1ldGhvZCA9IHRoaXMuaW5NZXRob2Q7XG4gICAgICAgICAgdGhpcy5pbk1ldGhvZCA9IHRydWU7XG4gICAgICAgICAgbGV0IFtib2R5LCBpc1N0cmljdF0gPSB0aGlzLnBhcnNlRnVuY3Rpb25Cb2R5KCk7XG4gICAgICAgICAgdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbiA9IHByZXZpb3VzWWllbGQ7XG4gICAgICAgICAgdGhpcy5pbkNvbnN0cnVjdG9yID0gcHJldmlvdXNJbkNvbnN0cnVjdG9yO1xuICAgICAgICAgIHRoaXMuaW5NZXRob2QgPSBwcmV2aW91c0luTWV0aG9kO1xuICAgICAgICAgIGlmIChpc1N0cmljdCkge1xuICAgICAgICAgICAgaWYgKGluZm8uZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24oaW5mby5maXJzdFJlc3RyaWN0ZWQsIGluZm8ubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBtZXRob2RPcktleTogdGhpcy5tYXJrTG9jYXRpb24obmV3IFNoaWZ0LlNldHRlcihrZXksIHBhcmFtLCBib2R5KSwgc3RhcnRMb2NhdGlvbiksXG4gICAgICAgICAgICBraW5kOiBcIm1ldGhvZFwiXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLm1hdGNoKFRva2VuVHlwZS5MUEFSRU4pKSB7XG4gICAgICBsZXQgcHJldmlvdXNZaWVsZCA9IHRoaXMuYWxsb3dZaWVsZEV4cHJlc3Npb247XG4gICAgICBsZXQgcHJldmlvdXNJbkdlbmVyYXRvclBhcmFtZXRlciA9IHRoaXMuaW5HZW5lcmF0b3JQYXJhbWV0ZXI7XG4gICAgICB0aGlzLmluR2VuZXJhdG9yUGFyYW1ldGVyID0gaXNHZW5lcmF0b3I7XG4gICAgICB0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uID0gaXNHZW5lcmF0b3I7XG4gICAgICBsZXQgcGFyYW1JbmZvID0gdGhpcy5wYXJzZVBhcmFtcyhudWxsKTtcbiAgICAgIHRoaXMuaW5HZW5lcmF0b3JQYXJhbWV0ZXIgPSBwcmV2aW91c0luR2VuZXJhdG9yUGFyYW1ldGVyO1xuICAgICAgdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbiA9IHByZXZpb3VzWWllbGQ7XG5cbiAgICAgIGxldCBwcmV2aW91c0luR2VuZXJhdG9yQm9keSA9IHRoaXMuaW5HZW5lcmF0b3JCb2R5O1xuICAgICAgbGV0IHByZXZpb3VzSW5Db25zdHJ1Y3RvciA9IHRoaXMuaW5Db25zdHJ1Y3RvcjtcbiAgICAgIGxldCBwcmV2aW91c0luTWV0aG9kID0gdGhpcy5pbk1ldGhvZDtcbiAgICAgIHRoaXMuYWxsb3dZaWVsZEV4cHJlc3Npb24gPSBpc0dlbmVyYXRvcjtcbiAgICAgIHRoaXMuaW5Db25zdHJ1Y3RvciA9XG4gICAgICAgIGlzQ2xhc3NQcm90b01ldGhvZCAmJiAhaXNHZW5lcmF0b3IgJiYgdGhpcy5oYXNDbGFzc0hlcml0YWdlICYmXG4gICAgICAgIGtleS50eXBlID09PSBcIlN0YXRpY1Byb3BlcnR5TmFtZVwiICYmIGtleS52YWx1ZSA9PT0gXCJjb25zdHJ1Y3RvclwiO1xuICAgICAgdGhpcy5pbk1ldGhvZCA9IHRydWU7XG5cbiAgICAgIGlmIChpc0dlbmVyYXRvcikge1xuICAgICAgICB0aGlzLmluR2VuZXJhdG9yQm9keSA9IHRydWU7XG4gICAgICB9XG4gICAgICBsZXQgW2JvZHldID0gdGhpcy5wYXJzZUZ1bmN0aW9uQm9keSgpO1xuICAgICAgdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbiA9IHByZXZpb3VzWWllbGQ7XG4gICAgICB0aGlzLmluR2VuZXJhdG9yQm9keSA9IHByZXZpb3VzSW5HZW5lcmF0b3JCb2R5O1xuICAgICAgdGhpcy5pbkNvbnN0cnVjdG9yID0gcHJldmlvdXNJbkNvbnN0cnVjdG9yO1xuICAgICAgdGhpcy5pbk1ldGhvZCA9IHByZXZpb3VzSW5NZXRob2Q7XG5cbiAgICAgIGlmIChwYXJhbUluZm8uZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24ocGFyYW1JbmZvLmZpcnN0UmVzdHJpY3RlZCwgcGFyYW1JbmZvLm1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWV0aG9kT3JLZXk6IHRoaXMubWFya0xvY2F0aW9uKFxuICAgICAgICAgIG5ldyBTaGlmdC5NZXRob2QoaXNHZW5lcmF0b3IsIGtleSwgcGFyYW1JbmZvLnBhcmFtcywgcGFyYW1JbmZvLnJlc3QsIGJvZHkpLCBzdGFydExvY2F0aW9uKSxcbiAgICAgICAga2luZDogXCJtZXRob2RcIlxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbWV0aG9kT3JLZXk6IGtleSxcbiAgICAgIGtpbmQ6IHRva2VuLnR5cGUua2xhc3MuaXNJZGVudGlmaWVyTmFtZSA/IFwiaWRlbnRpZmllclwiIDogXCJwcm9wZXJ0eVwiXG4gICAgfTtcbiAgfVxuXG4gIHBhcnNlQ2xhc3MoaXNFeHByKSB7XG4gICAgbGV0IGxvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbigpO1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5DTEFTUyk7XG4gICAgbGV0IGlkID0gbnVsbDtcbiAgICBsZXQgaGVyaXRhZ2UgPSBudWxsO1xuICAgIGlmICghaXNFeHByIHx8IHRoaXMubWF0Y2goVG9rZW5UeXBlLklERU5USUZJRVIpKSB7XG4gICAgICBsZXQgbG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgICBpZCA9IHRoaXMubWFya0xvY2F0aW9uKG5ldyBTaGlmdC5CaW5kaW5nSWRlbnRpZmllcih0aGlzLnBhcnNlSWRlbnRpZmllcigpKSwgbG9jYXRpb24pO1xuICAgIH1cblxuICAgIGxldCBwcmV2aW91c0luR2VuZXJhdG9yUGFyYW1ldGVyID0gdGhpcy5pbkdlbmVyYXRvclBhcmFtZXRlcjtcbiAgICBsZXQgcHJldmlvdXNQYXJhbVlpZWxkID0gdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbjtcbiAgICBsZXQgcHJldmlvdXNIYXNDbGFzc0hlcml0YWdlID0gdGhpcy5oYXNDbGFzc0hlcml0YWdlO1xuICAgIGlmIChpc0V4cHIpIHtcbiAgICAgIHRoaXMuaW5HZW5lcmF0b3JQYXJhbWV0ZXIgPSBmYWxzZTtcbiAgICAgIHRoaXMuYWxsb3dZaWVsZEV4cHJlc3Npb24gPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZWF0KFRva2VuVHlwZS5FWFRFTkRTKSkge1xuICAgICAgaGVyaXRhZ2UgPSB0aGlzLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbih0cnVlKTtcbiAgICB9XG5cbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuTEJSQUNFKTtcbiAgICBsZXQgb3JpZ2luYWxTdHJpY3QgPSB0aGlzLnN0cmljdDtcbiAgICB0aGlzLnN0cmljdCA9IHRydWU7XG4gICAgbGV0IG1ldGhvZHMgPSBbXTtcbiAgICBsZXQgaGFzQ29uc3RydWN0b3IgPSBmYWxzZTtcbiAgICB0aGlzLmhhc0NsYXNzSGVyaXRhZ2UgPSBoZXJpdGFnZSAhPSBudWxsO1xuICAgIHdoaWxlICghdGhpcy5lYXQoVG9rZW5UeXBlLlJCUkFDRSkpIHtcbiAgICAgIGlmICh0aGlzLmVhdChUb2tlblR5cGUuU0VNSUNPTE9OKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGxldCBtZXRob2RUb2tlbiA9IHRoaXMubG9va2FoZWFkO1xuICAgICAgbGV0IGlzU3RhdGljID0gZmFsc2U7XG4gICAgICBsZXQge21ldGhvZE9yS2V5LCBraW5kfSA9IHRoaXMucGFyc2VNZXRob2REZWZpbml0aW9uKHRydWUpO1xuICAgICAgaWYgKGtpbmQgPT09ICdpZGVudGlmaWVyJyAmJiBtZXRob2RPcktleS52YWx1ZSA9PT0gJ3N0YXRpYycpIHtcbiAgICAgICAgaXNTdGF0aWMgPSB0cnVlO1xuICAgICAgICAoe21ldGhvZE9yS2V5LCBraW5kfSA9IHRoaXMucGFyc2VNZXRob2REZWZpbml0aW9uKGZhbHNlKSk7XG4gICAgICB9XG4gICAgICBzd2l0Y2ggKGtpbmQpIHtcbiAgICAgICAgY2FzZSBcIm1ldGhvZFwiOlxuICAgICAgICAgIGxldCBrZXkgPSBtZXRob2RPcktleS5uYW1lO1xuICAgICAgICAgIGlmICghaXNTdGF0aWMpIHtcbiAgICAgICAgICAgIGlmIChrZXkudHlwZSA9PT0gXCJTdGF0aWNQcm9wZXJ0eU5hbWVcIiAmJiBrZXkudmFsdWUgPT09IFwiY29uc3RydWN0b3JcIikge1xuICAgICAgICAgICAgICBpZiAobWV0aG9kT3JLZXkudHlwZSAhPT0gXCJNZXRob2RcIiB8fCBtZXRob2RPcktleS5pc0dlbmVyYXRvcikge1xuICAgICAgICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24obWV0aG9kVG9rZW4sIFwiQ29uc3RydWN0b3JzIGNhbm5vdCBiZSBnZW5lcmF0b3JzLCBnZXR0ZXJzIG9yIHNldHRlcnNcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGhhc0NvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcldpdGhMb2NhdGlvbihtZXRob2RUb2tlbiwgXCJPbmx5IG9uZSBjb25zdHJ1Y3RvciBpcyBhbGxvd2VkIGluIGEgY2xhc3NcIik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaGFzQ29uc3RydWN0b3IgPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChrZXkudHlwZSA9PT0gXCJTdGF0aWNQcm9wZXJ0eU5hbWVcIiAmJiBrZXkudmFsdWUgPT09IFwicHJvdG90eXBlXCIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcldpdGhMb2NhdGlvbihtZXRob2RUb2tlbiwgXCJTdGF0aWMgY2xhc3MgbWV0aG9kcyBjYW5ub3QgYmUgbmFtZWQgJ3Byb3RvdHlwZSdcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIG1ldGhvZHMucHVzaChuZXcgU2hpZnQuQ2xhc3NFbGVtZW50KGlzU3RhdGljLCBtZXRob2RPcktleSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IoXCJPbmx5IG1ldGhvZHMgYXJlIGFsbG93ZWQgaW4gY2xhc3Nlc1wiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5zdHJpY3QgPSBvcmlnaW5hbFN0cmljdDtcbiAgICB0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uID0gcHJldmlvdXNQYXJhbVlpZWxkO1xuICAgIHRoaXMuaW5HZW5lcmF0b3JQYXJhbWV0ZXIgPSBwcmV2aW91c0luR2VuZXJhdG9yUGFyYW1ldGVyO1xuICAgIHJldHVybiB0aGlzLm1hcmtMb2NhdGlvbihuZXcgKGlzRXhwciA/IFNoaWZ0LkNsYXNzRXhwcmVzc2lvbiA6IFNoaWZ0LkNsYXNzRGVjbGFyYXRpb24pKGlkLCBoZXJpdGFnZSwgbWV0aG9kcyksIGxvY2F0aW9uKTtcbiAgfVxuXG4gIHBhcnNlRnVuY3Rpb24oaXNFeHByLCBhbGxvd0dlbmVyYXRvciA9IHRydWUpIHtcbiAgICBsZXQgc3RhcnRMb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oKTtcblxuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5GVU5DVElPTik7XG5cbiAgICBsZXQgaWQgPSBudWxsO1xuICAgIGxldCBtZXNzYWdlID0gbnVsbDtcbiAgICBsZXQgZmlyc3RSZXN0cmljdGVkID0gbnVsbDtcbiAgICBsZXQgaXNHZW5lcmF0b3IgPSBhbGxvd0dlbmVyYXRvciAmJiAhIXRoaXMuZWF0KFRva2VuVHlwZS5NVUwpO1xuICAgIGxldCBwcmV2aW91c0dlbmVyYXRvclBhcmFtZXRlciA9IHRoaXMuaW5HZW5lcmF0b3JQYXJhbWV0ZXI7XG4gICAgbGV0IHByZXZpb3VzWWllbGQgPSB0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uO1xuICAgIGxldCBwcmV2aW91c0luR2VuZXJhdG9yQm9keSA9IHRoaXMuaW5HZW5lcmF0b3JCb2R5O1xuXG4gICAgaWYgKCFpc0V4cHIgfHwgIXRoaXMubWF0Y2goVG9rZW5UeXBlLkxQQVJFTikpIHtcbiAgICAgIGxldCB0b2tlbiA9IHRoaXMubG9va2FoZWFkO1xuICAgICAgbGV0IHN0YXJ0TG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKCk7XG4gICAgICBpZCA9IHRoaXMucGFyc2VJZGVudGlmaWVyKCk7XG4gICAgICBpZiAodGhpcy5zdHJpY3QpIHtcbiAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQoaWQubmFtZSkpIHtcbiAgICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yV2l0aExvY2F0aW9uKHRva2VuLCBFcnJvck1lc3NhZ2VzLlNUUklDVF9GVU5DVElPTl9OQU1FKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQoaWQubmFtZSkpIHtcbiAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICBtZXNzYWdlID0gRXJyb3JNZXNzYWdlcy5TVFJJQ1RfRlVOQ1RJT05fTkFNRTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmRFUzUoaWQubmFtZSkpIHtcbiAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICBtZXNzYWdlID0gRXJyb3JNZXNzYWdlcy5TVFJJQ1RfUkVTRVJWRURfV09SRDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWQgPSB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuQmluZGluZ0lkZW50aWZpZXIoaWQpLCBzdGFydExvY2F0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5pbkdlbmVyYXRvclBhcmFtZXRlciA9IGlzR2VuZXJhdG9yO1xuICAgIHRoaXMuYWxsb3dZaWVsZEV4cHJlc3Npb24gPSBpc0dlbmVyYXRvcjtcbiAgICBsZXQgaW5mbyA9IHRoaXMucGFyc2VQYXJhbXMoZmlyc3RSZXN0cmljdGVkKTtcbiAgICB0aGlzLmluR2VuZXJhdG9yUGFyYW1ldGVyID0gcHJldmlvdXNHZW5lcmF0b3JQYXJhbWV0ZXI7XG4gICAgdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbiA9IHByZXZpb3VzWWllbGQ7XG5cbiAgICBpZiAoaW5mby5tZXNzYWdlICE9IG51bGwpIHtcbiAgICAgIG1lc3NhZ2UgPSBpbmZvLm1lc3NhZ2U7XG4gICAgfVxuXG4gICAgbGV0IHByZXZpb3VzU3RyaWN0ID0gdGhpcy5zdHJpY3Q7XG4gICAgdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbiA9IGlzR2VuZXJhdG9yO1xuICAgIGlmIChpc0dlbmVyYXRvcikge1xuICAgICAgdGhpcy5pbkdlbmVyYXRvckJvZHkgPSB0cnVlO1xuICAgIH1cbiAgICBsZXQgcHJldmlvdXNJbkNvbnN0cnVjdG9yID0gdGhpcy5pbkNvbnN0cnVjdG9yO1xuICAgIHRoaXMuaW5Db25zdHJ1Y3RvciA9IGZhbHNlO1xuICAgIGxldCBwcmV2aW91c0luTWV0aG9kID0gdGhpcy5pbk1ldGhvZDtcbiAgICB0aGlzLmluTWV0aG9kID0gZmFsc2U7XG4gICAgbGV0IFtib2R5LCBpc1N0cmljdF0gPSB0aGlzLnBhcnNlRnVuY3Rpb25Cb2R5KCk7XG4gICAgdGhpcy5pbkdlbmVyYXRvckJvZHkgPSBwcmV2aW91c0luR2VuZXJhdG9yQm9keTtcbiAgICB0aGlzLmluQ29uc3RydWN0b3IgPSBwcmV2aW91c0luQ29uc3RydWN0b3I7XG4gICAgdGhpcy5pbk1ldGhvZCA9IHByZXZpb3VzSW5NZXRob2Q7XG5cbiAgICB0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uID0gcHJldmlvdXNZaWVsZDtcbiAgICBpZiAobWVzc2FnZSAhPSBudWxsKSB7XG4gICAgICBpZiAoKHRoaXMuc3RyaWN0IHx8IGlzU3RyaWN0KSAmJiBpbmZvLmZpcnN0UmVzdHJpY3RlZCAhPSBudWxsKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24oaW5mby5maXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnN0cmljdCA9IHByZXZpb3VzU3RyaWN0O1xuICAgIGxldCBjb25zID0gaXNFeHByID8gU2hpZnQuRnVuY3Rpb25FeHByZXNzaW9uIDogU2hpZnQuRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICByZXR1cm4gdGhpcy5tYXJrTG9jYXRpb24oXG4gICAgICBuZXcgY29ucyhpc0dlbmVyYXRvciwgaWQsIGluZm8ucGFyYW1zLCBpbmZvLnJlc3QsIGJvZHkpLFxuICAgICAgc3RhcnRMb2NhdGlvblxuICAgICk7XG4gIH1cblxuICBwYXJzZVBhcmFtKGJvdW5kLCBpbmZvKSB7XG4gICAgbGV0IHRva2VuID0gdGhpcy5sb29rYWhlYWQ7XG4gICAgaWYgKHRoaXMubWF0Y2goVG9rZW5UeXBlLkxQQVJFTikpIHtcbiAgICAgIHRocm93IHRoaXMuY3JlYXRlVW5leHBlY3RlZCh0aGlzLmxvb2thaGVhZCk7XG4gICAgfVxuICAgIGxldCBwYXJhbSA9IHRoaXMucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKCk7XG4gICAgaWYgKHRoaXMuZWF0KFRva2VuVHlwZS5BU1NJR04pKSB7XG4gICAgICBsZXQgcHJldmlvdXNJbkdlbmVyYXRvclBhcmFtZXRlciA9IHRoaXMuaW5HZW5lcmF0b3JQYXJhbWV0ZXI7XG4gICAgICBsZXQgcHJldmlvdXNZaWVsZEV4cHJlc3Npb24gPSB0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uO1xuICAgICAgaWYgKHRoaXMuaW5HZW5lcmF0b3JQYXJhbWV0ZXIpIHtcbiAgICAgICAgdGhpcy5hbGxvd1lpZWxkRXhwcmVzc2lvbiA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgdGhpcy5pbkdlbmVyYXRvclBhcmFtZXRlciA9IGZhbHNlO1xuICAgICAgcGFyYW0gPSB0aGlzLm1hcmtMb2NhdGlvbihuZXcgU2hpZnQuQXNzaWdubWVudEV4cHJlc3Npb24oXCI9XCIsIHBhcmFtLCB0aGlzLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSkpO1xuICAgICAgdGhpcy5pbkdlbmVyYXRvclBhcmFtZXRlciA9IHByZXZpb3VzSW5HZW5lcmF0b3JQYXJhbWV0ZXI7XG4gICAgICB0aGlzLmFsbG93WWllbGRFeHByZXNzaW9uID0gcHJldmlvdXNZaWVsZEV4cHJlc3Npb247XG4gICAgfVxuICAgIGlmICghUGFyc2VyLmlzRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnRUYXJnZXRXaXRoRGVmYXVsdChwYXJhbSkpIHtcbiAgICAgIHRocm93IHRoaXMuY3JlYXRlVW5leHBlY3RlZCh0b2tlbik7XG4gICAgfVxuICAgIHJldHVybiBQYXJzZXIudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ0Fzc2lnbm1lbnQocGFyYW0pO1xuICB9XG5cbiAgY2hlY2tQYXJhbShwYXJhbSwgdG9rZW4sIGJvdW5kLCBpbmZvKSB7XG4gICAgbGV0IG5ld0JvdW5kID0gUGFyc2VyLmJvdW5kTmFtZXMocGFyYW0pO1xuICAgIFtdLnB1c2guYXBwbHkoYm91bmQsIG5ld0JvdW5kKTtcblxuICAgIGlmIChmaXJzdER1cGxpY2F0ZShuZXdCb3VuZCkgIT0gbnVsbCkge1xuICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcldpdGhMb2NhdGlvbih0b2tlbiwgRXJyb3JNZXNzYWdlcy5EVVBMSUNBVEVfQklORElORywgZmlyc3REdXBsaWNhdGUobmV3Qm91bmQpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdHJpY3QpIHtcbiAgICAgIGlmIChuZXdCb3VuZC5zb21lKGlzUmVzdHJpY3RlZFdvcmQpKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3JXaXRoTG9jYXRpb24odG9rZW4sIEVycm9yTWVzc2FnZXMuU1RSSUNUX1BBUkFNX05BTUUpO1xuICAgICAgfSBlbHNlIGlmIChmaXJzdER1cGxpY2F0ZShib3VuZCkgIT0gbnVsbCkge1xuICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yV2l0aExvY2F0aW9uKHRva2VuLCBFcnJvck1lc3NhZ2VzLlNUUklDVF9QQVJBTV9EVVBFKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGluZm8uZmlyc3RSZXN0cmljdGVkID09IG51bGwpIHtcbiAgICAgIGlmIChuZXdCb3VuZC5zb21lKGlzUmVzdHJpY3RlZFdvcmQpKSB7XG4gICAgICAgIGluZm8uZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgIGluZm8ubWVzc2FnZSA9IEVycm9yTWVzc2FnZXMuU1RSSUNUX1BBUkFNX05BTUU7XG4gICAgICB9IGVsc2UgaWYgKGhhc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQobmV3Qm91bmQpKSB7XG4gICAgICAgIGluZm8uZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgIGluZm8ubWVzc2FnZSA9IEVycm9yTWVzc2FnZXMuU1RSSUNUX1JFU0VSVkVEX1dPUkQ7XG4gICAgICB9IGVsc2UgaWYgKGZpcnN0RHVwbGljYXRlKGJvdW5kKSAhPSBudWxsKSB7XG4gICAgICAgIGluZm8uZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgIGluZm8ubWVzc2FnZSA9IEVycm9yTWVzc2FnZXMuU1RSSUNUX1BBUkFNX0RVUEU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcGFyc2VQYXJhbXMoZnIpIHtcbiAgICBsZXQgaW5mbyA9IHtwYXJhbXM6IFtdLCByZXN0OiBudWxsfTtcbiAgICBpbmZvLmZpcnN0UmVzdHJpY3RlZCA9IGZyO1xuICAgIHRoaXMuZXhwZWN0KFRva2VuVHlwZS5MUEFSRU4pO1xuXG4gICAgaWYgKCF0aGlzLm1hdGNoKFRva2VuVHlwZS5SUEFSRU4pKSB7XG4gICAgICBsZXQgYm91bmQgPSBbXTtcbiAgICAgIGxldCBzZWVuUmVzdCA9IGZhbHNlO1xuXG4gICAgICB3aGlsZSAoIXRoaXMuZW9mKCkpIHtcbiAgICAgICAgbGV0IHRva2VuID0gdGhpcy5sb29rYWhlYWQ7XG4gICAgICAgIGxldCBzdGFydExvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbigpO1xuICAgICAgICBsZXQgcGFyYW07XG4gICAgICAgIGlmICh0aGlzLmVhdChUb2tlblR5cGUuRUxMSVBTSVMpKSB7XG4gICAgICAgICAgdG9rZW4gPSB0aGlzLmxvb2thaGVhZDtcbiAgICAgICAgICBwYXJhbSA9IG5ldyBTaGlmdC5CaW5kaW5nSWRlbnRpZmllcih0aGlzLnBhcnNlSWRlbnRpZmllcigpKTtcbiAgICAgICAgICBjcExvYyhwYXJhbS5pZGVudGlmaWVyLCBwYXJhbSk7XG4gICAgICAgICAgc2VlblJlc3QgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcmFtID0gdGhpcy5wYXJzZVBhcmFtKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNoZWNrUGFyYW0ocGFyYW0sIHRva2VuLCBib3VuZCwgaW5mbyk7XG5cbiAgICAgICAgaWYgKHNlZW5SZXN0KSB7XG4gICAgICAgICAgaW5mby5yZXN0ID0gcGFyYW07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaW5mby5wYXJhbXMucHVzaChwYXJhbSk7XG4gICAgICAgIGlmICh0aGlzLm1hdGNoKFRva2VuVHlwZS5SUEFSRU4pKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5leHBlY3QoVG9rZW5UeXBlLkNPTU1BKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmV4cGVjdChUb2tlblR5cGUuUlBBUkVOKTtcbiAgICByZXR1cm4gaW5mbztcbiAgfVxufVxuIl19