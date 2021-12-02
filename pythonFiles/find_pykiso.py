"""
Print pykiso installation path when available
"""
import pathlib
import sys
try:
    import pykiso

    print(pathlib.Path(pykiso.__file__).parent.absolute().as_posix())
    sys.exit(0)
except (ModuleNotFoundError, TypeError) as error:
    print(error, file=sys.stderr)
    sys.exit(1)
except Exception as error:
    print(error, file=sys.stderr)
    sys.exit(2)

