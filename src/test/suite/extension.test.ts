import * as assert from "assert";
import * as sinon from "sinon";
import * as tsSinon from "ts-sinon";
import * as chai from "chai";
import * as vscode from "vscode";
import * as pykisoRunner from "../../pykisoRunner";
import * as fs from "fs";
import * as child_process from "child_process";
import { EXTENSION_ROOT_DIR } from "../../constants";
import { PYKISO_YAML } from "./testConstants";

const expect = chai.expect;
const sinonChai = require("sinon-chai");

chai.use(sinonChai);

const equals = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Run pykiso", () => {
    let stubTerminal = tsSinon.stubInterface<vscode.Terminal>();
    let stubCreateTerminal = sinon
      .stub(vscode.window, "createTerminal")
      .returns(stubTerminal);

    let pykiso = new pykisoRunner.PykisoRunner();

    let stubUpdatePythonInterpreter = sinon.stub(
      pykiso,
      "updatePythonInterpreter"
    );
    pykiso.pythonInterpreterPath = "C:/Python";

    pykiso.run(false, "/dummy.yaml");

    assert(stubUpdatePythonInterpreter.calledOnce);
    assert(stubCreateTerminal.calledOnce);
    expect(stubCreateTerminal).to.be.called.calledWith("Pykiso #1 dummy.yaml");
    expect(stubTerminal.sendText).to.be.called.calledWith(
      'C:/Python -m pykiso -c "/dummy.yaml"'
    );

    stubCreateTerminal.restore();
    stubUpdatePythonInterpreter.restore();
  });

  test("Run pykiso debug", () => {
    let stubTerminal = tsSinon.stubInterface<vscode.Terminal>();
    let stubCreateTerminal = sinon
      .stub(vscode.window, "createTerminal")
      .returns(stubTerminal);

    let pykiso = new pykisoRunner.PykisoRunner();

    let stubUpdatePythonInterpreter = sinon.stub(
      pykiso,
      "updatePythonInterpreter"
    );
    pykiso.pythonInterpreterPath = "C:/Python";

    pykiso.run(true, "/dummy.yaml");
    pykiso.run(true, "somePath/dummy.yaml");

    assert(stubUpdatePythonInterpreter.calledTwice);
    assert(stubCreateTerminal.calledTwice);
    expect(stubCreateTerminal)
      .to.be.called.calledWith("Pykiso DEBUG #1 dummy.yaml")
      .calledWith("Pykiso DEBUG #2 dummy.yaml");

    expect(stubTerminal.sendText).to.be.called.calledWith(
      'C:/Python -m pykiso -c "/dummy.yaml" --log-level DEBUG'
    );
    stubCreateTerminal.restore();
  });

  test("create auxiliary type hint", () => {
    let pykiso = new pykisoRunner.PykisoRunner();
    let auxInfos = new pykisoRunner.AuxImport();

    auxInfos.auxName = "testAux";
    auxInfos.importPath = "test/path";
    auxInfos.userAuxNames = ["aux1", "aux2", "aux3"];

    let typeHint = pykiso.createAuxTypeHint(auxInfos);

    assert(
      typeHint ===
        `from test/path import testAux\naux1: testAux\naux2: testAux\naux3: testAux\n`
    );
  });

  test("get auxiliary import path", () => {
    let pykiso = new pykisoRunner.PykisoRunner();

    let stubReadFileSync = sinon
      .stub(fs, "readFileSync")
      .returns(`from ebplugins.embaux.emb_auxiliary import EmbAuxiliary`);

    let auxPath = pykiso.getAuxImportPath("someFile", "EmbAuxiliary");

    expect(stubReadFileSync).calledWith("someFile", "utf-8");
    assert(auxPath === "ebplugins.embaux.emb_auxiliary");

    auxPath = pykiso.getAuxImportPath("someFile", "UnicornAuxiliary");
    assert(auxPath === "");
    stubReadFileSync.restore();
  });

  test("find pykiso modules", () => {
    let pykiso = new pykisoRunner.PykisoRunner();

    let pykisoImports = `from pykiso.auxiliaries import (
      aux1,
      aux2,

      aux3,
      )`;

    let stubReadFileSync = sinon
      .stub(fs, "readFileSync")
      .returns(pykisoImports);

    let pykisoModules = pykiso.findPykisoModules("someFile");

    assert(equals(pykisoModules, ["aux1", "aux2", "aux3"]));
    stubReadFileSync.restore();
  });

  test("get pykiso installation path", () => {
    let pykiso = new pykisoRunner.PykisoRunner();
    let stubUpdatePythonInterpreter = sinon.stub(
      pykiso,
      "updatePythonInterpreter"
    );
    let stubErrorMessage = sinon.stub(vscode.window, "showErrorMessage");

    let returnValue = {} as child_process.SpawnSyncReturns<string>;

    returnValue.status = 0;
    returnValue.stdout = "Pykiso/module/Path";
    pykiso.pythonInterpreterPath = "python";

    let stubSpawnSync = sinon
      .stub(child_process, "spawnSync")
      .returns(returnValue);

    let installPath = pykiso.getPykisoInstallationPath();

    assert(installPath === returnValue.stdout);
    expect(stubSpawnSync).calledWith("python", [
      EXTENSION_ROOT_DIR.replace(/\\/g, "/") + "/pythonFiles/find_pykiso.py",
    ]);

    returnValue.status = 1;
    stubSpawnSync.returns(returnValue);
    installPath = pykiso.getPykisoInstallationPath();
    assert(!installPath);

    returnValue.status = 2;
    returnValue.stdout = "SomeError";
    stubSpawnSync.returns(returnValue);
    installPath = pykiso.getPykisoInstallationPath();
    assert(!installPath);

    assert(stubErrorMessage.calledTwice);
    stubUpdatePythonInterpreter.restore();
    stubSpawnSync.restore();
    stubErrorMessage.restore();
  });

  test("create pykiso type hints", () => {
    let pykiso = new pykisoRunner.PykisoRunner();

    let stubReadFileSync = sinon.stub(fs, "readFileSync").returns(PYKISO_YAML);
    let stubFindPykisoModules = sinon
      .stub(pykiso, "findPykisoModules")
      .returns(["aux_1", "aux_2", "aux_3"]);

    let auxTypeHint = pykiso.createPykisoTypeHints("test1.py", "dummy.yaml");

    assert(
      equals(auxTypeHint, [
        "from ebplugins.embaux.emb_auxiliary import EmbAuxiliary\n" +
          "aux_1: EmbAuxiliary\naux_2: EmbAuxiliary\n" +
          "aux_3: EmbAuxiliary\n",
      ])
    );

    stubReadFileSync.calledWith("dummy.yaml");
    assert(stubFindPykisoModules.calledWith("test1.py"));

    stubFindPykisoModules.returns([]);
    auxTypeHint = pykiso.createPykisoTypeHints("test1.py", "dummy.yaml");

    assert(auxTypeHint.length === 0);

    stubReadFileSync.restore();
    stubFindPykisoModules.restore();
  });
});
