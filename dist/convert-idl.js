"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertIDL = convertIDL;
var ts = require("typescript");
var bufferSourceTypes = [
    'ArrayBuffer',
    'ArrayBufferView',
    'DataView',
    'Int8Array',
    'Uint8Array',
    'Int16Array',
    'Uint16Array',
    'Uint8ClampedArray',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
];
var integerTypes = ['byte', 'octet', 'short', 'unsigned short', 'long', 'unsigned long', 'long long', 'unsigned long long'];
var stringTypes = ['ByteString', 'DOMString', 'USVString', 'CSSOMString'];
var floatTypes = ['float', 'unrestricted float', 'double', 'unrestricted double'];
var sameTypes = ['any', 'boolean', 'Date', 'Function', 'Promise', 'void'];
var baseTypeConversionMap = new Map(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], __spreadArray([], bufferSourceTypes, true).map(function (type) { return [type, type]; }), true), __spreadArray([], integerTypes, true).map(function (type) { return [type, 'number']; }), true), __spreadArray([], floatTypes, true).map(function (type) { return [type, 'number']; }), true), __spreadArray([], stringTypes, true).map(function (type) { return [type, 'string']; }), true), __spreadArray([], sameTypes, true).map(function (type) { return [type, type]; }), true), [
    ['object', 'any'],
    ['sequence', 'Array'],
    ['record', 'Record'],
    ['FrozenArray', 'ReadonlyArray'],
    ['EventHandler', 'EventHandler'],
    ['VoidPtr', 'unknown'],
], false));
function convertIDL(rootTypes, options) {
    var _a;
    if (options === void 0) { options = {}; }
    var nodes = [];
    var emscriptenEnumMembers = new Set();
    for (var _i = 0, rootTypes_1 = rootTypes; _i < rootTypes_1.length; _i++) {
        var rootType = rootTypes_1[_i];
        switch (rootType.type) {
            case 'interface':
            case 'interface mixin':
            case 'dictionary':
            case 'namespace':
                nodes.push(convertInterface(rootType, options));
                for (var _b = 0, _c = rootType.extAttrs; _b < _c.length; _b++) {
                    var attr = _c[_b];
                    if (attr.name === 'Exposed' && ((_a = attr.rhs) === null || _a === void 0 ? void 0 : _a.value) === 'Window') {
                        nodes.push(ts.factory.createVariableStatement([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], ts.factory.createVariableDeclarationList([
                            ts.factory.createVariableDeclaration(ts.factory.createIdentifier(rootType.name), undefined, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(rootType.name), undefined), undefined),
                        ], undefined)));
                    }
                }
                break;
            case 'includes':
                nodes.push(convertInterfaceIncludes(rootType));
                break;
            case 'enum':
                nodes.push.apply(nodes, convertEnum(rootType, options, emscriptenEnumMembers));
                break;
            case 'callback':
                nodes.push(convertCallback(rootType));
                break;
            case 'typedef':
                nodes.push(convertTypedef(rootType));
                break;
            default:
                console.log(newUnsupportedError('Unsupported IDL type', rootType));
                break;
        }
    }
    return nodes;
}
function createMethod(_a) {
    var modifiers = _a.modifiers, name = _a.name, questionToken = _a.questionToken, typeParameters = _a.typeParameters, parameters = _a.parameters, type = _a.type, emscripten = _a.emscripten;
    if (emscripten) {
        return ts.factory.createMethodDeclaration(modifiers, undefined, name, questionToken, typeParameters, parameters, type, undefined);
    }
    return ts.factory.createMethodSignature(modifiers, name, questionToken, typeParameters, parameters, type);
}
function createProperty(_a) {
    var modifiers = _a.modifiers, name = _a.name, questionOrExclamationToken = _a.questionOrExclamationToken, type = _a.type, emscripten = _a.emscripten;
    if (emscripten) {
        return ts.factory.createPropertyDeclaration(modifiers, name, questionOrExclamationToken, type, undefined);
    }
    return ts.factory.createPropertySignature(modifiers, name, questionOrExclamationToken, type);
}
function convertTypedef(idl) {
    return ts.factory.createTypeAliasDeclaration([], ts.factory.createIdentifier(idl.name), undefined, convertType(idl.idlType));
}
function createIterableMethods(name, keyType, valueType, pair, async, _a) {
    var emscripten = _a.emscripten;
    return [
        createMethod({
            name: async ? '[Symbol.asyncIterator]' : '[Symbol.iterator]',
            type: ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'), pair ? [ts.factory.createTupleTypeNode([keyType, valueType])] : [valueType]),
            emscripten: emscripten,
        }),
        createMethod({
            name: 'entries',
            type: ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'), [ts.factory.createTupleTypeNode([keyType, valueType])]),
            emscripten: emscripten,
        }),
        createMethod({
            name: 'keys',
            type: ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'), [keyType]),
            emscripten: emscripten,
        }),
        createMethod({
            name: 'values',
            type: ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator'), [valueType]),
            emscripten: emscripten,
        }),
        createMethod({
            name: 'forEach',
            parameters: [
                ts.factory.createParameterDeclaration([], undefined, 'callbackfn', undefined, ts.factory.createFunctionTypeNode([], [
                    ts.factory.createParameterDeclaration([], undefined, 'value', undefined, valueType),
                    ts.factory.createParameterDeclaration([], undefined, pair ? 'key' : 'index', undefined, keyType),
                    ts.factory.createParameterDeclaration([], undefined, pair ? 'iterable' : 'array', undefined, pair ? ts.factory.createTypeReferenceNode(name, []) : ts.factory.createArrayTypeNode(valueType)),
                ], ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword))),
                ts.factory.createParameterDeclaration([], undefined, 'thisArg', ts.factory.createToken(ts.SyntaxKind.QuestionToken), ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)),
            ],
            type: ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
            emscripten: emscripten,
        }),
    ];
}
function isFrozenArrayAttribute(member) {
    return member.type === 'attribute' && member.idlType.generic === 'FrozenArray';
}
function convertInterface(idl, options) {
    var emscriptenJSImplementation = options.emscripten && idl.extAttrs.find(function (attr) { return attr.name === 'JSImplementation'; });
    var members = [];
    var inheritance = [];
    if ('inheritance' in idl && idl.inheritance) {
        inheritance.push(ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(idl.inheritance), undefined));
    }
    if (emscriptenJSImplementation && inheritance.length === 0) {
        var attributeValue = emscriptenJSImplementation.rhs.value;
        attributeValue = attributeValue.replace(/^"(.*)"$/, '$1');
        inheritance.push(ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(attributeValue), undefined));
    }
    idl.members.forEach(function (member) {
        switch (member.type) {
            case 'attribute':
                if (options.emscripten) {
                    members.push(createEmscriptenAttributeGetter(member));
                    members.push(createEmscriptenAttributeSetter(member));
                }
                if (options.emscripten && isFrozenArrayAttribute(member)) {
                    // for emscripten array attributes, the value of the attribute is the first item in the array
                    members.push(convertMemberAttribute({
                        type: member.type,
                        name: member.name,
                        special: member.special,
                        inherit: member.inherit,
                        readonly: member.readonly,
                        parent: member.parent,
                        extAttrs: member.extAttrs,
                        idlType: member.idlType.idlType[0],
                    }, options));
                }
                else {
                    members.push(convertMemberAttribute(member, options));
                }
                break;
            case 'operation':
                if (member.name === idl.name) {
                    members.push(convertMemberConstructor(member, options));
                }
                else {
                    members.push(convertMemberOperation(member, !!emscriptenJSImplementation, options));
                }
                break;
            case 'constructor':
                members.push(convertMemberConstructor(member, options));
                break;
            case 'field':
                members.push(convertMemberField(member, options));
                break;
            case 'const':
                members.push(convertMemberConst(member, options));
                break;
            case 'iterable': {
                var indexedPropertyGetter = idl.members.find(function (member) {
                    return member.type === 'operation' && member.special === 'getter' && member.arguments[0].idlType.idlType === 'unsigned long';
                });
                if ((indexedPropertyGetter && member.idlType.length === 1) || member.idlType.length === 2) {
                    var keyType = convertType(indexedPropertyGetter ? indexedPropertyGetter.arguments[0].idlType : member.idlType[0]);
                    var valueType = convertType(member.idlType[member.idlType.length - 1]);
                    members.push.apply(members, createIterableMethods(idl.name, keyType, valueType, member.idlType.length === 2, member.async, options));
                }
                break;
            }
            case 'setlike':
                inheritance.push(ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(member.readonly ? 'ReadonlySet' : 'Set'), [
                    convertType(member.idlType[0]),
                ]));
                break;
            case 'maplike':
                inheritance.push(ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(member.readonly ? 'ReadonlyMap' : 'Map'), [
                    convertType(member.idlType[0]),
                    convertType(member.idlType[1]),
                ]));
                break;
            default:
                console.log(newUnsupportedError('Unsupported IDL member', member));
                break;
        }
    });
    // create a type alias if map or set is the only inheritance and there are no members
    if (inheritance.length === 1 && !members.length) {
        var expression = inheritance[0].expression;
        if (ts.isIdentifier(expression) && ['ReadonlyMap', 'Map', 'ReadonlySet', 'Set'].includes(expression.text)) {
            return ts.factory.createTypeAliasDeclaration(undefined, ts.factory.createIdentifier(idl.name), undefined, inheritance[0]);
        }
    }
    if (options.emscripten) {
        return ts.factory.createClassDeclaration([], ts.factory.createIdentifier(idl.name), undefined, !inheritance.length ? undefined : [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)], members);
    }
    return ts.factory.createInterfaceDeclaration(undefined, ts.factory.createIdentifier(idl.name), undefined, !inheritance.length ? undefined : [ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)], members);
}
function convertInterfaceIncludes(idl) {
    return ts.factory.createInterfaceDeclaration([], ts.factory.createIdentifier(idl.target), undefined, [
        ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
            ts.factory.createExpressionWithTypeArguments(ts.factory.createIdentifier(idl.includes), undefined),
        ]),
    ], []);
}
function createEmscriptenAttributeGetter(value) {
    var idlType;
    var parameters;
    if (isFrozenArrayAttribute(value)) {
        idlType = value.idlType.idlType[0];
        parameters = [
            ts.factory.createParameterDeclaration([], undefined, 'index', undefined, ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)),
        ];
    }
    else {
        idlType = value.idlType;
        parameters = [];
    }
    return createMethod({
        name: 'get_' + value.name,
        type: convertType(idlType),
        parameters: parameters,
        emscripten: true,
    });
}
function createEmscriptenAttributeSetter(value) {
    var idlType;
    var parameters;
    if (isFrozenArrayAttribute(value)) {
        idlType = value.idlType.idlType[0];
        parameters = [
            ts.factory.createParameterDeclaration([], undefined, 'index', undefined, ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)),
            ts.factory.createParameterDeclaration([], undefined, value.name, undefined, convertType(idlType)),
        ];
    }
    else {
        idlType = value.idlType;
        parameters = [ts.factory.createParameterDeclaration([], undefined, value.name, undefined, convertType(idlType))];
    }
    return createMethod({
        name: 'set_' + value.name,
        type: ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
        parameters: parameters,
        emscripten: true,
    });
}
function convertMemberOperation(idl, isEmscriptenJSImplementation, _a) {
    var emscripten = _a.emscripten;
    var parameters = idl.arguments.map(isEmscriptenJSImplementation ? convertEmscriptenJSImplementationArgument : convertArgument);
    var modifiers = [];
    // emscripten uses static for binding to c++, but exposes the method on the prototype
    if (idl.special === 'static' && !emscripten) {
        modifiers.push(ts.factory.createModifier(ts.SyntaxKind.StaticKeyword));
    }
    return createMethod({
        modifiers: modifiers,
        name: idl.name,
        type: convertType(idl.idlType),
        parameters: parameters,
        emscripten: emscripten,
    });
}
function convertMemberConstructor(idl, _a) {
    var emscripten = _a.emscripten;
    var args = idl.arguments.map(convertArgument);
    if (emscripten) {
        return ts.factory.createMethodDeclaration([], undefined, 'constructor', undefined, [], args, undefined, undefined);
    }
    return ts.factory.createConstructSignature([], args, undefined);
}
function convertMemberField(idl, _a) {
    var emscripten = _a.emscripten;
    var optional = !idl.required ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined;
    return createProperty({
        modifiers: undefined,
        name: ts.factory.createIdentifier(idl.name),
        questionOrExclamationToken: optional,
        type: convertType(idl.idlType),
        emscripten: emscripten,
    });
}
function convertMemberConst(idl, _a) {
    var emscripten = _a.emscripten;
    var modifiers = [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)];
    return createProperty({
        modifiers: modifiers,
        name: ts.factory.createIdentifier(idl.name),
        questionOrExclamationToken: undefined,
        type: convertType(idl.idlType),
        emscripten: emscripten,
    });
}
function convertMemberAttribute(idl, _a) {
    var emscripten = _a.emscripten;
    return createProperty({
        modifiers: [idl.readonly ? ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword) : null].filter(function (it) { return it != null; }),
        name: ts.factory.createIdentifier(idl.name),
        questionOrExclamationToken: undefined,
        type: convertType(idl.idlType),
        emscripten: emscripten,
    });
}
function convertArgument(idl) {
    var optional = idl.optional ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined;
    return ts.factory.createParameterDeclaration([], undefined, idl.name, optional, convertType(idl.idlType));
}
function convertEmscriptenJSImplementationArgument(idl) {
    // JSImplementation method arguments are currently only passed as numeric types and pointers
    // May need to change this to support DOMString in future: https://github.com/emscripten-core/emscripten/issues/10705
    var numberType = makeFinalType(ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), idl.idlType);
    return ts.factory.createParameterDeclaration([], undefined, idl.name, undefined, numberType);
}
function makeFinalType(type, idl) {
    if (idl.nullable) {
        return ts.factory.createUnionTypeNode([type, ts.factory.createLiteralTypeNode(ts.factory.createNull())]);
    }
    return type;
}
function convertType(idl) {
    if (typeof idl.idlType === 'string') {
        var type = baseTypeConversionMap.get(idl.idlType) || idl.idlType;
        switch (type) {
            case 'number':
                return makeFinalType(ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), idl);
            case 'string':
                return makeFinalType(ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), idl);
            case 'void':
                return ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
            default:
                return makeFinalType(ts.factory.createTypeReferenceNode(type, []), idl);
        }
    }
    if (idl.generic) {
        var type = baseTypeConversionMap.get(idl.generic) || idl.generic;
        var typeReferenceNode = ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type), idl.idlType.map(convertType));
        return makeFinalType(typeReferenceNode, idl);
    }
    if (idl.union) {
        return ts.factory.createUnionTypeNode(idl.idlType.map(convertType));
    }
    console.log(newUnsupportedError('Unsupported IDL type', idl));
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
}
function convertEnum(idl, options, emscriptenEnumMembers) {
    if (!options.emscripten) {
        return [
            ts.factory.createTypeAliasDeclaration(undefined, ts.factory.createIdentifier(idl.name), undefined, ts.factory.createUnionTypeNode(idl.values.map(function (it) { return ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(it.value)); }))),
        ];
    }
    var memberNames = idl.values.map(function (it) {
        // Strip the namespace from the member name if present, e.g. `EnumNamespace::` in "EnumNamespace::e_namespace_val"
        // see: https://emscripten.org/docs/porting/connecting_cpp_and_javascript/WebIDL-Binder.html#enums
        return it.value.replace(/.*::/, '');
    });
    // emscripten enums are exposed on the module their names, e.g. 'Module.MemberName'
    // create a variable declaration for each enum member
    var enumVariableDeclarations = memberNames
        .map(function (member) {
        if (emscriptenEnumMembers.has(member)) {
            console.warn("Duplicate enum member name: '".concat(member, "'. Omitting duplicate from types. Enums in emscripten are exposed on the module their names, e.g. 'Module.MemberName', not 'Module.Enum.MemberName'."));
            return undefined;
        }
        emscriptenEnumMembers.add(member);
        var variableDeclaration = ts.factory.createVariableDeclaration(ts.factory.createIdentifier(member), undefined, ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword));
        return ts.factory.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([variableDeclaration], ts.NodeFlags.Const));
    })
        .filter(Boolean);
    var enumVariableDeclarationsUnionType = ts.factory.createTypeAliasDeclaration(undefined, ts.factory.createIdentifier(idl.name), undefined, ts.factory.createUnionTypeNode(memberNames.map(function (it) { return ts.factory.createTypeReferenceNode("typeof ".concat(it), undefined); })));
    var emscriptenInternalWrapperFunctions = memberNames.map(function (member) {
        return ts.factory.createFunctionDeclaration(undefined, undefined, ts.factory.createIdentifier("_emscripten_enum_".concat(idl.name, "_").concat(member)), undefined, [], ts.factory.createTypeReferenceNode(idl.name, undefined), undefined);
    });
    return __spreadArray(__spreadArray(__spreadArray([], enumVariableDeclarations, true), [enumVariableDeclarationsUnionType], false), emscriptenInternalWrapperFunctions, true);
}
function convertCallback(idl) {
    return ts.factory.createTypeAliasDeclaration(undefined, ts.factory.createIdentifier(idl.name), undefined, ts.factory.createFunctionTypeNode(undefined, idl.arguments.map(convertArgument), convertType(idl.idlType)));
}
function newUnsupportedError(message, idl) {
    return new Error("\n  ".concat(message, "\n  ").concat(JSON.stringify(idl, null, 2), "\n\n  Please file an issue at https://github.com/pmndrs/webidl-dts-gen and provide the used idl file or example.\n"));
}
