import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class PykisoTestProvider
  implements vscode.TreeDataProvider<PykisoTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    PykisoTreeItem | undefined | void
  > = new vscode.EventEmitter<PykisoTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    PykisoTreeItem | undefined | void
  > = this._onDidChangeTreeData.event;

  constructor( ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PykisoTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PykisoTreeItem): Thenable<PykisoTreeItem[]> {

    return Promise.resolve(this.getPykisoTests());
  }

  /**
   * Find pykiso tests. Currently all yaml files found in workspace.
   * @returns list of pykiso configurations
   */
  private async getPykisoTests(): Promise<PykisoTreeItem[]> {
    let workspaceYamlFiles: vscode.Uri[];
    let deps: PykisoTreeItem[] = [];
    // Find all yaml files in workspace
    workspaceYamlFiles = await vscode.workspace.findFiles("**/*.yaml");
    workspaceYamlFiles = workspaceYamlFiles.sort();

    if (!workspaceYamlFiles) {
      vscode.window.showWarningMessage(
        "Pykiso-Runner: Could not find yaml files in your workspace"
      );
      return [];
    }

    //  create tree items
    workspaceYamlFiles.forEach((item) => {
      deps.push(
        new PykisoTreeItem(
          path.basename(item.fsPath),
          item,
          vscode.TreeItemCollapsibleState.None
        )
      );
    });
    return deps;
  }
}

/**
 * Class which provides information in the unittest view.
 */
export class PykisoTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly yamlPath: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);

    this.tooltip = `${this.label}`;
    this.description = path.basename(path.dirname(yamlPath.fsPath));
  }

  iconPath = {
    light: path.join(
      __filename,
      "..",
      "..",
      "resources",
      "light",
      "pykisoLogo.svg"
    ),
    dark: path.join(
      __filename,
      "..",
      "..",
      "resources",
      "dark",
      "pykisoLogo.svg"
    ),
  };

  contextValue = "dependency";
}
