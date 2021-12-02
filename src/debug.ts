import * as vscode from "vscode";
import path = require("path");

var DEBUG_CONFIG_NAME = "Pykiso: Debug";

/**
 * Run pykiso config in debug mode.
 * @param pykisoConfigPath path to pykiso config
 */
export function debugYaml(pykisoConfigPath: vscode.Uri) {
  var workspaceFolder: vscode.WorkspaceFolder | undefined;

  workspaceFolder = vscode.workspace.getWorkspaceFolder(pykisoConfigPath);

  if (!workspaceFolder) {
    vscode.window.showErrorMessage("Could not retrieve workspace folder");
    return;
  }

  var pykisoDebugConfig: vscode.DebugConfiguration = {
    name: DEBUG_CONFIG_NAME,
    type: "python",
    request: "launch",
    module: "pykiso",
    justMyCode: false,
    args: ["-c", pykisoConfigPath.fsPath],
  };

  vscode.debug.startDebugging(workspaceFolder, pykisoDebugConfig);
}
