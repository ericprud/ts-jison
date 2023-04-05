import * as Fs from 'fs';
import * as JsYaml from 'js-yaml';

export class FileTemplate extends Map<string, string> {
  from: string;

  constructor(from: string, format: FileTemplate.Format) {
    super();
    this.from = from;
    const templateText = Fs.readFileSync(from, "utf8")
    const asObject = (format === FileTemplate.Format.YAML
      ? JsYaml.load(templateText)
      : JSON.parse(templateText)) as { [key: string]: string };
    Object.keys(asObject).forEach(key => this.set(key, asObject[key]));
  }

  substitute(key: string, mappings: {token: string, value: string}[]): string {
    if (!this.has(key))
      throw new Error(`key ${key} not found in ${this.from}`)
    const raw = this.get(key)!;
    return mappings.reduce(
      (ret, m) => ret.replace(
        RegExp(`{{${m.token}}}`, 'g'),
        () => m.value // avoids susbtition of replacement pattern, e.g. $$, c.f.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement
      ),
      raw
    );
  }
}

export namespace FileTemplate {
  export enum Format {
    YAML,
    JSON
  }
}
