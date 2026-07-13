import sys
from pathlib import Path

# Add project root (which contains the 'shared' package) to Python path
project_root = Path(__file__).resolve().parent.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
