"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixes = void 0;
exports.fixes = {
    inheritance: function (idlString) {
        // need fix for error:
        //
        //      WebIDLParseError: Syntax error at line 49, since `interface btVector4`:
        //      btVector4 implements btVector3;
        //      ^ Unrecognised tokens
        //
        // current solution:
        // find everything that match
        //
        //      LEFT implements RIGHT;
        //
        // ignore commented out lines
        //
        // and comment them out
        // then replace all occurence
        //
        //      interface LEFT {
        //
        // with
        //
        //      interface LEFT: RIGHT {
        //
        // Handle inheritance
        var inheritance = [];
        // remove comments
        var withoutComments = idlString.replace(/(\/\*[\s\S]*?\*\/|\/\/.*?$)/gm, '');
        var lines = withoutComments.split('\n');
        // find lines with inheritance statements, comment them out and store them
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var match = /([a-zA-Z0-9_]+) implements ([a-zA-Z0-9_]+);/gi.exec(line);
            if (!match) {
                continue;
            }
            var left = match[1];
            var right = match[2];
            inheritance.push({ left: left, right: right });
            lines[i] = "// ".concat(line);
        }
        idlString = lines.join('\n');
        // correct inheritance syntax
        inheritance.forEach(function (_a) {
            var left = _a.left, right = _a.right;
            idlString = idlString.replace(new RegExp("interface ".concat(left, " {")), "interface ".concat(left, ": ").concat(right, " {"));
        });
        return idlString;
    },
    array: function (idlString) {
        // need fix for error:
        //
        //      WebIDLParseError: Syntax error at line 102, since `interface btTransform`:
        //        void setFromOpenGLMatrix(float[] m)
        //                                 ^ Unterminated operation
        //
        // current solution: use sequence<float> type
        return idlString
            .replace(/attribute unsigned (\w+)\[\]/gi, function (_, group) {
            return "attribute FrozenArray<unsigned ".concat(group, ">");
        })
            .replace(/attribute (\w+)\[\]/gi, function (_, group) {
            return "attribute FrozenArray<".concat(group, ">");
        })
            .replace(/unsigned (\w+)\[\]/gi, function (_, group) {
            return "FrozenArray<unsigned ".concat(group, ">");
        })
            .replace(/(\w+)\[\]/gi, function (_, group) {
            return "FrozenArray<".concat(group, ">");
        });
    },
};
