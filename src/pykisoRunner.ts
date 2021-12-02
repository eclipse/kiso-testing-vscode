import * as vscode from "vscode";
import { readFileSync } from "fs";
import * as yaml from "js-yaml";
import { EXTENSION_ROOT_DIR } from "./constants";
import * as path from "path";
import { execSync, exec, spawnSync } from "child_process";

export class AuxImport {
  importPath: string = "";
  auxName: string = "";
  userAuxNames: Array<string> = new Array();
}
export class PykisoRunner {
  nextTermID: number = 1;
  pythonInterpreterPath: string = "";
  pykisoModulePath: string = "";
  /**
   * creates a new terminal and run pykiso
   * @param debug when enabled set pykiso log level to debug
   * @param filePath path to pykiso yaml file
   */
  run(debug: boolean, filePath: string) {
    var activeFile = filePath!.split("\\").pop()!.split("/").pop();
    this.updatePythonInterpreter();

    if (!debug) {
      var terminal = vscode.window.createTerminal(
        `Pykiso #${this.nextTermID++} ${activeFile}`
      );
      terminal.sendText(
        `${this.pythonInterpreterPath} -m pykiso -c \"${filePath}\"`
      );
    } else {
      var terminal = vscode.window.createTerminal(
        `Pykiso DEBUG #${this.nextTermID++} ${activeFile}`
      );
      terminal.sendText(
        `${this.pythonInterpreterPath} -m pykiso -c \"${filePath}\" --log-level DEBUG`
      );
    }

    terminal.show(true); // true don't jump into terminal
  }

  /**
   * Create python type hint for an auxiliary
   * @param importInfo auxiliary import information
   * @returns python type hint for an auxiliary
   */
  createAuxTypeHint(importInfo: AuxImport): string {
    var importString: string = "";
    var head: string;

    head = `from ${importInfo.importPath} import ${importInfo.auxName}\n`;

    importInfo.userAuxNames.forEach((usrAuxName) => {
      importString += `${usrAuxName}: ${importInfo.auxName}\n`;
    });

    return head + importString;
  }

  /**
   * Get pykiso auxiliary import path from file
   * @param extLib path to external library
   * @param module module for external library
   * @returns pykiso module import path when found else returns empty string.
   */
  getAuxImportPath(extLib: string, module: string): string {
    var match: RegExpExecArray | null;

    const extLibData = readFileSync(extLib, "utf-8");

    var regexp: RegExp = new RegExp(
      `^(?:\s+)?from (.*) import ` + `${module}`,
      "gm"
    );
    match = regexp.exec(extLibData);
    if (match && match[1]) {
      return match[1];
    }
    return "";
  }

  /**
   * Create type hints from pykiso test file
   * @param pykisoFile path to pykiso test script
   * @param yamlConfigFile path to pykiso yaml config
   * @param excludes list auxiliaries to ignore
   * @returns Type hints for each auxiliary module
   */
  createPykisoTypeHints(
    pykisoFile: string,
    yamlConfigFile: string,
    excludes: string[] = new Array<string>()
  ): Array<string> {
    const yamlFile = readFileSync(yamlConfigFile, "utf-8");
    const parsedYaml: any = yaml.load(yamlFile);

    var auxType: string;
    let auxModules = new Map<string, AuxImport>();
    let pyTypeHints = new Array<string>();

    this.findPykisoModules(pykisoFile).forEach((module) => {
      try {
        auxType = parsedYaml.auxiliaries[module].type;
      } catch (TypeError) {
        return;
      }
      let importPath = auxType.split(":")[0];
      let name: string = auxType.split(":").pop()!;

      if (auxModules.get(name) === undefined) {
        auxModules.set(name, new AuxImport());
      }

      const auxInfos = auxModules.get(name);
      if (!importPath.includes("/")) {
        importPath = importPath.split(":")[0];
        // check if key exist. if not create one

        auxInfos!.auxName = name;
        auxInfos!.importPath = importPath;
        auxInfos!.userAuxNames.push(module);

        auxModules.set(name, auxInfos!);
      } else {
        importPath = this.getAuxImportPath(
          path.join(path.dirname(yamlConfigFile), importPath),
          name
        );

        if (importPath) {
          auxInfos!.auxName = name;
          auxInfos!.importPath = importPath;
          auxInfos!.userAuxNames.push(module);
          auxModules.set(name, auxInfos!);
        } else {
          console.warn(
            `Pykiso-Runner: Could not resolve import path for aux: ${name}`
          );
        }
      }
    });

    // remove excluded elements
    excludes.forEach((excludedAux) => {
      auxModules.delete(excludedAux);
    });

    auxModules.forEach((auxType) => {
      pyTypeHints.push(this.createAuxTypeHint(auxType));
    });

    return pyTypeHints;
  }

  /**
   * Read pykiso test script and return found pykiso auxiliaries
   * @param file path to pykiso test script
   * @return found pykiso modules
   */
  findPykisoModules(file: string): Array<string> {
    var match: RegExpExecArray | null;
    var matches: Array<string> = new Array();

    const pykisoFile = readFileSync(file, "utf-8");
    var regexp: RegExp =
      /from pykiso\.auxiliaries import (?:\(([^)]+)\)|(.*$))/gm;
    while ((match = regexp.exec(pykisoFile))) {
      if (match[2]) {
        match[1] = match[2];
      }

      var userAuxiliaries = match[1].replace("\r\n", "").split(",");

      userAuxiliaries.forEach((aux) => {
        if ((aux = aux.trim())) {
          matches.push(aux);
        }
      });
    }

    return matches;
  }

  /**
   * updates the internal interpreter path to the selected interpreter
   * from the ms-python.python plugin
   */
  updatePythonInterpreter() {
    let pythonPlugin: any = vscode.extensions.getExtension("ms-python.python");
    this.pythonInterpreterPath = pythonPlugin.exports.settings
      .getExecutionDetails()
      .execCommand[0].replace(/\\/g, "/");
  }

  /**
   * get pykiso installation path when possible otherwise show error messages
   * @returns Pykiso installation path when found, otherwise empty string.
   */
  getPykisoInstallationPath(): string {
    this.updatePythonInterpreter();

    const findPykisoScript: string = path.join(
      EXTENSION_ROOT_DIR,
      "pythonFiles",
      "find_pykiso.py"
    );

    let result = spawnSync(this.pythonInterpreterPath, [
      findPykisoScript.replace(/\\/g, "/"),
    ]);

    if (result.status === 0) {
      this.pykisoModulePath = result.stdout
        .toString()
        .replace(/(\r\n|\n|\r)/gm, "");
    } else if (result.status === 1) {
      this.pykisoModulePath = "";
      vscode.window.showErrorMessage(
        `Pykiso-Runner could not found pykiso on your system.\n` +
          `Try  \"pip install pykiso\"  to install the latest version`
      );
    } else if (result.status! > 1) {
      this.pykisoModulePath = "";
      vscode.window.showErrorMessage(`Pykiso Error:\n` + result.stderr);
    }
    return this.pykisoModulePath;
  }

  /**
   * Find last line of python import statements
   * @param file python file
   * @returns line number of last import statement
   */
  lastImportLine(file: string): number {
    const pyFileContent: Array<string> = readFileSync(file, "utf-8")
      .toString()
      .replace(/\r\n/g, "\n")
      .split("\n");
    var lineNumber: number = 1;
    var lastImportLine: number = 0;
    var openBracket: Boolean = false;

    for (let line of pyFileContent) {
      if (line.includes("import")) {
        if (line.includes("(")) {
          openBracket = true;
        }
        lastImportLine = lineNumber;
      }

      if (line.includes(")") && openBracket) {
        openBracket = false;
        lastImportLine = lineNumber;
      }
      lineNumber++;
    }

    return lastImportLine;
  }
}
