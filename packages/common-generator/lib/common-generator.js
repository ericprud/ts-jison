"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTemplate = void 0;
const Fs = __importStar(require("fs"));
const JsYaml = __importStar(require("js-yaml"));
class FileTemplate extends Map {
    constructor(from, format) {
        super();
        this.from = from;
        const templateText = Fs.readFileSync(from, "utf8");
        const asObject = (format === FileTemplate.Format.YAML
            ? JsYaml.load(templateText)
            : JSON.parse(templateText));
        Object.keys(asObject).forEach(key => this.set(key, asObject[key]));
    }
    substitute(key, mappings) {
        if (!this.has(key))
            /* instanbul ignore next */
            throw new Error(`key ${key} not found in ${this.from}`);
        const raw = this.get(key);
        return mappings.reduce((ret, m) => ret.replace(RegExp(`{{${m.token}}}`, 'g'), m.value), raw);
    }
}
exports.FileTemplate = FileTemplate;
(function (FileTemplate) {
    let Format;
    (function (Format) {
        Format[Format["YAML"] = 0] = "YAML";
        Format[Format["JSON"] = 1] = "JSON";
    })(Format = FileTemplate.Format || (FileTemplate.Format = {}));
})(FileTemplate = exports.FileTemplate || (exports.FileTemplate = {}));
//# sourceMappingURL=common-generator.js.map