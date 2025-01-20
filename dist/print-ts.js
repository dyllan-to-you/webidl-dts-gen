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
exports.printTs = printTs;
exports.printEmscriptenModule = printEmscriptenModule;
var ts = require("typescript");
function printTs(nodes) {
    var file = ts.createSourceFile("index.d.ts", '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    var printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return nodes.map(function (it) { return printer.printNode(ts.EmitHint.Unspecified, it, file); }).join('\n');
}
function printEmscriptenModule(moduleName, nodes, defaultExport) {
    var result = [];
    if (defaultExport) {
        // adds default export
        //    export default Module;
        result.push(ts.factory.createExportAssignment(
        /* modifiers      */ [ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword)], 
        /* isExportEquals */ false, 
        /* expression     */ ts.factory.createIdentifier(moduleName)));
    }
    // adds module function
    //    declare function Module<T>(target?: T): Promise<T & typeof Module>;
    result.push(ts.factory.createFunctionDeclaration(
    /* modifiers      */ [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], 
    /* asteriskToken  */ undefined, 
    /* name           */ moduleName, 
    /* typeParameters */ [ts.factory.createTypeParameterDeclaration([], 'T')], 
    /* parameters     */ [
        ts.factory.createParameterDeclaration([], undefined, 'target', ts.factory.createToken(ts.SyntaxKind.QuestionToken), ts.factory.createTypeReferenceNode('T', [])),
    ], 
    /* type           */ ts.factory.createTypeReferenceNode('Promise', [
        ts.factory.createIntersectionTypeNode([
            ts.factory.createTypeReferenceNode('T', []),
            ts.factory.createTypeQueryNode(ts.factory.createIdentifier(moduleName)),
        ]),
    ]), 
    /* body           */ undefined));
    // adds module declaration with all types
    //    export declare module Module {
    //      ...
    //    }
    result.push(ts.factory.createModuleDeclaration(
    /* modifiers  */ [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], 
    /* name       */ ts.factory.createIdentifier(moduleName), 
    /* body       */ ts.factory.createModuleBlock(__spreadArray(__spreadArray([], emscriptenAdditions(), true), nodes, true))));
    return printTs(result);
}
function emscriptenAdditions() {
    var result = [];
    // add emscripten function declarations
    var emscriptenFunctionDeclarations = [
        'function destroy(obj: any): void',
        'function _malloc(size: number): number',
        'function _free(ptr: number): void',
        'function wrapPointer<C extends new (...args: any) => any>(ptr: number, Class: C): InstanceType<C>',
        'function getPointer(obj: unknown): number',
        'function castObject<C extends new (...args: any) => any>(object: unknown, Class: C): InstanceType<C>',
        'function compare(object1: unknown, object2: unknown): boolean',
    ].map(function (sourceText) {
        var sourceFile = ts.createSourceFile('', sourceText, ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS);
        return sourceFile.statements[0];
    });
    result.push.apply(result, emscriptenFunctionDeclarations);
    // adds HEAP* properties
    var heaps = [
        ['HEAP8', Int8Array.name],
        ['HEAP16', Int16Array.name],
        ['HEAP32', Int32Array.name],
        ['HEAPU8', Uint8Array.name],
        ['HEAPU16', Uint16Array.name],
        ['HEAPU32', Uint32Array.name],
        ['HEAPF32', Float32Array.name],
        ['HEAPF64', Float64Array.name],
    ];
    for (var _i = 0, heaps_1 = heaps; _i < heaps_1.length; _i++) {
        var _a = heaps_1[_i], name_1 = _a[0], type = _a[1];
        result.push(ts.factory.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
            ts.factory.createVariableDeclaration(ts.factory.createIdentifier(name_1), undefined, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(type), undefined)),
        ], ts.NodeFlags.Const)));
    }
    return result;
}
