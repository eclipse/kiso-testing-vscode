import path = require("path");
import * as vscode from "vscode";
import { PykisoRunner } from "./pykisoRunner";
import { writeFileSync } from "fs";
import { PykisoTestProvider, PykisoTreeItem } from "./testingTree";
import * as pykisoDebug from "./debug";

// this method is called when extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // The commandId parameter must match the command field in package.json

  var pykiso = new PykisoRunner();
  var showQuickPick = vscode.window.showQuickPick;

  var pythonPlugin: any = vscode.extensions.getExtension("ms-python.python");

  if (pythonPlugin.isActive === false) {
    pythonPlugin.activate().then(
      function () {
        console.log("ms-python Extension activated");
      },
      function () {
        console.log("Extension activation failed");
      }
    );
  }

  let run = vscode.commands.registerCommand(
    "pykiso-runner.run",
    (fileUri: vscode.Uri) => {
      // run selected yaml file with pykiso
      pykiso.run(false, fileUri.fsPath);
    }
  );

  let debug = vscode.commands.registerCommand(
    "pykiso-runner.run_debug",
    (fileUri: vscode.Uri) => {
      // run selected yaml file with pykiso and log level debug
      pykiso.run(true, fileUri.fsPath);
    }
  );

  let test = vscode.commands.registerCommand(
    "pykiso-runner.test",
    async () => {}
  );

  let fixIntellisense = vscode.commands.registerCommand(
    "pykiso-runner.fixIntellisense",
    async () => {
      let workspaceYamlFiles: vscode.Uri[] | string[];
      let userSelectedFile: string | undefined;
      let quickPickContent = new Map<string, string>();
      let activeFile: string | undefined =
        vscode.window.activeTextEditor?.document.fileName;

      // check if pykiso is installed
      const pykisoPath = pykiso.getPykisoInstallationPath();

      if (!pykisoPath) {
        return;
      }

      if (pykiso.findPykisoModules(activeFile!).length === 0) {
        vscode.window.showWarningMessage(
          `Pykiso-Runner: Could not find pykiso modules in ${path.basename(
            activeFile!
          )}`
        );
        return;
      }
      // check if active file is a python script.
      if (!(activeFile && path.extname(activeFile) === ".py")) {
        vscode.window.showErrorMessage(
          "Pykiso-Runner: Command must be invoked on a pykiso test script (*.py)"
        );
        return;
      }
      // Find all yaml files in workspace
      workspaceYamlFiles = await vscode.workspace.findFiles("**/*.yaml");

      workspaceYamlFiles = workspaceYamlFiles.map((uri) => uri.fsPath);

      if (!workspaceYamlFiles) {
        vscode.window.showErrorMessage(
          "Pykiso-Runner: Could not find yaml files in your workspace"
        );
        return;
      }

      //  create quick pick content. Extract yaml file name
      workspaceYamlFiles.forEach((item) => {
        quickPickContent.set(path.basename(item), item);
      });

      userSelectedFile = await showQuickPick([...quickPickContent.keys()]);

      if (userSelectedFile === undefined) {
        // user aborted file selection. Silent exit.
        return;
      }

      let newTypeHints: string[] = pykiso.createPykisoTypeHints(
        activeFile,
        quickPickContent.get(userSelectedFile!)!,
        ["ProxyAuxiliary"]
      );

      writeFileSync(
        path.join(pykisoPath, "auxiliaries.py"),
        newTypeHints.join("\n")
      );

      vscode.window.showInformationMessage(
        "Pykiso-Runner: Added autocompletion for pykiso auxiliaries"
      );
    }
  );

  const pykisoTestProvider = new PykisoTestProvider();
  vscode.window.registerTreeDataProvider("pykisoTests", pykisoTestProvider);

  vscode.commands.registerCommand("pykisoTests.refreshEntry", () =>
    pykisoTestProvider.refresh()
  );

  vscode.commands.registerCommand(
    "pykisoTests.editEntry",
    (node: PykisoTreeItem) => {
      vscode.workspace
        .openTextDocument(node.yamlPath)
        .then((doc: vscode.TextDocument) => {
          vscode.window.showTextDocument(doc, 1, false);
        });
    }
  );

  vscode.commands.registerCommand(
    "pykisoTests.play",
    (node: PykisoTreeItem) => {
      pykiso.run(false, node.yamlPath.fsPath);
    }
  );

  vscode.commands.registerCommand(
    "pykisoTests.debug",
    (node: PykisoTreeItem) => {
      pykisoDebug.debugYaml(node.yamlPath);
    }
  );

  vscode.commands.registerCommand(
    "pykiso-runner.debug",
    (fileUri: vscode.Uri) => {
      pykisoDebug.debugYaml(fileUri);
    }
  );

  context.subscriptions.push(fixIntellisense);
  context.subscriptions.push(run);
  context.subscriptions.push(debug);
  context.subscriptions.push(test);
}

// this method is called when extension is deactivated
export function deactivate() {}
